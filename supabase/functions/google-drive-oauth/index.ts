import { buildCorsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { decryptSecret, encryptSecret } from '../_shared/crypto.ts';
import {
  driveApiFetch,
  getGoogleOAuthConfig,
  GOOGLE_DRIVE_SCOPES,
} from '../_shared/googleDrive.ts';
import { createServiceClient, requireAdminCaller } from '../_shared/supabaseAdmin.ts';

function randomStateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function resolveRedirectUri(req: Request, fallbackRedirectUri: string): string {
  const origin = req.headers.get('origin')?.trim();
  if (!origin) return fallbackRedirectUri;
  const allowedRaw = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  const allowedList = allowedRaw
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const cleanOrigin = origin.replace(/\/$/, '');
  if (allowedList.length > 0 && allowedList.includes(cleanOrigin)) {
    return `${cleanOrigin}/admin/google-drive/callback`;
  }
  return fallbackRedirectUri;
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
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      code?: string;
      state?: string;
      redirectAfter?: string;
    };

    const action = body.action ?? 'status';

    if (action === 'start') {
      const { clientId, redirectUri: defaultRedirectUri } = getGoogleOAuthConfig();
      const redirectUri = resolveRedirectUri(req, defaultRedirectUri);
      const stateToken = randomStateToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await adminClient
        .from('google_drive_oauth_states')
        .delete()
        .lt('expires_at', new Date().toISOString());

      const { error: stateErr } = await adminClient
        .from('google_drive_oauth_states')
        .insert({
          state_token: stateToken,
          admin_user_id: admin.userId,
          redirect_after: body.redirectAfter || '/admin/google-drive',
          expires_at: expiresAt,
        });

      if (stateErr) throw new Error(stateErr.message);

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GOOGLE_DRIVE_SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent select_account');
      authUrl.searchParams.set('include_granted_scopes', 'true');
      authUrl.searchParams.set('state', stateToken);

      return jsonResponse(req, { authUrl: authUrl.toString() });
    }

    if (action === 'callback') {
      const code = body.code?.trim();
      const state = body.state?.trim();
      if (!code || !state) {
        return jsonResponse(req, { error: 'Faltan los parámetros code o state de OAuth.' }, 400);
      }

      const { data: stateRow, error: stateLookupErr } = await adminClient
        .from('google_drive_oauth_states')
        .select('*')
        .eq('state_token', state)
        .maybeSingle();

      if (stateLookupErr || !stateRow) {
        return jsonResponse(req, { error: 'Estado OAuth inválido o ya consumido.' }, 400);
      }

      // Consumo de un solo uso
      await adminClient
        .from('google_drive_oauth_states')
        .delete()
        .eq('state_token', state);

      if (
        stateRow.admin_user_id !== admin.userId ||
        new Date(stateRow.expires_at).getTime() < Date.now()
      ) {
        return jsonResponse(req, { error: 'La sesión OAuth expiró o no corresponde al administrador.' }, 400);
      }

      const { clientId, clientSecret, redirectUri: defaultRedirectUri } = getGoogleOAuthConfig();
      const redirectUri = resolveRedirectUri(req, defaultRedirectUri);

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenJson = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenJson.access_token) {
        return jsonResponse(
          req,
          {
            error:
              tokenJson.error_description ||
              tokenJson.error ||
              'Google rechazó el intercambio del código OAuth.',
          },
          400
        );
      }

      const accessToken = String(tokenJson.access_token);
      const refreshToken = tokenJson.refresh_token ? String(tokenJson.refresh_token) : null;
      const scopes = String(tokenJson.scope ?? GOOGLE_DRIVE_SCOPES.join(' '))
        .split(' ')
        .filter(Boolean);
      const expiresAt = new Date(
        Date.now() + Number(tokenJson.expires_in ?? 3600) * 1000
      ).toISOString();

      // Obtener perfil de la cuenta Google conectada
      const userInfoRes = await driveApiFetch(
        accessToken,
        'https://www.googleapis.com/oauth2/v3/userinfo'
      );
      const userInfo = await userInfoRes.json().catch(() => ({}));
      const googleEmail = String(userInfo.email || 'cuenta-google@desconocida');

      // Conservar refresh_token previo si Google no emitió uno nuevo para la misma cuenta
      let encryptedRefresh = refreshToken ? await encryptSecret(refreshToken) : null;
      if (!encryptedRefresh) {
        const { data: prev } = await adminClient
          .from('google_drive_connections')
          .select('encrypted_refresh_token')
          .eq('google_email', googleEmail)
          .not('encrypted_refresh_token', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        encryptedRefresh = prev?.encrypted_refresh_token ?? null;
      }

      const encryptedAccess = await encryptSecret(accessToken);

      // Desactivar conexiones previas
      await adminClient
        .from('google_drive_connections')
        .update({ is_active: false })
        .eq('is_active', true);

      const { data: newConn, error: insertErr } = await adminClient
        .from('google_drive_connections')
        .insert({
          admin_user_id: admin.userId,
          google_user_id: userInfo.sub ? String(userInfo.sub) : null,
          google_email: googleEmail,
          google_display_name: userInfo.name ? String(userInfo.name) : null,
          google_avatar_url: userInfo.picture ? String(userInfo.picture) : null,
          encrypted_access_token: encryptedAccess,
          encrypted_refresh_token: encryptedRefresh,
          token_expires_at: expiresAt,
          scopes,
          status: 'connected',
          is_active: true,
          last_error: null,
          connected_at: new Date().toISOString(),
        })
        .select('id, google_email, google_display_name, google_avatar_url, scopes, status, token_expires_at, connected_at')
        .single();

      if (insertErr) throw new Error(insertErr.message);

      // Inicializar startPageToken de Google Drive Changes API
      let startPageToken: string | null = null;
      const startTokenRes = await driveApiFetch(
        accessToken,
        'https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=true'
      );
      if (startTokenRes.ok) {
        const stJson = await startTokenRes.json().catch(() => ({}));
        startPageToken = stJson.startPageToken ? String(stJson.startPageToken) : null;
      }

      await adminClient.from('drive_sync_state').upsert(
        {
          connection_id: newConn.id,
          start_page_token: startPageToken,
          status: 'idle',
          last_error: null,
        },
        { onConflict: 'connection_id' }
      );

      return jsonResponse(req, {
        connected: true,
        redirectAfter: stateRow.redirect_after || '/admin/google-drive',
        connection: newConn,
      });
    }

    if (action === 'disconnect') {
      const { data: activeConns } = await adminClient
        .from('google_drive_connections')
        .select('id, encrypted_refresh_token, encrypted_access_token')
        .eq('is_active', true);

      for (const conn of activeConns ?? []) {
        try {
          const tokenToRevoke = conn.encrypted_refresh_token
            ? await decryptSecret(conn.encrypted_refresh_token)
            : conn.encrypted_access_token
              ? await decryptSecret(conn.encrypted_access_token)
              : null;
          if (tokenToRevoke) {
            await fetch(
              `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
              { method: 'POST' }
            );
          }
        } catch {
          // Best-effort revocation
        }

        await adminClient
          .from('google_drive_connections')
          .update({
            status: 'disconnected',
            is_active: false,
            encrypted_access_token: '',
            encrypted_refresh_token: null,
            last_error: null,
          })
          .eq('id', conn.id);
      }

      return jsonResponse(req, { disconnected: true });
    }

    // status fallback
    const { data: conn } = await adminClient
      .from('google_drive_connections')
      .select(
        'id, google_email, google_display_name, google_avatar_url, scopes, status, token_expires_at, last_error, connected_at, updated_at'
      )
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conn) {
      return jsonResponse(req, { connected: false, connection: null, sync_state: null });
    }

    const { data: syncState } = await adminClient
      .from('drive_sync_state')
      .select(
        'id, status, tracked_roots, last_sync_at, last_successful_sync_at, files_added, files_updated, files_removed, last_error, recent_errors, updated_at, start_page_token'
      )
      .eq('connection_id', conn.id)
      .maybeSingle();

    return jsonResponse(req, {
      connected: conn.status === 'connected' || conn.status === 'expired',
      connection: conn,
      sync_state: syncState
        ? {
            ...syncState,
            has_change_token: Boolean(syncState.start_page_token),
            start_page_token: undefined,
          }
        : null,
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
      { error: err instanceof Error ? err.message : 'Error interno en Google Drive OAuth.' },
      500
    );
  }
});
