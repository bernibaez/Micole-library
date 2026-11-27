import { isSupabaseConfigured, supabase } from '../lib/supabase';
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
}

export interface DriveImportResult {
  success: boolean;
  report: {
    foldersProcessed: number;
    documentsImported: number;
    documentsSkippedUnsupported: number;
    errors: Array<{ driveId: string; name?: string; message: string }>;
  };
}

export async function importFromGoogleDrive(
  options: DriveImportOptions
): Promise<DriveImportResult> {
  return invokeFunction<DriveImportResult>('google-drive-import', options as unknown as Record<string, unknown>);
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
  return invokeFunction<DriveSyncResult>('google-drive-sync', {});
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
