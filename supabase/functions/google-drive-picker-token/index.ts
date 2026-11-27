import { buildCorsHeaders, handleCorsPreflight, jsonResponse } from '../_shared/cors.ts';
import { getActiveDriveSession } from '../_shared/googleDrive.ts';
import { createServiceClient, requireAdminCaller } from '../_shared/supabaseAdmin.ts';

// Devuelve un access_token efímero de Google Drive únicamente al administrador autenticado
// para abrir Google Picker en su navegador. Nunca devuelve refresh_token ni client_secret.
Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Método no permitido.' }, 405);
  }

  try {
    const adminClient = createServiceClient();
    await requireAdminCaller(req, adminClient);

    const session = await getActiveDriveSession(adminClient);
    return jsonResponse(req, {
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      googleEmail: session.googleEmail,
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
            : 'No se pudo obtener token temporal para Google Picker.',
      },
      400
    );
  }
});
