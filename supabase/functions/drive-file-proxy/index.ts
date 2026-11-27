import { buildCorsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { driveApiFetch, getActiveDriveSession } from '../_shared/googleDrive.ts';
import { createServiceClient, resolveCaller } from '../_shared/supabaseAdmin.ts';

const GOOGLE_EXPORT_MAP: Record<string, { mimeType: string; ext: string }> = {
  'application/vnd.google-apps.document': { mimeType: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.presentation': { mimeType: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.spreadsheet': { mimeType: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.drawing': { mimeType: 'application/pdf', ext: 'pdf' },
};

const GOOGLE_SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

interface GoogleErrorDetails {
  reason: string;
  message: string;
}

async function parseGoogleError(res: Response): Promise<GoogleErrorDetails> {
  try {
    const text = await res.clone().text();
    const parsed = JSON.parse(text) as {
      error?: {
        message?: string;
        errors?: Array<{ reason?: string; message?: string }>;
      };
    };
    const first = parsed?.error?.errors?.[0];
    return {
      reason: String(first?.reason ?? ''),
      message: String(first?.message ?? parsed?.error?.message ?? ''),
    };
  } catch {
    return { reason: '', message: '' };
  }
}

function buildFriendlyDrive403Message(details: GoogleErrorDetails): string {
  const reason = details.reason.toLowerCase();
  const msg = details.message.toLowerCase();

  if (reason === 'cannotdownloadfile' || msg.includes('cannot download')) {
    return 'El propietario del archivo en Google Drive deshabilitó la descarga o copia. Habilita la descarga en los permisos del archivo en Google Drive o ábrelo directamente en Drive.';
  }
  if (
    reason === 'insufficientpermissions' ||
    reason === 'insufficientfilepermissions' ||
    reason === 'forbidden' ||
    msg.includes('insufficient')
  ) {
    return 'La cuenta de Google Drive conectada no tiene permisos para leer este archivo. Verifica que el archivo esté compartido con la cuenta conectada o reconecta Google Drive en Administración → Google Drive.';
  }
  if (
    reason === 'downloadquotaexceeded' ||
    reason === 'ratelimitexceeded' ||
    reason === 'userratelimitexceeded'
  ) {
    return 'Google Drive alcanzó temporalmente el límite de descargas para este archivo. Intenta nuevamente en unos minutos o ábrelo directamente en Google Drive.';
  }
  if (reason === 'exportsizelimitexceeded') {
    return 'Este documento de Google supera el límite de 10 MB para exportación directa a PDF. Ábrelo directamente desde Google Drive.';
  }
  if (reason === 'accessnotconfigured') {
    return 'La API de Google Drive no está habilitada en el proyecto de Google Cloud configurado.';
  }
  if (details.reason) {
    return `Google Drive rechazó el acceso al archivo (HTTP 403 · ${details.reason}). Verifica los permisos del archivo o reconecta Google Drive.`;
  }
  return 'Google Drive rechazó el acceso al archivo (HTTP 403). Verifica los permisos del archivo o reconecta Google Drive.';
}

function sanitizeFilename(raw: string): string {
  return raw.replace(/[^\w\s.\-()áéíóúÁÉÍÓÚñÑ]/g, '').trim() || 'documento';
}

interface UpstreamFetchTarget {
  fileId: string;
  mimeType: string;
  ext: string;
}

async function fetchDriveContent(
  accessToken: string,
  target: UpstreamFetchTarget,
  rangeHeader: string | null,
  acknowledgeAbuse = false
): Promise<{ res: Response; outMimeType: string; outExt: string }> {
  const googleExport = GOOGLE_EXPORT_MAP[target.mimeType];
  const headers: Record<string, string> = {};

  if (googleExport) {
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(target.fileId)}/export?mimeType=${encodeURIComponent(googleExport.mimeType)}&supportsAllDrives=true`;
    const res = await driveApiFetch(accessToken, url, { headers });
    return { res, outMimeType: googleExport.mimeType, outExt: googleExport.ext };
  }

  const abuseParam = acknowledgeAbuse ? '&acknowledgeAbuse=true' : '';
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(target.fileId)}?alt=media&supportsAllDrives=true${abuseParam}`;
  if (rangeHeader) {
    headers.Range = rangeHeader;
  }
  const res = await driveApiFetch(accessToken, url, { headers });
  return {
    res,
    outMimeType: target.mimeType || 'application/pdf',
    outExt: target.ext || 'pdf',
  };
}

async function fetchLiveDriveMeta(
  accessToken: string,
  fileId: string
): Promise<{
  id: string;
  mimeType?: string;
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
  capabilities?: { canDownload?: boolean };
} | null> {
  const fields = encodeURIComponent(
    'id,mimeType,shortcutDetails(targetId,targetMimeType),capabilities(canDownload)'
  );
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`;
  const res = await driveApiFetch(accessToken, url);
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as {
    id: string;
    mimeType?: string;
    shortcutDetails?: { targetId?: string; targetMimeType?: string };
    capabilities?: { canDownload?: boolean };
  } | null;
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
    const rangeHeader = req.headers.get('range');

    const target: UpstreamFetchTarget = {
      fileId: String(doc.drive_file_id),
      mimeType: String(doc.mime_type || 'application/pdf'),
      ext: String(doc.file_extension || 'pdf'),
    };

    let attempt = await fetchDriveContent(
      driveSession.accessToken,
      target,
      rangeHeader,
      false
    );

    // Recuperación automática ante errores HTTP 403 de Google Drive
    if (attempt.res.status === 403) {
      const errDetails = await parseGoogleError(attempt.res);
      const reason = errDetails.reason.toLowerCase();

      // 1. Archivo marcado por el escáner automático de Drive (muy frecuente en PDFs grandes/escaneados)
      if (reason === 'cannotdownloadabusivefile' || reason === 'abuse') {
        attempt = await fetchDriveContent(
          driveSession.accessToken,
          target,
          rangeHeader,
          true
        );
      } else {
        // 2. Consultar metadatos reales en Drive: podría ser un acceso directo (shortcut) o un archivo nativo de Google Workspace
        const liveMeta = await fetchLiveDriveMeta(driveSession.accessToken, target.fileId);
        if (liveMeta) {
          let resolvedId = target.fileId;
          let resolvedMime = liveMeta.mimeType || target.mimeType;

          if (resolvedMime === GOOGLE_SHORTCUT_MIME && liveMeta.shortcutDetails?.targetId) {
            resolvedId = liveMeta.shortcutDetails.targetId;
            resolvedMime = liveMeta.shortcutDetails.targetMimeType || target.mimeType;
          }

          if (resolvedId !== target.fileId || resolvedMime !== target.mimeType) {
            attempt = await fetchDriveContent(
              driveSession.accessToken,
              { fileId: resolvedId, mimeType: resolvedMime, ext: target.ext },
              rangeHeader,
              true
            );
          } else if (liveMeta.capabilities?.canDownload !== false) {
            // Reintento con acknowledgeAbuse=true por si Drive no devolvió reason explícito
            attempt = await fetchDriveContent(
              driveSession.accessToken,
              target,
              rangeHeader,
              true
            );
          }
        }
      }
    }

    const { res: upstreamRes, outMimeType, outExt } = attempt;

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
      if (upstreamRes.status === 403) {
        const finalErr = await parseGoogleError(upstreamRes);
        return jsonResponse(
          req,
          {
            error: buildFriendlyDrive403Message(finalErr),
            reason: finalErr.reason || 'drive_403',
          },
          403
        );
      }
      return jsonResponse(
        req,
        { error: `No se pudo obtener el archivo desde Google Drive (HTTP ${upstreamRes.status}).` },
        502
      );
    }

    // Registrar descarga autorizada en segundo plano solo en modo download y petición inicial
    if (mode === 'download' && !rangeHeader) {
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
