import { buildCorsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { driveApiFetch, getActiveDriveSession } from '../_shared/googleDrive.ts';
import { createServiceClient, resolveCaller } from '../_shared/supabaseAdmin.ts';

const GOOGLE_EXPORT_MAP: Record<string, { mimeType: string; ext: string }> = {
  'application/vnd.google-apps.document': { mimeType: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.presentation': { mimeType: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.spreadsheet': { mimeType: 'application/pdf', ext: 'pdf' },
};

function sanitizeFilename(raw: string): string {
  return raw.replace(/[^\w\s.\-()áéíóúÁÉÍÓÚñÑ]/g, '').trim() || 'documento';
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'GET') {
    return jsonResponse(req, { error: 'Método no permitido.' }, 405);
  }

  try {
    const url = new URL(req.url);
    const documentId = url.searchParams.get('documentId')?.trim();
    const mode = url.searchParams.get('mode') === 'download' ? 'download' : 'view';

    if (!documentId) {
      return jsonResponse(req, { error: 'Falta el parámetro documentId.' }, 400);
    }

    const adminClient = createServiceClient();
    const caller = await resolveCaller(req, adminClient);

    const { data: doc, error: docErr } = await adminClient
      .from('documents')
      .select(
        'id, name, title, drive_file_id, mime_type, file_extension, visibility, published, allow_preview, allow_download, sync_status'
      )
      .eq('id', documentId)
      .maybeSingle();

    if (docErr || !doc) {
      return jsonResponse(req, { error: 'Documento no encontrado.' }, 404);
    }

    const isAdmin = caller.role === 'admin';

    // Validación estricta de permisos en el backend
    if (!isAdmin) {
      if (!doc.published || doc.sync_status === 'deleted') {
        return jsonResponse(req, { error: 'Este documento no está disponible actualmente.' }, 403);
      }
      if (doc.visibility === 'admin_only') {
        return jsonResponse(req, { error: 'Documento reservado a administración.' }, 403);
      }
      if (doc.visibility === 'registered' && !caller.userId) {
        return jsonResponse(
          req,
          { error: 'Inicia sesión para acceder a este documento.' },
          401
        );
      }
      if (mode === 'download' && !doc.allow_download) {
        return jsonResponse(req, { error: 'La descarga no está habilitada para este documento.' }, 403);
      }
      if (mode === 'view' && !doc.allow_preview) {
        return jsonResponse(req, { error: 'La visualización en línea no está habilitada.' }, 403);
      }
    }

    if (!doc.drive_file_id) {
      return jsonResponse(
        req,
        { error: 'Este documento no está vinculado a un archivo de Google Drive.' },
        400
      );
    }

    const driveSession = await getActiveDriveSession(adminClient);
    const googleExport = GOOGLE_EXPORT_MAP[String(doc.mime_type ?? '')];

    let upstreamUrl: string;
    let outMimeType = String(doc.mime_type || 'application/pdf');
    let outExt = String(doc.file_extension || 'pdf');
    const upstreamHeaders: Record<string, string> = {};

    if (googleExport) {
      upstreamUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.drive_file_id)}/export?mimeType=${encodeURIComponent(googleExport.mimeType)}&supportsAllDrives=true`;
      outMimeType = googleExport.mimeType;
      outExt = googleExport.ext;
    } else {
      upstreamUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.drive_file_id)}?alt=media&supportsAllDrives=true`;
      const rangeHeader = req.headers.get('range');
      if (rangeHeader) {
        upstreamHeaders.Range = rangeHeader;
      }
    }

    const upstreamRes = await driveApiFetch(driveSession.accessToken, upstreamUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      if (upstreamRes.status === 404) {
        await adminClient
          .from('documents')
          .update({ sync_status: 'missing', last_synced_at: new Date().toISOString() })
          .eq('id', doc.id);
        return jsonResponse(
          req,
          { error: 'El archivo ya no se encuentra disponible en Google Drive.' },
          404
        );
      }
      return jsonResponse(
        req,
        { error: `No se pudo obtener el archivo desde Google Drive (HTTP ${upstreamRes.status}).` },
        502
      );
    }

    // Registrar descarga autorizada en segundo plano solo en modo download y petición inicial
    if (mode === 'download' && !req.headers.get('range')) {
      try {
        await adminClient.from('download_events').insert({
          document_id: doc.id,
          user_id: caller.userId,
          channel: 'proxy_download',
        });
        const { data: currentDoc } = await adminClient
          .from('documents')
          .select('downloads_count')
          .eq('id', doc.id)
          .maybeSingle();
        await adminClient
          .from('documents')
          .update({ downloads_count: Number(currentDoc?.downloads_count ?? 0) + 1 })
          .eq('id', doc.id);
      } catch {
        // Evitar bloquear la entrega del archivo si falla telemetría secundaria
      }
    }

    const baseName = sanitizeFilename(doc.title || doc.name || 'documento');
    const fileName = baseName.toLowerCase().endsWith(`.${outExt.toLowerCase()}`)
      ? baseName
      : `${baseName}.${outExt}`;

    const responseHeaders = new Headers(buildCorsHeaders(req));
    responseHeaders.set(
      'Content-Type',
      upstreamRes.headers.get('content-type') || outMimeType
    );
    responseHeaders.set(
      'Content-Disposition',
      `${mode === 'download' ? 'attachment' : 'inline'}; filename="${fileName}"`
    );
    responseHeaders.set('Cache-Control', 'private, max-age=300');

    const passThroughHeaders = ['content-length', 'content-range', 'accept-ranges', 'etag'];
    for (const h of passThroughHeaders) {
      const v = upstreamRes.headers.get(h);
      if (v) responseHeaders.set(h, v);
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return jsonResponse(
      req,
      {
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo entregar el documento desde Google Drive.',
      },
      500
    );
  }
});
