import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface CallerContext {
  userId: string | null;
  email: string | null;
  role: 'admin' | 'visitor' | 'anon';
  reason?: string;
}

export async function resolveCaller(
  req: Request,
  adminClient: SupabaseClient
): Promise<CallerContext> {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { userId: null, email: null, role: 'anon', reason: 'missing_bearer_header' };
  }

  const token = authHeader.slice(7).trim();
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  if (!token || (anonKey && token === anonKey)) {
    return { userId: null, email: null, role: 'anon', reason: 'anon_token_provided' };
  }

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    return {
      userId: null,
      email: null,
      role: 'anon',
      reason: `invalid_jwt:${error?.message ?? 'no_user'}`,
    };
  }

  // En modo biblioteca personal, cualquier usuario autenticado puede gestionar su biblioteca y Drive.
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    role: 'admin',
    reason: 'authenticated_user',
  };
}

export async function requireAdminCaller(
  req: Request,
  adminClient: SupabaseClient
): Promise<{ userId: string; email: string | null }> {
  const caller = await resolveCaller(req, adminClient);
  if (!caller.userId) {
    throw new Response(
      JSON.stringify({
        error: `Debes iniciar sesión para realizar esta operación (${caller.reason ?? 'unauthorized'}).`,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return { userId: caller.userId, email: caller.email };
}
