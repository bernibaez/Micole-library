-- =============================================================================
-- LexLibrary — Migración 001: Evolución integral (no destructiva)
-- Compatible con el esquema previo en supabase/schema.sql
-- Ejecutar en Supabase SQL Editor una o varias veces de forma idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Utilidad para actualizar updated_at automáticamente
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Categorías jurídicas
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text not null default '',
  icon text not null default 'scale',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "Public reads categories" on public.categories;
create policy "Public reads categories"
  on public.categories for select
  to anon, authenticated
  using (true);

insert into public.categories (slug, name, description, icon, sort_order) values
  ('derecho-procesal-penal', 'Derecho Procesal Penal', 'Fases del proceso penal dominicano, medidas de coerción, audiencias y recursos.', 'scale', 1),
  ('codigo-procesal-penal', 'Código Procesal Penal', 'Ley 76-02 y sus reformas, comentarios artículo por artículo y guías prácticas.', 'book-open', 2),
  ('legislacion-dominicana', 'Legislación Dominicana', 'Leyes orgánicas, normativa complementaria y compendios legislativos vigentes.', 'landmark', 3),
  ('jurisprudencia', 'Jurisprudencia', 'Criterios relevantes de la Suprema Corte de Justicia y del Tribunal Constitucional.', 'gavel', 4),
  ('derecho-penal-general', 'Derecho Penal General', 'Teoría del delito, culpabilidad, tipicidad y fundamentos de la sanción penal.', 'shield', 5),
  ('derecho-constitucional', 'Derecho Constitucional', 'Garantías fundamentales, debido proceso y control de constitucionalidad.', 'scroll', 6),
  ('derecho-probatorio', 'Derecho Probatorio', 'Valoración probatoria, cadena de custodia, exclusión y prueba pericial.', 'file-search', 7),
  ('doctrina-juridica', 'Doctrina Jurídica', 'Tratados, monografías y ensayos académicos de autores especializados.', 'library', 8),
  ('derechos-humanos', 'Derechos Humanos', 'Estándares interamericanos, tutela judicial efectiva y garantías procesales.', 'globe', 9)
on conflict (name) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Evolución no destructiva de la tabla books
-- -----------------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  year integer not null,
  category text not null,
  description text not null default '',
  color text not null default '#101D35',
  file_url text,
  cover_url text,
  size_label text not null default 'PDF',
  downloads integer not null default 0,
  published boolean not null default false
);

alter table public.books add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.books add column if not exists document_type text not null default 'libro';
alter table public.books add column if not exists publisher text;
alter table public.books add column if not exists isbn text;
alter table public.books add column if not exists pages integer;
alter table public.books add column if not exists language text not null default 'Español';
alter table public.books add column if not exists source text;
alter table public.books add column if not exists file_path text;
alter table public.books add column if not exists is_private boolean not null default false;
alter table public.books add column if not exists featured boolean not null default false;
alter table public.books add column if not exists keywords text[] not null default '{}';
alter table public.books add column if not exists created_at timestamptz not null default now();
alter table public.books add column if not exists updated_at timestamptz not null default now();

-- Vincular category_id automáticamente para registros existentes
update public.books b
set category_id = c.id
from public.categories c
where b.category_id is null and lower(b.category) = lower(c.name);

alter table public.books enable row level security;

drop policy if exists "Public reads published books" on public.books;
create policy "Public reads published books"
  on public.books for select
  to anon, authenticated
  using (published = true);

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

create index if not exists idx_books_published_year on public.books (published, year desc);
create index if not exists idx_books_category on public.books (category);
create index if not exists idx_books_category_id on public.books (category_id);
create index if not exists idx_books_document_type on public.books (document_type);
create index if not exists idx_books_downloads on public.books (downloads desc);
create index if not exists idx_books_featured on public.books (featured) where featured = true;

-- Incremento seguro del contador de descargas
create or replace function public.increment_book_downloads(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.books
  set downloads = coalesce(downloads, 0) + 1
  where id = p_book_id and published = true;
end;
$$;

grant execute on function public.increment_book_downloads(uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Perfiles de usuario (profiles)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text,
  institution text,
  career text,
  user_type text not null default 'estudiante' check (user_type in ('estudiante', 'profesor', 'investigador')),
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Preferencias de usuario (user_preferences)
-- -----------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reader_theme text not null default 'light' check (reader_theme in ('light', 'dark', 'sepia')),
  reader_zoom numeric(4, 2) not null default 1.00 check (reader_zoom between 0.50 and 3.00),
  reader_fit_mode text not null default 'width' check (reader_fit_mode in ('width', 'page', 'custom')),
  reduce_motion boolean not null default false,
  email_notifications boolean not null default true,
  catalog_view text not null default 'grid' check (catalog_view in ('grid', 'list')),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences"
  on public.user_preferences for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Mi biblioteca (user_library)
-- -----------------------------------------------------------------------------
create table if not exists public.user_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'reading', 'completed')),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

alter table public.user_library enable row level security;

drop policy if exists "Users manage own library" on public.user_library;
create policy "Users manage own library"
  on public.user_library for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_user_library_updated_at on public.user_library;
