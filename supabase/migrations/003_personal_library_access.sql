-- =============================================================================
-- LexLibrary — Migración 003: Modo Biblioteca Personal + Permisos GRANT completos
-- Permite que cualquier usuario autenticado gestione su biblioteca y conecte
-- Google Drive, manteniendo a los visitantes anónimos en modo solo lectura.
-- Corrige también los permisos GRANT de service_role, authenticated y anon.
-- =============================================================================

-- 1. Permisos completos para service_role (usado por Supabase Edge Functions)
grant usage on schema public to service_role, anon, authenticated;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- 2. Permisos para visitantes anónimos (solo lectura pública controlada por RLS)
grant select on table
  public.categories,
  public.folders,
  public.documents,
  public.books
to anon;

-- 3. Permisos para usuarios autenticados (gestión personal controlada por RLS)
grant select, insert, update, delete on table
  public.categories,
  public.folders,
  public.documents,
  public.books,
  public.profiles,
  public.user_preferences,
  public.user_library,
  public.favorites,
  public.document_favorites,
  public.recent_documents,
  public.reading_progress,
  public.reading_history,
  public.bookmarks,
  public.downloads,
  public.collections,
  public.collection_books,
  public.notifications
to authenticated;

grant select on table
  public.drive_sync_state,
  public.download_events
to authenticated;

-- Mantener tablas de tokens OAuth cifrados bloqueadas al cliente (solo service_role)
revoke all on table
  public.google_drive_connections,
  public.google_drive_oauth_states
from anon, authenticated;

-- 4. En modo biblioteca personal, todo usuario autenticado tiene acceso de gestión,
--    mientras que visitantes anónimos (auth.uid() is null) siguen siendo solo lectura.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_drive_connection_summary() to authenticated;
grant execute on function public.get_admin_dashboard_stats() to authenticated;
grant execute on function public.record_recent_document(uuid, integer) to authenticated;
grant execute on function public.record_document_download(uuid, text) to anon, authenticated;
