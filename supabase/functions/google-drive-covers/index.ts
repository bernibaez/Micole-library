import { buildCorsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import {
  extractAndStoreDriveCoverDetailed,
  getActiveDriveSession,
  uploadBookCoverBytes,
} from '../_shared/googleDrive.ts';
import { createServiceClient, requireAdminCaller } from '../_shared/supabaseAdmin.ts';

interface ExtractCoversBody {
  action?: 'extract' | 'upload';
  documentIds?: string[];
  overwrite?: boolean;
  limit?: number;
  // For action === 'upload' (client-rendered Page 1 PDF cover fallback)
  documentId?: string;
  imageDataUrl?: string;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function decodeBase64DataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, contentType };
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Método no permitido.' }, 405);
  }

  try {
    const adminClient = createServiceClient();
    await requireAdminCaller(req, adminClient);
    const body = (await req.json().catch(() => ({}))) as ExtractCoversBody;

    // Mode 1: Direct cover upload from client-side PDF.js Page 1 renderer
    if (body.action === 'upload') {
      const docId = body.documentId?.trim();
      const dataUrl = body.imageDataUrl?.trim();
      if (!docId || !dataUrl) {
        return jsonResponse(req, { error: 'Faltan documentId o imageDataUrl.' }, 400);
      }

      const decoded = decodeBase64DataUrl(dataUrl);
      if (!decoded || decoded.bytes.byteLength < 250 || decoded.bytes.byteLength > 4 * 1024 * 1024) {
        return jsonResponse(req, { error: 'Imagen de portada inválida o demasiado grande.' }, 400);
      }

      const uploaded = await uploadBookCoverBytes(
        adminClient,
        `doc/${docId}`,
        decoded.bytes,
        decoded.contentType
      );
      if (!uploaded.coverUrl) {
        return jsonResponse(
          req,
          { error: uploaded.error || 'No se pudo subir la portada a Storage.' },
          500
        );
      }

      const { error: updateErr } = await adminClient
        .from('documents')
        .update({ cover_url: uploaded.coverUrl })
        .eq('id', docId);

      if (updateErr) {
        return jsonResponse(req, { error: updateErr.message }, 500);
      }

      return jsonResponse(req, {
        success: true,
        documentId: docId,
        coverUrl: uploaded.coverUrl,
      });
    }

    // Mode 2: Server-side Drive thumbnail extraction
    const session = await getActiveDriveSession(adminClient);
    const overwrite = Boolean(body.overwrite);
    const maxBatch = Math.min(40, Math.max(1, Number(body.limit ?? 25)));
    const requestedIds = Array.isArray(body.documentIds)
      ? body.documentIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    let query = adminClient
      .from('documents')
      .select('id, title, drive_file_id, cover_url')
      .not('drive_file_id', 'is', null)
      .neq('sync_status', 'deleted')
      .order('added_at', { ascending: false });

    if (requestedIds.length > 0) {
      query = query.in('id', requestedIds);
    } else if (!overwrite) {
      query = query.is('cover_url', null);
    }

    const { data: candidates, error: queryErr } = await query;
    if (queryErr) throw new Error(queryErr.message);

    const eligible = (candidates ?? []).filter((doc) => {
      if (!doc.drive_file_id) return false;
      if (!overwrite && doc.cover_url) return false;
      return true;
    });

    const batchToProcess = eligible.slice(0, maxBatch);
    const remaining = Math.max(0, eligible.length - batchToProcess.length);

    let updated = 0;
    let skipped = 0;
    const skippedIds: string[] = [];
    const reasons: Record<string, number> = {};

    for (const group of chunkArray(batchToProcess, 5)) {
      await Promise.all(
        group.map(async (doc) => {
          const result = await extractAndStoreDriveCoverDetailed(
            adminClient,
            session.accessToken,
            String(doc.drive_file_id)
          );

          if (!result.coverUrl) {
            skipped += 1;
            skippedIds.push(String(doc.id));
            const r = result.reason || 'unknown';
            reasons[r] = (reasons[r] ?? 0) + 1;
            return;
          }

          const { error: updateErr } = await adminClient
            .from('documents')
            .update({ cover_url: result.coverUrl })
            .eq('id', doc.id);

          if (updateErr) {
            skipped += 1;
            skippedIds.push(String(doc.id));
            const r = `db_update:${updateErr.message}`;
            reasons[r] = (reasons[r] ?? 0) + 1;
          } else {
            updated += 1;
          }
        })
      );
    }

    return jsonResponse(req, {
      success: true,
      processed: batchToProcess.length,
      updated,
      skipped,
      skippedIds,
      reasons,
      remaining,
    });
  } catch (err) {
    if (err instanceof Response) {
      return new Response(await err.text(), {
        status: err.status,
        headers: {
          ...buildCorsHeaders(req),
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }
    return jsonResponse(
      req,
      {
        error:
          err instanceof Error
            ? err.message
            : 'No se pudieron extraer las portadas desde Google Drive.',
      },
      500
    );
  }
});
