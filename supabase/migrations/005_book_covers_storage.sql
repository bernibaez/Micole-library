-- =============================================================================
-- MICOLE LIBRARY — Migración 005: Bucket público para portadas reales de libros
-- Almacena las miniaturas de portada extraídas de Google Drive (página 1 del PDF)
-- para servirlas instantáneamente desde el CDN de Supabase Storage.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-covers',
  'book-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads book covers" on storage.objects;
create policy "Public reads book covers"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'book-covers');

drop policy if exists "Admins manage book covers" on storage.objects;
create policy "Admins manage book covers"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'book-covers' and public.is_admin())
  with check (bucket_id = 'book-covers' and public.is_admin());
