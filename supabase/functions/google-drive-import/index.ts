import { buildCorsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import {
  cleanDocumentTitle,
  driveApiFetch,
  extractAndStoreDriveCover,
  extractExtension,
  formatSizeLabel,
  getActiveDriveSession,
  GOOGLE_FOLDER_MIME,
  inferDocumentType,
  isSupportedDriveFile,
  pickEditorialCoverColor,
  sanitizeCoverPalette,
  slugifyFolder,
  type DriveFileRecord,
} from '../_shared/googleDrive.ts';
import { createServiceClient, requireAdminCaller } from '../_shared/supabaseAdmin.ts';

interface SelectedPickerItem {
  id: string;
  name?: string;
  mimeType?: string;
}

interface ImportRequestBody {
  items?: SelectedPickerItem[];
  categoryId?: string | null;
  subcategoryId?: string | null;
  targetFolderId?: string | null;
  visibility?: 'public' | 'registered' | 'admin_only';
  published?: boolean;
  allowDownload?: boolean;
  allowPreview?: boolean;
  validityStatus?: 'vigente' | 'derogada' | 'reformada' | 'historica' | 'borrador' | 'no_aplica';
  country?: string;
  subject?: string | null;
  colorMode?: 'varied' | 'single';
  color?: string | null;
  coverColors?: string[];
  extractCovers?: boolean;
}

const FILE_FIELDS =
  'id,name,mimeType,size,parents,webViewLink,modifiedTime,md5Checksum,trashed,description,thumbnailLink,hasThumbnail';

async function fetchDriveFileMeta(
  accessToken: string,
  fileId: string
): Promise<DriveFileRecord> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(FILE_FIELDS)}&supportsAllDrives=true`;
  const res = await driveApiFetch(accessToken, url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`No se pudo consultar el elemento ${fileId} en Google Drive (${res.status}): ${errText}`);
  }
  return (await res.json()) as DriveFileRecord;
}

async function listFolderChildrenPaginated(
  accessToken: string,
  driveFolderId: string
): Promise<DriveFileRecord[]> {
  const all: DriveFileRecord[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${driveFolderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      orderBy: 'folder,name',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    const res = await driveApiFetch(accessToken, url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al listar carpeta ${driveFolderId} (${res.status}): ${errText}`);
    }

    const json = (await res.json()) as {
      nextPageToken?: string;
      files?: DriveFileRecord[];
    };
    if (Array.isArray(json.files)) {
      all.push(...json.files);
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  return all;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Método no permitido.' }, 405);
  }

  try {
    const adminClient = createServiceClient();
    const admin = await requireAdminCaller(req, adminClient);
    const body = (await req.json().catch(() => ({}))) as ImportRequestBody;

    const items = Array.isArray(body.items) ? body.items.filter((i) => i?.id) : [];
    if (items.length === 0) {
      return jsonResponse(req, { error: 'Selecciona al menos un documento o carpeta para importar.' }, 400);
    }

    const session = await getActiveDriveSession(adminClient);
    const categoryId = body.categoryId || null;
    const subcategoryId = body.subcategoryId || null;
    const targetFolderId = body.targetFolderId || null;
    const visibility = body.visibility ?? 'public';
    const published = body.published ?? true;
    const allowDownload = body.allowDownload ?? true;
    const allowPreview = body.allowPreview ?? true;
    const validityStatus = body.validityStatus ?? 'no_aplica';
    const country = body.country?.trim() || 'República Dominicana';
    const subject = body.subject?.trim() || null;
    const activeCoverPalette = sanitizeCoverPalette(body.coverColors, body.color);
    const isSingleColorOverride =
      body.colorMode === 'single' || activeCoverPalette.length === 1;
    const batchColorOffset = Math.floor(Math.random() * activeCoverPalette.length);
    const extractCovers = body.extractCovers !== false;

    let categoryName = 'Otras lecturas';
    if (categoryId) {
      const { data: cat } = await adminClient
        .from('categories')
        .select('name')
        .eq('id', categoryId)
        .maybeSingle();
      if (cat?.name) categoryName = cat.name;
    }

    const report = {
      foldersProcessed: 0,
      documentsImported: 0,
      documentsSkippedUnsupported: 0,
      coversExtracted: 0,
      errors: [] as Array<{ driveId: string; name?: string; message: string }>,
    };

    const pendingDocumentRows: Array<Record<string, unknown>> = [];
    const thumbnailByDriveId = new Map<string, string | null>();
    const trackedRootsToRegister: Array<{
      driveFolderId: string;
      folderId: string;
      categoryId: string | null;
      subcategoryId: string | null;
      name: string;
    }> = [];

    const visitedDriveFolders = new Set<string>();

    const upsertFolder = async (
      driveFolder: DriveFileRecord,
      parentFolderDbId: string | null,
      isDriveRoot: boolean
    ): Promise<string> => {
      const payload = {
        name: driveFolder.name,
        slug: slugifyFolder(driveFolder.name, driveFolder.id),
        category_id: categoryId,
        subcategory_id: subcategoryId,
        parent_id: parentFolderDbId,
        drive_folder_id: driveFolder.id,
        drive_parent_id: driveFolder.parents?.[0] ?? null,
        drive_web_view_link: driveFolder.webViewLink ?? null,
        is_drive_root: isDriveRoot,
        published,
        created_by: admin.userId,
      };

      const { data, error } = await adminClient
        .from('folders')
        .upsert(payload, { onConflict: 'drive_folder_id' })
        .select('id')
        .single();

      if (error || !data) {
        throw new Error(error?.message || `No se pudo registrar carpeta ${driveFolder.name}`);
      }
      report.foldersProcessed += 1;
      return data.id as string;
    };

    const queueFileRecord = (file: DriveFileRecord, folderDbId: string | null) => {
      if (!isSupportedDriveFile(file.mimeType, file.name)) {
        report.documentsSkippedUnsupported += 1;
        return;
      }

      const ext = extractExtension(file.name, file.mimeType);
      const sizeBytes = file.size ? Number(file.size) : null;
      const title = cleanDocumentTitle(file.name);
      const docType = inferDocumentType(title);
      const assignedColor = pickEditorialCoverColor(
        file.id,
        activeCoverPalette,
        pendingDocumentRows.length,
        batchColorOffset
      );

      thumbnailByDriveId.set(file.id, file.thumbnailLink ?? null);

      pendingDocumentRows.push({
        name: file.name,
        title,
        author: 'Autor por catalogar',
        category_id: categoryId,
        subcategory_id: subcategoryId,
        folder_id: folderDbId,
        category_name: categoryName,
        subject,
        description: file.description ?? '',
        document_type: docType,
        validity_status: validityStatus,
        country,
        color: assignedColor,
        source_type: 'google_drive',
        drive_file_id: file.id,
        drive_folder_id: file.parents?.[0] ?? null,
        drive_web_view_link: file.webViewLink ?? null,
        drive_modified_time: file.modifiedTime ?? null,
        drive_md5_checksum: file.md5Checksum ?? null,
        mime_type: file.mimeType,
        file_extension: ext,
        file_size_bytes: Number.isFinite(sizeBytes) ? sizeBytes : null,
        size_label: formatSizeLabel(Number.isFinite(sizeBytes) ? sizeBytes : null, ext),
        visibility,
        published,
        allow_preview: allowPreview,
        allow_download: allowDownload,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        created_by: admin.userId,
      });
    };

    const walkDriveFolder = async (
      driveFolder: DriveFileRecord,
      parentFolderDbId: string | null,
      isRoot: boolean,
      depth = 0
    ) => {
      if (visitedDriveFolders.has(driveFolder.id) || depth > 12) return;
      visitedDriveFolders.add(driveFolder.id);

      const folderDbId = await upsertFolder(driveFolder, parentFolderDbId, isRoot);
      if (isRoot) {
        trackedRootsToRegister.push({
          driveFolderId: driveFolder.id,
          folderId: folderDbId,
          categoryId,
          subcategoryId,
          name: driveFolder.name,
        });
      }

      const children = await listFolderChildrenPaginated(session.accessToken, driveFolder.id);
      for (const child of children) {
        if (child.trashed) continue;
        if (child.mimeType === GOOGLE_FOLDER_MIME) {
          try {
            await walkDriveFolder(child, folderDbId, false, depth + 1);
          } catch (subErr) {
            report.errors.push({
              driveId: child.id,
              name: child.name,
              message: subErr instanceof Error ? subErr.message : 'Error recorriendo subcarpeta',
            });
          }
        } else {
          queueFileRecord(child, folderDbId);
        }
      }
    };

    for (const item of items) {
      try {
        const meta = await fetchDriveFileMeta(session.accessToken, item.id);
        if (meta.trashed) continue;

        if (meta.mimeType === GOOGLE_FOLDER_MIME) {
          await walkDriveFolder(meta, targetFolderId, true, 0);
        } else {
          queueFileRecord(meta, targetFolderId);
        }
      } catch (itemErr) {
        report.errors.push({
          driveId: item.id,
          name: item.name,
          message: itemErr instanceof Error ? itemErr.message : 'Error al importar elemento',
        });
      }
    }

    // Deduplicación dentro del lote y upsert por lotes de 50 documentos
    const dedupMap = new Map<string, Record<string, unknown>>();
    for (const row of pendingDocumentRows) {
      dedupMap.set(String(row.drive_file_id), row);
    }

    const uniqueRows = Array.from(dedupMap.values());
    const driveIds = uniqueRows.map((r) => String(r.drive_file_id));

    // Preservar metadatos curados manualmente para registros ya existentes
    const existingByDriveId = new Map<
      string,
      {
        title: string;
        author: string;
        description: string;
        subject: string | null;
        color: string | null;
        cover_url: string | null;
      }
    >();
    for (const idBatch of chunkArray(driveIds, 100)) {
      const { data: existing } = await adminClient
        .from('documents')
        .select('drive_file_id, title, author, description, subject, color, cover_url')
        .in('drive_file_id', idBatch);
      for (const ex of existing ?? []) {
        if (ex.drive_file_id) {
          existingByDriveId.set(String(ex.drive_file_id), {
            title: String(ex.title),
            author: String(ex.author),
            description: String(ex.description ?? ''),
            subject: ex.subject ? String(ex.subject) : null,
            color: ex.color ? String(ex.color) : null,
            cover_url: ex.cover_url ? String(ex.cover_url) : null,
          });
        }
      }
    }

    // Extraer portadas reales (página 1 del PDF) desde Google Drive a Supabase Storage
    const extractedCoverByDriveId = new Map<string, string>();
    if (extractCovers) {
      const candidates = uniqueRows.filter((row) => {
        const dId = String(row.drive_file_id);
        const existing = existingByDriveId.get(dId);
        return !existing?.cover_url;
      });

      // Concurrencia controlada (lotes de 5, hasta 40 por importación para no exceder timeout)
      for (const coverBatch of chunkArray(candidates.slice(0, 40), 5)) {
        await Promise.all(
          coverBatch.map(async (row) => {
            const dId = String(row.drive_file_id);
            const coverUrl = await extractAndStoreDriveCover(
              adminClient,
              session.accessToken,
              dId,
              thumbnailByDriveId.get(dId)
            );
            if (coverUrl) {
              extractedCoverByDriveId.set(dId, coverUrl);
              report.coversExtracted += 1;
            }
          })
        );
      }
    }

    const mergedRows = uniqueRows.map((row) => {
      const dId = String(row.drive_file_id);
      const existing = existingByDriveId.get(dId);
      const nextCover = existing?.cover_url ?? extractedCoverByDriveId.get(dId) ?? null;

      if (!existing) {
        return nextCover ? { ...row, cover_url: nextCover } : row;
      }

      const keepExistingColor =
        !isSingleColorOverride &&
        existing.color &&
        existing.color.toUpperCase() !== '#101D35';
      return {
        ...row,
        title: existing.title || row.title,
        author: existing.author || row.author,
        description: existing.description || row.description,
        subject: existing.subject ?? row.subject,
        color: keepExistingColor ? existing.color : row.color,
        ...(nextCover ? { cover_url: nextCover } : {}),
      };
    });

    for (const batch of chunkArray(mergedRows, 50)) {
      const { error: batchErr } = await adminClient
        .from('documents')
        .upsert(batch, { onConflict: 'drive_file_id' });

      if (batchErr) {
        report.errors.push({
          driveId: 'batch',
          message: `Error guardando lote de documentos: ${batchErr.message}`,
        });
      } else {
        report.documentsImported += batch.length;
      }
    }

    // Registrar carpetas raíz importadas en drive_sync_state para futuras sincronizaciones incrementales
    if (trackedRootsToRegister.length > 0) {
      const { data: syncRow } = await adminClient
        .from('drive_sync_state')
        .select('id, tracked_roots')
        .eq('connection_id', session.connectionId)
        .maybeSingle();

      const currentRoots = Array.isArray(syncRow?.tracked_roots)
        ? (syncRow.tracked_roots as Array<{ driveFolderId: string }>)
        : [];
      const rootMap = new Map<string, unknown>();
      for (const r of currentRoots) {
        if (r?.driveFolderId) rootMap.set(r.driveFolderId, r);
      }
      for (const r of trackedRootsToRegister) {
        rootMap.set(r.driveFolderId, r);
      }

      await adminClient.from('drive_sync_state').upsert(
        {
          connection_id: session.connectionId,
          tracked_roots: Array.from(rootMap.values()),
        },
        { onConflict: 'connection_id' }
      );
    }

    return jsonResponse(req, {
      success: report.errors.length === 0,
      report: {
        ...report,
        colorsApplied: true,
      },
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
      { error: err instanceof Error ? err.message : 'Error durante la importación de Google Drive.' },
      500
    );
  }
});
