import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { decryptSecret, encryptSecret } from './crypto.ts';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'openid',
  'email',
  'profile',
];

export const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';

export const DEFAULT_COVER_PALETTE = [
  '#101D35',
  '#1C3152',
  '#2F4D44',
  '#5C3A41',
  '#4E3B31',
  '#3B4259',
  '#25394D',
  '#5B4B2A',
  '#3E2F4D',
  '#1F4B43',
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function sanitizeCoverPalette(colors?: unknown, singleColor?: unknown): string[] {
  if (Array.isArray(colors)) {
    const valid = Array.from(
      new Set(
        colors
          .map((c) => (typeof c === 'string' ? c.trim().toUpperCase() : ''))
          .filter((c) => HEX_COLOR_RE.test(c))
      )
    );
    if (valid.length > 0) return valid;
  }
  if (typeof singleColor === 'string' && HEX_COLOR_RE.test(singleColor.trim())) {
    return [singleColor.trim().toUpperCase()];
  }
  return DEFAULT_COVER_PALETTE;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickEditorialCoverColor(
  seed: string,
  palette: string[] = DEFAULT_COVER_PALETTE,
  batchIndex?: number,
  batchOffset = 0
): string {
  const safe = palette.length > 0 ? palette : DEFAULT_COVER_PALETTE;
  if (safe.length === 1) return safe[0];
  if (typeof batchIndex === 'number' && Number.isFinite(batchIndex)) {
    return safe[Math.abs(batchOffset + batchIndex) % safe.length];
  }
  return safe[hashSeed(seed) % safe.length];
}

export const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/epub+zip',
  'application/rtf',
  'text/plain',
  'application/vnd.oasis.opendocument.text',
]);

export interface DriveFileRecord {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
  modifiedTime?: string;
  md5Checksum?: string;
  trashed?: boolean;
  description?: string;
}

export function isSupportedDriveFile(mimeType: string, name?: string): boolean {
  if (SUPPORTED_MIME_TYPES.has(mimeType)) return true;
  if (!name) return false;
  const lower = name.toLowerCase();
  return /\.(pdf|docx?|xlsx?|pptx?|epub|rtf|txt|odt)$/.test(lower);
}

export function extractExtension(name: string, mimeType: string): string {
  const match = name.match(/\.([a-zA-Z0-9]{1,8})$/);
  if (match) return match[1].toLowerCase();
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/vnd.google-apps.document') return 'gdoc';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'gsheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'gslides';
  if (mimeType.includes('wordprocessingml')) return 'docx';
  if (mimeType === 'application/msword') return 'doc';
  return 'bin';
}

export function cleanDocumentTitle(filename: string): string {
  return filename
    .replace(/\.[a-zA-Z0-9]{1,8}$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || filename;
}

export function formatSizeLabel(bytes: number | null, ext: string): string {
  const upper = ext.toUpperCase();
  if (!bytes || bytes <= 0) return upper;
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  const formatted = val < 10 && idx > 0 ? val.toFixed(1) : String(Math.round(val));
  return `${upper} · ${formatted} ${units[idx]}`;
}

export function inferDocumentType(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('código') || lower.includes('codigo')) return 'codigo';
  if (/\bley\b/.test(lower) || lower.includes('decreto') || lower.includes('reglamento') || lower.includes('constitución') || lower.includes('constitucion')) {
    return 'ley';
  }
  if (lower.includes('sentencia') || lower.includes('tc/') || lower.includes('scj') || lower.includes('resolución')) {
    return 'sentencia';
  }
  if (lower.includes('jurisprudencia')) return 'jurisprudencia';
  if (lower.includes('manual')) return 'manual';
  if (lower.includes('guía') || lower.includes('guia')) return 'guia';
  if (lower.includes('artículo') || lower.includes('articulo') || lower.includes('ensayo') || lower.includes('revista')) {
    return 'articulo';
  }
  if (lower.includes('curso') || lower.includes('taller') || lower.includes('tesis') || lower.includes('monográfico')) {
    return 'curso';
  }
  return 'libro';
}

export function slugifyFolder(name: string, fallbackId: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || `carpeta-${fallbackId.slice(0, 8)}`;
}

export function getGoogleOAuthConfig() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')?.trim();
  const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Faltan secretos de Google OAuth en Supabase Edge Functions (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI).'
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export async function driveApiFetch(
  accessToken: string,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  let attempt = 0;
  let lastResponse: Response | null = null;

  while (attempt < 3) {
    const res = await fetch(url, { ...init, headers });
    if (res.ok || (res.status < 500 && res.status !== 429)) {
      return res;
    }
    lastResponse = res;
    attempt += 1;
    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }

  return lastResponse!;
}

export interface ActiveDriveSession {
  connectionId: string;
  googleEmail: string;
  accessToken: string;
  expiresAt: string | null;
}

export async function getActiveDriveSession(
  adminClient: SupabaseClient
): Promise<ActiveDriveSession> {
  const { data: conn, error } = await adminClient
    .from('google_drive_connections')
    .select('*')
    .eq('is_active', true)
    .in('status', ['connected', 'expired'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !conn) {
    throw new Error('No hay una cuenta de Google Drive conectada actualmente.');
  }

  const expiresAtMs = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  const nowPlusBuffer = Date.now() + 120_000;

  if (conn.encrypted_access_token && expiresAtMs > nowPlusBuffer) {
    const accessToken = await decryptSecret(conn.encrypted_access_token);
    return {
      connectionId: conn.id,
      googleEmail: conn.google_email,
      accessToken,
      expiresAt: conn.token_expires_at,
    };
  }

  if (!conn.encrypted_refresh_token) {
    await adminClient
      .from('google_drive_connections')
      .update({
        status: 'needs_reauth',
        last_error: 'El token de acceso expiró y no existe refresh token. Reconecta Google Drive.',
      })
      .eq('id', conn.id);
    throw new Error('La autorización de Google Drive expiró. Vuelve a conectar la cuenta.');
  }

  const refreshToken = await decryptSecret(conn.encrypted_refresh_token);
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    const googleError = String(
      tokenJson.error_description || tokenJson.error || 'Error al renovar token de Google Drive'
    );
    await adminClient
      .from('google_drive_connections')
      .update({
        status: 'needs_reauth',
        last_error: googleError,
      })
      .eq('id', conn.id);
    throw new Error(`No se pudo renovar el acceso a Google Drive: ${googleError}`);
  }

  const nextExpiresAt = new Date(
    Date.now() + Number(tokenJson.expires_in ?? 3600) * 1000
  ).toISOString();
  const encryptedAccessToken = await encryptSecret(String(tokenJson.access_token));

  await adminClient
    .from('google_drive_connections')
    .update({
      encrypted_access_token: encryptedAccessToken,
      token_expires_at: nextExpiresAt,
      status: 'connected',
      last_error: null,
    })
    .eq('id', conn.id);

  return {
    connectionId: conn.id,
    googleEmail: conn.google_email,
    accessToken: String(tokenJson.access_token),
    expiresAt: nextExpiresAt,
  };
}
