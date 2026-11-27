import { buildCorsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import {
  cleanDocumentTitle,
  driveApiFetch,
  extractExtension,
  formatSizeLabel,
  getActiveDriveSession,
  GOOGLE_FOLDER_MIME,
  inferDocumentType,
  isSupportedDriveFile,
  slugifyFolder,
  type DriveFileRecord,
} from '../_shared/googleDrive.ts';
import { createServiceClient, requireAdminCaller } from '../_shared/supabaseAdmin.ts';

interface DriveChangeItem {
  removed?: boolean;
  fileId?: string;
  file?: DriveFileRecord;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Método no permitido.' }, 405);
  }

  const adminClient = createServiceClient();
  let connectionId: string | null = null;

  try {
    const admin = await requireAdminCaller(req, adminClient);
    const session = await getActiveDriveSession(adminClient);
    connectionId = session.connectionId;

    const { data: syncState } = await adminClient
      .from('drive_sync_state')
      .select('*')
      .eq('connection_id', connectionId)
      .maybeSingle();

    await adminClient.from('drive_sync_state').upsert(
      {
        connection_id: connectionId,
        status: 'running',
        last_sync_at: new Date().toISOString(),
        last_error: null,
      },
      { onConflict: 'connection_id' }
    );

    // Obtener startPageToken si aún no existe
    let currentPageToken: string | null = syncState?.start_page_token ?? null;
    if (!currentPageToken) {
      const startRes = await driveApiFetch(
        session.accessToken,
        'https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true'
      );
      if (!startRes.ok) {
        throw new Error(`No se pudo inicializar Changes API (${startRes.status}).`);
      }
      const startJson = await startRes.json();
      currentPageToken = String(startJson.startPageToken);

      await adminClient
        .from('drive_sync_state')
        .update({
          start_page_token: currentPageToken,
          status: 'success',
          last_successful_sync_at: new Date().toISOString(),
          files_added: 0,
          files_updated: 0,
          files_removed: 0,
          last_error: null,
        })
        .eq('connection_id', connectionId);

      return jsonResponse(req, {
        initialized: true,
        message: 'Token inicial de cambios registrado. Las próximas sincronizaciones aplicarán cambios incrementales.',
        added: 0,
        updated: 0,
        removed: 0,
        errors: [],
      });
    }

    // Mapa de carpetas conocidas en Supabase (drive_folder_id -> metadata)
    const { data: knownFolders } = await adminClient
      .from('folders')
      .select('id, drive_folder_id, category_id, subcategory_id')
      .not('drive_folder_id', 'is', null);

    const folderByDriveId = new Map<
      string,
      { id: string; category_id: string | null; subcategory_id: string | null }
    >();
    for (const f of knownFolders ?? []) {
      if (f.drive_folder_id) {
        folderByDriveId.set(String(f.drive_folder_id), {
          id: String(f.id),
          category_id: f.category_id ? String(f.category_id) : null,
          subcategory_id: f.subcategory_id ? String(f.subcategory_id) : null,
        });
      }
    }

    // Mapa de documentos ya rastreados por drive_file_id
    const { data: knownDocs } = await adminClient
      .from('documents')
      .select('id, drive_file_id')
      .not('drive_file_id', 'is', null);

    const docByDriveId = new Map<string, string>();
    for (const d of knownDocs ?? []) {
      if (d.drive_file_id) {
        docByDriveId.set(String(d.drive_file_id), String(d.id));
      }
    }

    let added = 0;
    let updated = 0;
    let removed = 0;
    const recentErrors: Array<{ at: string; fileId?: string; name?: string; message: string }> = [];

    let pageToken: string | undefined = currentPageToken;
    let newStartPageToken: string | null = null;
    let tokenExpiredRecovery = false;

    while (pageToken) {
      const params = new URLSearchParams({
        pageToken,
        includeRemoved: 'true',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        pageSize: '200',
        fields:
          'nextPageToken,newStartPageToken,changes(removed,fileId,file(id,name,mimeType,size,parents,webViewLink,modifiedTime,md5Checksum,trashed,description))',
      });

      const res = await driveApiFetch(
        session.accessToken,
        `https://www.googleapis.com/drive/v3/changes?${params.toString()}`
      );

      if (res.status === 400 || res.status === 410) {
        // Token de cambios expirado o inválido -> renovar startPageToken para recuperación limpia
        const freshRes = await driveApiFetch(
          session.accessToken,
          'https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true'
        );
        if (freshRes.ok) {
          const freshJson = await freshRes.json();
          newStartPageToken = String(freshJson.startPageToken);
          tokenExpiredRecovery = true;
          break;
        }
        throw new Error('El token de sincronización expiró y no pudo renovarse automáticamente.');
      }

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Error consultando Google Drive Changes API (${res.status}): ${errBody}`);
      }

      const payload = (await res.json()) as {
        nextPageToken?: string;
        newStartPageToken?: string;
        changes?: DriveChangeItem[];
      };

      for (const change of payload.changes ?? []) {
        const fileId = change.fileId || change.file?.id;
        if (!fileId) continue;

        try {
          const isRemovedOrTrashed = Boolean(change.removed || change.file?.trashed);

          if (isRemovedOrTrashed) {
            if (docByDriveId.has(fileId)) {
              await adminClient
                .from('documents')
                .update({
                  sync_status: 'deleted',
                  last_synced_at: new Date().toISOString(),
                })
                .eq('drive_file_id', fileId);
              removed += 1;
            }
            continue;
          }

          const file = change.file;
          if (!file) continue;

          const parentDriveId = file.parents?.[0] ?? null;
          const parentFolder = parentDriveId ? folderByDriveId.get(parentDriveId) : undefined;

          // Subcarpeta nueva o renombrada dentro de una carpeta rastreada
          if (file.mimeType === GOOGLE_FOLDER_MIME) {
            if (parentFolder || folderByDriveId.has(file.id)) {
              const existingFolder = folderByDriveId.get(file.id);
              const { data: upsertedFolder } = await adminClient
                .from('folders')
                .upsert(
                  {
                    name: file.name,
                    slug: slugifyFolder(file.name, file.id),
                    category_id: parentFolder?.category_id ?? existingFolder?.category_id ?? null,
                    subcategory_id:
                      parentFolder?.subcategory_id ?? existingFolder?.subcategory_id ?? null,
                    parent_id: parentFolder?.id ?? null,
                    drive_folder_id: file.id,
                    drive_parent_id: parentDriveId,
                    drive_web_view_link: file.webViewLink ?? null,
                  },
                  { onConflict: 'drive_folder_id' }
                )
                .select('id, category_id, subcategory_id')
                .single();

              if (upsertedFolder) {
                folderByDriveId.set(file.id, {
                  id: String(upsertedFolder.id),
                  category_id: upsertedFolder.category_id ? String(upsertedFolder.category_id) : null,
                  subcategory_id: upsertedFolder.subcategory_id
                    ? String(upsertedFolder.subcategory_id)
                    : null,
                });
              }
            }
            continue;
          }

          if (!isSupportedDriveFile(file.mimeType, file.name)) continue;

          const ext = extractExtension(file.name, file.mimeType);
          const sizeBytes = file.size ? Number(file.size) : null;
          const nowIso = new Date().toISOString();

          if (docByDriveId.has(file.id)) {
            // Actualizar únicamente campos técnicos de Drive sin sobrescribir curación editorial
            const updatePayload: Record<string, unknown> = {
              name: file.name,
              drive_folder_id: parentDriveId,
              drive_web_view_link: file.webViewLink ?? null,
              drive_modified_time: file.modifiedTime ?? null,
              drive_md5_checksum: file.md5Checksum ?? null,
              mime_type: file.mimeType,
              file_extension: ext,
              file_size_bytes: Number.isFinite(sizeBytes) ? sizeBytes : null,
              size_label: formatSizeLabel(Number.isFinite(sizeBytes) ? sizeBytes : null, ext),
              sync_status: 'synced',
              last_synced_at: nowIso,
            };
            if (parentFolder) {
              updatePayload.folder_id = parentFolder.id;
            }

            await adminClient
              .from('documents')
              .update(updatePayload)
              .eq('drive_file_id', file.id);
            updated += 1;
          } else if (parentFolder) {
            // Archivo nuevo detectado dentro de una carpeta sincronizada
            const title = cleanDocumentTitle(file.name);
            const { data: insertedDoc, error: insertErr } = await adminClient
              .from('documents')
              .upsert(
                {
                  name: file.name,
                  title,
                  author: 'Autor por catalogar',
                  category_id: parentFolder.category_id,
                  subcategory_id: parentFolder.subcategory_id,
                  folder_id: parentFolder.id,
                  description: file.description ?? '',
                  document_type: inferDocumentType(title),
                  source_type: 'google_drive',
                  drive_file_id: file.id,
                  drive_folder_id: parentDriveId,
                  drive_web_view_link: file.webViewLink ?? null,
                  drive_modified_time: file.modifiedTime ?? null,
                  drive_md5_checksum: file.md5Checksum ?? null,
                  mime_type: file.mimeType,
                  file_extension: ext,
                  file_size_bytes: Number.isFinite(sizeBytes) ? sizeBytes : null,
                  size_label: formatSizeLabel(Number.isFinite(sizeBytes) ? sizeBytes : null, ext),
                  visibility: 'public',
                  published: true,
                  allow_preview: true,
                  allow_download: true,
                  sync_status: 'synced',
                  last_synced_at: nowIso,
                  created_by: admin.userId,
                },
                { onConflict: 'drive_file_id' }
              )
              .select('id')
              .single();

            if (insertErr) throw new Error(insertErr.message);
            if (insertedDoc?.id) {
              docByDriveId.set(file.id, String(insertedDoc.id));
            }
            added += 1;
          }
        } catch (changeErr) {
          recentErrors.push({
            at: new Date().toISOString(),
            fileId,
            name: change.file?.name,
            message: changeErr instanceof Error ? changeErr.message : 'Error procesando cambio',
          });
        }
      }

      if (payload.newStartPageToken) {
        newStartPageToken = payload.newStartPageToken;
      }
      pageToken = payload.nextPageToken;
    }

    const finalStatus = recentErrors.length > 0 ? 'partial_error' : 'success';
    const nowIso = new Date().toISOString();

    await adminClient
      .from('drive_sync_state')
      .update({
        start_page_token: newStartPageToken ?? currentPageToken,
        status: finalStatus,
        last_sync_at: nowIso,
        last_successful_sync_at: nowIso,
        files_added: added,
        files_updated: updated,
        files_removed: removed,
        last_error: tokenExpiredRecovery
          ? 'El token de cambios anterior había expirado y fue reinicializado automáticamente.'
          : recentErrors[0]?.message ?? null,
        recent_errors: recentErrors.slice(0, 25),
      })
      .eq('connection_id', connectionId);

    return jsonResponse(req, {
      status: finalStatus,
      tokenExpiredRecovery,
      added,
      updated,
      removed,
      errors: recentErrors,
    });
  } catch (err) {
    if (connectionId) {
      await adminClient
        .from('drive_sync_state')
        .update({
          status: 'error',
          last_error: err instanceof Error ? err.message : 'Error de sincronización',
        })
        .eq('connection_id', connectionId);
    }

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
      { error: err instanceof Error ? err.message : 'Error al sincronizar con Google Drive.' },
      500
    );
  }
});
