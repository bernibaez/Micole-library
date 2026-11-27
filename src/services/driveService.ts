import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  DEFAULT_COVER_COLOR,
  EDITORIAL_COVER_HEXES,
  pickEditorialCoverColor,
  sanitizeCoverPalette,
} from '../utils/bookColors';
import type { DriveConnectionSummary, DocumentVisibility, ValidityStatus } from '../types';
import type { PickerSelectionItem } from '../lib/googlePicker';

async function invokeFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para usar la integración con Google Drive.'
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Tu sesión ha expirado. Vuelve a iniciar sesión como administrador.');
  }

  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, {
    body: body ?? {},
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    let detailedMessage = error.message || `Error invocando la función ${name}.`;
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const parsed = (await context.json()) as { error?: string };
        if (parsed?.error) detailedMessage = parsed.error;
      } catch {
        // ignore parse error
      }
    }
    throw new Error(detailedMessage);
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  return data as T;
}

export async function fetchDriveConnectionSummary(): Promise<DriveConnectionSummary> {
  if (!isSupabaseConfigured || !supabase) {
    return { connected: false, connection: null, sync_state: null };
  }

  const { data, error } = await supabase.rpc('get_drive_connection_summary');
  if (error) {
    return { connected: false, connection: null, sync_state: null };
  }
  return data as DriveConnectionSummary;
}

export async function startGoogleDriveOAuth(
  redirectAfter = '/admin/google-drive'
): Promise<{ authUrl: string }> {
  return invokeFunction<{ authUrl: string }>('google-drive-oauth', {
    action: 'start',
    redirectAfter,
  });
}

export async function completeGoogleDriveOAuth(
  code: string,
  state: string
): Promise<{ connected: boolean; redirectAfter: string }> {
  return invokeFunction<{ connected: boolean; redirectAfter: string }>('google-drive-oauth', {
    action: 'callback',
    code,
    state,
  });
}

export async function disconnectGoogleDrive(): Promise<{ disconnected: boolean }> {
  return invokeFunction<{ disconnected: boolean }>('google-drive-oauth', {
    action: 'disconnect',
  });
}

export async function requestGooglePickerToken(): Promise<{
  accessToken: string;
  expiresAt: string | null;
  googleEmail: string;
}> {
  return invokeFunction('google-drive-picker-token');
}

export interface DriveImportOptions {
  items: PickerSelectionItem[];
  categoryId: string | null;
  subcategoryId?: string | null;
  targetFolderId?: string | null;
  visibility?: DocumentVisibility;
  published?: boolean;
  allowDownload?: boolean;
  allowPreview?: boolean;
  validityStatus?: ValidityStatus;
  country?: string;
  subject?: string | null;
  colorMode?: 'varied' | 'single';
  coverColors?: string[];
}

export interface DriveImportResult {
  success: boolean;
  report: {
    foldersProcessed: number;
    documentsImported: number;
    documentsSkippedUnsupported: number;
    colorsApplied?: boolean;
    errors: Array<{ driveId: string; name?: string; message: string }>;
  };
}

async function applyFallbackCoverColors(
  sinceIso: string,
  palette: string[],
  singleColorOverride: boolean
): Promise<void> {
  const client = supabase;
  if (!isSupabaseConfigured || !client) return;
  try {
    let query = client
      .from('documents')
      .select('id, drive_file_id, color')
      .eq('source_type', 'google_drive')
      .gte('last_synced_at', sinceIso)
      .order('added_at', { ascending: true });

    if (!singleColorOverride) {
      query = query.eq('color', DEFAULT_COVER_COLOR);
    }

    const { data: rows, error } = await query;
    if (error || !rows || rows.length === 0) return;

    const batchOffset = Math.floor(Math.random() * palette.length);
    const updates = rows.map((row, index) => ({
      id: String(row.id),
      color: pickEditorialCoverColor(
        String(row.drive_file_id || row.id),
        palette,
        index,
        batchOffset
      ),
    }));

    const chunkSize = 20;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const slice = updates.slice(i, i + chunkSize);
      await Promise.all(
        slice.map((item) =>
          client.from('documents').update({ color: item.color }).eq('id', item.id)
        )
      );
    }
  } catch {
    // Non-blocking fallback when Edge Function has not been redeployed yet
  }
}

export async function importFromGoogleDrive(
  options: DriveImportOptions
): Promise<DriveImportResult> {
  const activePalette = sanitizeCoverPalette(options.coverColors);
  const colorMode = options.colorMode ?? (activePalette.length === 1 ? 'single' : 'varied');
  const startedAt = new Date(Date.now() - 10_000).toISOString();

  const result = await invokeFunction<DriveImportResult>('google-drive-import', {
    ...options,
    colorMode,
    coverColors: activePalette,
  } as unknown as Record<string, unknown>);

  // Fallback inmediato si la Edge Function remota aún no se ha redesplegado con soporte de colores
  if (!result.report?.colorsApplied && (result.report?.documentsImported ?? 0) > 0) {
    await applyFallbackCoverColors(
      startedAt,
      activePalette,
      colorMode === 'single' || activePalette.length === 1
    );
  }

  return result;
}

export interface DriveSyncResult {
  status?: string;
  initialized?: boolean;
  message?: string;
  tokenExpiredRecovery?: boolean;
  added: number;
  updated: number;
  removed: number;
  errors: Array<{ at: string; fileId?: string; name?: string; message: string }>;
}

export async function triggerGoogleDriveSync(): Promise<DriveSyncResult> {
  const startedAt = new Date(Date.now() - 10_000).toISOString();
  const result = await invokeFunction<DriveSyncResult>('google-drive-sync', {});
  if ((result.added ?? 0) > 0) {
    await applyFallbackCoverColors(startedAt, EDITORIAL_COVER_HEXES, false);
  }
  return result;
}

export function buildDriveProxyRequest(
  documentId: string,
  mode: 'view' | 'download' = 'view',
  accessToken?: string | null
): { url: string; headers: Record<string, string> } | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) return null;

  const base = supabaseUrl.replace(/\/$/, '');
  const url = `${base}/functions/v1/drive-file-proxy?documentId=${encodeURIComponent(documentId)}&mode=${mode}`;

  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken || anonKey}`,
  };
  return { url, headers };
}