create trigger trg_user_library_updated_at
  before update on public.user_library
  for each row execute function public.set_updated_at();

create index if not exists idx_user_library_user on public.user_library (user_id, updated_at desc);

-- -----------------------------------------------------------------------------
-- 7. Favoritos (favorites)
-- -----------------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);

alter table public.favorites enable row level security;

drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites"
  on public.favorites for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_favorites_user on public.favorites (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 8. Progreso de lectura (reading_progress)
-- -----------------------------------------------------------------------------
create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  current_page integer not null default 1 check (current_page >= 1),
  total_pages integer check (total_pages is null or total_pages >= 1),
  progress_percent numeric(5, 2) not null default 0 check (progress_percent between 0 and 100),
  last_read_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, book_id)
);

alter table public.reading_progress enable row level security;

drop policy if exists "Users manage own reading progress" on public.reading_progress;
create policy "Users manage own reading progress"
  on public.reading_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_reading_progress_user on public.reading_progress (user_id, last_read_at desc);

-- -----------------------------------------------------------------------------
-- 9. Historial de lectura (reading_history)
-- -----------------------------------------------------------------------------
create table if not exists public.reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  opened_at timestamptz not null default now(),
  last_page integer not null default 1 check (last_page >= 1)
);

alter table public.reading_history enable row level security;

drop policy if exists "Users manage own reading history" on public.reading_history;
create policy "Users manage own reading history"
  on public.reading_history for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_reading_history_user on public.reading_history (user_id, opened_at desc);

-- -----------------------------------------------------------------------------
-- 10. Marcadores de páginas (bookmarks)
-- -----------------------------------------------------------------------------
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  page_number integer not null check (page_number >= 1),
  label text,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, book_id, page_number)
);

alter table public.bookmarks enable row level security;

drop policy if exists "Users manage own bookmarks" on public.bookmarks;
create policy "Users manage own bookmarks"
  on public.bookmarks for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_bookmarks_user_book on public.bookmarks (user_id, book_id, page_number);

-- -----------------------------------------------------------------------------
-- 11. Descargas (downloads)
-- -----------------------------------------------------------------------------
create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

alter table public.downloads enable row level security;

drop policy if exists "Users manage own downloads" on public.downloads;
create policy "Users manage own downloads"
  on public.downloads for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_downloads_user on public.downloads (user_id, downloaded_at desc);

-- -----------------------------------------------------------------------------
-- 12. Colecciones personalizadas (collections y collection_books)
-- -----------------------------------------------------------------------------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null default '#101D35',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.collections enable row level security;

drop policy if exists "Users manage own collections" on public.collections;
create policy "Users manage own collections"
  on public.collections for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_collections_updated_at on public.collections;
create trigger trg_collections_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

create index if not exists idx_collections_user on public.collections (user_id, created_at desc);

create table if not exists public.collection_books (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (collection_id, book_id)
);

alter table public.collection_books enable row level security;

drop policy if exists "Users manage own collection books" on public.collection_books;
create policy "Users manage own collection books"
  on public.collection_books for all
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_books.collection_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_books.collection_id
        and c.user_id = auth.uid()
    )
  );

create index if not exists idx_collection_books_collection on public.collection_books (collection_id);

-- -----------------------------------------------------------------------------
-- 13. Notificaciones (notifications)
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info' check (type in ('info', 'new_book', 'reading', 'system')),
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users manage own notifications" on public.notifications;
create policy "Users manage own notifications"
  on public.notifications for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 14. Creación automática de perfil, preferencias y bienvenida al registrarse
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first_name text;
  v_last_name text;
begin
  v_first_name := coalesce(
    new.raw_user_meta_data->>'first_name',
    split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1),
    ''
  );
  v_last_name := coalesce(
    new.raw_user_meta_data->>'last_name',
    nullif(trim(substring(coalesce(new.raw_user_meta_data->>'full_name', '') from length(v_first_name) + 1)), ''),
    ''
  );

  insert into public.profiles (id, first_name, last_name, email, avatar_url)
  values (
    new.id,
    v_first_name,
    v_last_name,
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notifications (user_id, title, body, type, action_url)
  values (
    new.id,
    'Bienvenido a LexLibrary',
    'Tu biblioteca personal de Derecho Procesal Penal dominicano está lista. Guarda recursos, crea colecciones y sincroniza tu progreso de lectura.',
    'system',
    '/mi-biblioteca'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 15. Almacenamiento (Supabase Storage)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', true),
  ('covers', 'covers', true),
  ('avatars', 'avatars', true),
  ('private-documents', 'private-documents', false)
on conflict (id) do nothing;

-- Políticas para avatares: lectura pública y escritura restringida a la carpeta del usuario ({user_id}/*)
drop policy if exists "Public reads avatars" on storage.objects;
create policy "Public reads avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Políticas para documentos privados: lectura para usuarios autenticados (para URLs firmadas)
drop policy if exists "Authenticated read private documents" on storage.objects;
create policy "Authenticated read private documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'private-documents');
