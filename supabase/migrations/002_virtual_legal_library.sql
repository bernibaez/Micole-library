-- =============================================================================
-- LexLibrary — Migración 002: Biblioteca Jurídica Virtual (Supabase + Google Drive)
-- Arquitectura híbrida no destructiva e idempotente.
-- Compatible con supabase/schema.sql y supabase/migrations/001_lexlibrary_evolution.sql.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- 1. Roles administrativos en profiles + protección contra auto-escalación
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'visitor';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('admin', 'visitor'));
  end if;
end $$;

create index if not exists idx_profiles_role on public.profiles (role);

-- Función helper para políticas RLS (security definer sin recursión)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Evita que un usuario visitante escale su propio rol desde PostgREST
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
      new.role := 'visitor';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
      raise exception 'No tienes permisos para modificar el rol de usuario.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_role_guard on public.profiles;
create trigger trg_profiles_role_guard
  before insert or update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Categorías y subcategorías jurídicas (estructura dinámica de 9 secciones)
--    IMPORTANTE: "Legislación derogada o histórica" es subcategoría de
--    "Legislación dominicana", nunca una sección independiente.
-- -----------------------------------------------------------------------------
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade;
alter table public.categories
  add column if not exists is_system boolean not null default false;
alter table public.categories
  add column if not exists is_active boolean not null default true;
alter table public.categories
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_categories_parent_id on public.categories (parent_id);
create index if not exists idx_categories_active_order on public.categories (is_active, sort_order);

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Alinear nombre canónico de Legislación dominicana sin duplicar si existía con mayúscula previa
update public.categories
set name = 'Legislación dominicana'
where slug = 'legislacion-dominicana'
  and name <> 'Legislación dominicana'
  and not exists (select 1 from public.categories where name = 'Legislación dominicana');

-- Insertar / actualizar las 9 secciones principales requeridas
insert into public.categories (slug, name, description, icon, sort_order, parent_id, is_system, is_active)
values
  ('inicio-rapido', 'Inicio rápido', 'Guías esenciales, documentos de referencia frecuente y accesos prioritarios para consulta inmediata.', 'zap', 1, null, true, true),
  ('legislacion-dominicana', 'Legislación dominicana', 'Constitución, códigos, leyes orgánicas, decretos y normativa vigente e histórica de la República Dominicana.', 'landmark', 2, null, true, true),
  ('jurisprudencia', 'Jurisprudencia', 'Sentencias y criterios relevantes de la Suprema Corte de Justicia, Tribunal Constitucional y cortes superiores.', 'gavel', 3, null, true, true),
  ('doctrina', 'Doctrina', 'Tratados, manuales, monografías y obras fundamentales de juristas nacionales e internacionales.', 'library', 4, null, true, true),
  ('derecho-comparado', 'Derecho comparado', 'Legislación extranjera, convenios internacionales y estudios comparados de sistemas jurídicos.', 'globe', 5, null, true, true),
  ('articulos-publicaciones-academicas', 'Artículos y publicaciones académicas', 'Ensayos, revistas jurídicas, ponencias e investigaciones arbitradas.', 'file-text', 6, null, true, true),
  ('cursos-y-trabajos', 'Cursos y trabajos', 'Material de cátedra, programas académicos, tesis, monográficos y trabajos prácticos.', 'graduation-cap', 7, null, true, true),
  ('otras-lecturas', 'Otras lecturas', 'Lecturas complementarias, filosofía jurídica, historia del Derecho y humanidades afines.', 'book-open', 8, null, true, true),
  ('formacion-desarrollo-profesional', 'Formación y desarrollo profesional jurídico', 'Ética profesional, litigación estratégica, redacción jurídica y competencias del ejercicio profesional.', 'briefcase', 9, null, true, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  parent_id = null,
  is_system = true,
  is_active = true;

-- Subcategoría obligatoria dentro de "Legislación dominicana"
insert into public.categories (slug, name, description, icon, sort_order, parent_id, is_system, is_active)
select
  'legislacion-derogada-historica',
  'Legislación derogada o histórica',
  'Normativa histórica, leyes derogadas y textos anteriores conservados con fines de investigación y derecho transitorio.',
  'archive',
  1,
  c.id,
  true,
  true
from public.categories c
where c.slug = 'legislacion-dominicana'
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  is_system = true,
  is_active = true;

-- Marcar categorías legacy no pertenecientes a la taxonomía principal como inactivas (sin borrarlas)
update public.categories
set is_active = false
where slug in (
  'derecho-procesal-penal',
  'codigo-procesal-penal',
  'derecho-penal-general',
  'derecho-constitucional',
  'derecho-probatorio',
  'doctrina-juridica',
  'derechos-humanos'
)
and is_system = false;

-- RLS para categorías
drop policy if exists "Public reads categories" on public.categories;
create policy "Public reads active categories"
  on public.categories for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Carpetas y subcarpetas dinámicas (folders) — conserva jerarquía de Drive
-- -----------------------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.categories(id) on delete set null,
  parent_id uuid references public.folders(id) on delete cascade,
  drive_folder_id text unique,
  drive_parent_id text,
  drive_web_view_link text,
  is_drive_root boolean not null default false,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_folders_category_id on public.folders (category_id);
create index if not exists idx_folders_subcategory_id on public.folders (subcategory_id);
create index if not exists idx_folders_parent_id on public.folders (parent_id);
create index if not exists idx_folders_drive_parent_id on public.folders (drive_parent_id);
create index if not exists idx_folders_published on public.folders (published);

alter table public.folders enable row level security;

drop policy if exists "Public reads published folders" on public.folders;
create policy "Public reads published folders"
  on public.folders for select
  to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "Admins manage folders" on public.folders;
create policy "Admins manage folders"
  on public.folders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists trg_folders_updated_at on public.folders;
create trigger trg_folders_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Tabla principal de documentos jurídicos (documents)
--    Google Drive conserva los binarios; PostgreSQL guarda metadatos y referencias.
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  author text not null default 'Autor no especificado',
  publisher text,
  publication_date date,
  year integer,
  added_at timestamptz not null default now(),
  subject text,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.categories(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  category_name text not null default 'Otras lecturas',
  description text not null default '',
  document_type text not null default 'libro'
    check (document_type in (
      'libro', 'codigo', 'ley', 'jurisprudencia', 'sentencia',
      'doctrina', 'articulo', 'curso', 'guia', 'manual', 'otro'
    )),
  page_count integer check (page_count is null or page_count >= 1),
  validity_status text not null default 'no_aplica'
    check (validity_status in (
      'vigente', 'derogada', 'reformada', 'historica', 'borrador', 'no_aplica'
    )),
  country text not null default 'República Dominicana',
  court text,
  judgment_number text,
  language text not null default 'Español',
  isbn text,
  source text,
  keywords text[] not null default '{}',
  color text not null default '#101D35',
  cover_url text,
  source_type text not null default 'google_drive'
    check (source_type in ('google_drive', 'external_url', 'local', 'legacy_storage')),
  drive_file_id text unique,
  drive_folder_id text,
  drive_web_view_link text,
  drive_modified_time timestamptz,
  drive_md5_checksum text,
  mime_type text not null default 'application/pdf',
  file_extension text not null default 'pdf',
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  size_label text not null default 'PDF',
  external_url text,
  file_path text,
  visibility text not null default 'public'
    check (visibility in ('public', 'registered', 'admin_only')),
  published boolean not null default true,
  featured boolean not null default false,
  allow_preview boolean not null default true,
  allow_download boolean not null default true,
  sync_status text not null default 'manual'
    check (sync_status in ('synced', 'pending', 'modified', 'missing', 'deleted', 'error', 'manual')),
  last_synced_at timestamptz,
  downloads_count integer not null default 0,
  legacy_book_id uuid unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para búsqueda y filtros jurídicos
create index if not exists idx_documents_title_trgm on public.documents using gin (title gin_trgm_ops);
create index if not exists idx_documents_author_trgm on public.documents using gin (author gin_trgm_ops);
create index if not exists idx_documents_subject on public.documents (subject);
create index if not exists idx_documents_category_id on public.documents (category_id);
create index if not exists idx_documents_subcategory_id on public.documents (subcategory_id);
create index if not exists idx_documents_folder_id on public.documents (folder_id);
create index if not exists idx_documents_document_type on public.documents (document_type);
create index if not exists idx_documents_validity_status on public.documents (validity_status);
create index if not exists idx_documents_country on public.documents (country);
create index if not exists idx_documents_court on public.documents (court);
create index if not exists idx_documents_drive_folder_id on public.documents (drive_folder_id);
create index if not exists idx_documents_sync_status on public.documents (sync_status);
create index if not exists idx_documents_visibility_pub on public.documents (published, visibility, added_at desc);
create index if not exists idx_documents_downloads_count on public.documents (downloads_count desc);
create index if not exists idx_documents_search_tsv on public.documents using gin (
  to_tsvector(
    'spanish',
    coalesce(title, '') || ' ' ||
    coalesce(author, '') || ' ' ||
    coalesce(subject, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(court, '') || ' ' ||
    coalesce(judgment_number, '')
  )
);

-- Trigger para mantener category_name y year consistentes
create or replace function public.sync_document_derived_fields()
returns trigger
language plpgsql
as $$
declare
  v_cat_name text;
begin
  if new.category_id is not null then
    select name into v_cat_name from public.categories where id = new.category_id;
    if v_cat_name is not null then
      new.category_name := v_cat_name;
    end if;
  end if;

  if new.year is null and new.publication_date is not null then
    new.year := extract(year from new.publication_date)::integer;
  end if;

  if coalesce(trim(new.name), '') = '' then
    new.name := new.title;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_documents_derived on public.documents;
create trigger trg_documents_derived
  before insert or update on public.documents
  for each row execute function public.sync_document_derived_fields();

alter table public.documents enable row level security;

drop policy if exists "Anon reads public authorized documents" on public.documents;
create policy "Anon reads public authorized documents"
  on public.documents for select
  to anon
  using (
    published = true
    and visibility = 'public'
    and sync_status <> 'deleted'
  );

drop policy if exists "Authenticated reads authorized documents" on public.documents;
create policy "Authenticated reads authorized documents"
  on public.documents for select
  to authenticated
  using (
    public.is_admin()
    or (
      published = true
      and visibility in ('public', 'registered')
      and sync_status <> 'deleted'
    )
  );

drop policy if exists "Admins manage documents" on public.documents;
create policy "Admins manage documents"
  on public.documents for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Migración no destructiva de registros previos de public.books -> public.documents
insert into public.documents (
  name,
  title,
  author,
  publisher,
  year,
  added_at,
  category_id,
  category_name,
  description,
  document_type,
  page_count,
  language,
  isbn,
  source,
  keywords,
  color,
  cover_url,
  source_type,
  external_url,
  file_path,
  size_label,
  visibility,
  published,
  featured,
  sync_status,
  downloads_count,
  legacy_book_id,
  created_at,
  updated_at
)
select
  b.title,
  b.title,
  b.author,
  b.publisher,
  b.year,
  coalesce(b.created_at, now()),
  coalesce(
    (select id from public.categories where slug =
      case
        when lower(b.category) like '%legislaci%' or lower(b.category) like '%código%' or lower(b.category) like '%codigo%' then 'legislacion-dominicana'
        when lower(b.category) like '%jurisprud%' then 'jurisprudencia'
        when lower(b.category) like '%doctrina%' or lower(b.category) like '%procesal%' or lower(b.category) like '%penal%' or lower(b.category) like '%constitucional%' or lower(b.category) like '%probatorio%' then 'doctrina'
        when lower(b.category) like '%derechos humanos%' then 'derecho-comparado'
        else 'otras-lecturas'
      end
      limit 1
    ),
    b.category_id
  ),
  b.category,
  coalesce(b.description, ''),
  case
    when b.document_type in ('libro', 'codigo', 'ley', 'jurisprudencia', 'sentencia', 'doctrina', 'articulo', 'curso', 'guia', 'manual', 'otro')
      then b.document_type
    else 'libro'
  end,
  b.pages,
  coalesce(b.language, 'Español'),
  b.isbn,
  b.source,
  coalesce(b.keywords, '{}'),
  coalesce(b.color, '#101D35'),
  b.cover_url,
  case
    when b.file_path is not null then 'legacy_storage'
    when b.file_url like '/%' then 'local'
    else 'external_url'
  end,
  b.file_url,
  b.file_path,
  coalesce(b.size_label, 'PDF'),
  case when coalesce(b.is_private, false) then 'registered' else 'public' end,
  coalesce(b.published, false),
  coalesce(b.featured, false),
  'manual',
  coalesce(b.downloads, 0),
  b.id,
  coalesce(b.created_at, now()),
  coalesce(b.updated_at, now())
from public.books b
on conflict (legacy_book_id) do nothing;

-- -----------------------------------------------------------------------------
-- 5. Favoritos de documentos (document_favorites) + backfill desde favorites
-- -----------------------------------------------------------------------------
create table if not exists public.document_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, document_id)
);

create index if not exists idx_document_favorites_user on public.document_favorites (user_id, created_at desc);
create index if not exists idx_document_favorites_document on public.document_favorites (document_id);

alter table public.document_favorites enable row level security;

drop policy if exists "Users manage own document favorites" on public.document_favorites;
create policy "Users manage own document favorites"
  on public.document_favorites for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.document_favorites (user_id, document_id, created_at)
select f.user_id, d.id, f.created_at
from public.favorites f
join public.documents d on d.legacy_book_id = f.book_id
on conflict (user_id, document_id) do nothing;

-- -----------------------------------------------------------------------------
-- 6. Documentos recientes (recent_documents)
-- -----------------------------------------------------------------------------
create table if not exists public.recent_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  last_page integer not null default 1 check (last_page >= 1),
  view_count integer not null default 1 check (view_count >= 1),
  unique (user_id, document_id)
);

create index if not exists idx_recent_documents_user on public.recent_documents (user_id, last_viewed_at desc);
create index if not exists idx_recent_documents_document on public.recent_documents (document_id);

alter table public.recent_documents enable row level security;

drop policy if exists "Users manage own recent documents" on public.recent_documents;
create policy "Users manage own recent documents"
  on public.recent_documents for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7. Compatibilidad no destructiva de tablas personales existentes con documents
-- -----------------------------------------------------------------------------
alter table public.user_library
  add column if not exists document_id uuid references public.documents(id) on delete cascade;
alter table public.user_library alter column book_id drop not null;

update public.user_library ul
set document_id = d.id
from public.documents d
where ul.document_id is null and d.legacy_book_id = ul.book_id;

create unique index if not exists idx_user_library_user_document
  on public.user_library (user_id, document_id) where document_id is not null;

alter table public.reading_progress
  add column if not exists document_id uuid references public.documents(id) on delete cascade;
alter table public.reading_progress alter column book_id drop not null;

update public.reading_progress rp
set document_id = d.id
from public.documents d
where rp.document_id is null and d.legacy_book_id = rp.book_id;

create unique index if not exists idx_reading_progress_user_document
  on public.reading_progress (user_id, document_id) where document_id is not null;

alter table public.bookmarks
  add column if not exists document_id uuid references public.documents(id) on delete cascade;
alter table public.bookmarks alter column book_id drop not null;

update public.bookmarks bm
set document_id = d.id
from public.documents d
where bm.document_id is null and d.legacy_book_id = bm.book_id;

create unique index if not exists idx_bookmarks_user_document_page
  on public.bookmarks (user_id, document_id, page_number) where document_id is not null;

alter table public.collection_books
  add column if not exists document_id uuid references public.documents(id) on delete cascade;
alter table public.collection_books alter column book_id drop not null;

update public.collection_books cb
set document_id = d.id
from public.documents d
where cb.document_id is null and d.legacy_book_id = cb.book_id;

create unique index if not exists idx_collection_books_col_document
  on public.collection_books (collection_id, document_id) where document_id is not null;

-- -----------------------------------------------------------------------------
-- 8. Conexiones Google Drive y estados OAuth (tokens cifrados, solo service_role)
-- -----------------------------------------------------------------------------
create table if not exists public.google_drive_connections (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  google_user_id text,
  google_email text not null,
  google_display_name text,
  google_avatar_url text,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected'
    check (status in ('connected', 'expired', 'needs_reauth', 'disconnected', 'error')),
  is_active boolean not null default true,
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gdrive_connections_active
  on public.google_drive_connections (is_active, updated_at desc);

alter table public.google_drive_connections enable row level security;

-- Sin políticas de cliente: ningún rol anon/authenticated puede leer tokens cifrados directamente.
drop trigger if exists trg_gdrive_connections_updated_at on public.google_drive_connections;
create trigger trg_gdrive_connections_updated_at
  before update on public.google_drive_connections
  for each row execute function public.set_updated_at();

create table if not exists public.google_drive_oauth_states (
  state_token text primary key,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  redirect_after text not null default '/admin/google-drive',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_gdrive_oauth_states_expires
  on public.google_drive_oauth_states (expires_at);

alter table public.google_drive_oauth_states enable row level security;
-- Solo service_role opera sobre esta tabla.

-- -----------------------------------------------------------------------------
-- 9. Estado de sincronización con Google Drive (drive_sync_state)
-- -----------------------------------------------------------------------------
create table if not exists public.drive_sync_state (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references public.google_drive_connections(id) on delete cascade,
  start_page_token text,
  tracked_roots jsonb not null default '[]'::jsonb,
  status text not null default 'idle'
    check (status in ('idle', 'running', 'success', 'partial_error', 'error')),
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  files_added integer not null default 0,
  files_updated integer not null default 0,
  files_removed integer not null default 0,
  last_error text,
  recent_errors jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.drive_sync_state enable row level security;

drop policy if exists "Admins read drive sync state" on public.drive_sync_state;
create policy "Admins read drive sync state"
  on public.drive_sync_state for select
  to authenticated
  using (public.is_admin());

drop trigger if exists trg_drive_sync_state_updated_at on public.drive_sync_state;
create trigger trg_drive_sync_state_updated_at
  before update on public.drive_sync_state
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. Eventos de descarga (download_events)
-- -----------------------------------------------------------------------------
create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  channel text not null default 'proxy_download'
    check (channel in ('proxy_download', 'direct_download', 'preview_open')),
  created_at timestamptz not null default now()
);

create index if not exists idx_download_events_document on public.download_events (document_id, created_at desc);
create index if not exists idx_download_events_user on public.download_events (user_id, created_at desc);

alter table public.download_events enable row level security;

drop policy if exists "Users read own download events" on public.download_events;
create policy "Users read own download events"
  on public.download_events for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- -----------------------------------------------------------------------------
-- 11. RPCs seguras para operación del catálogo, recientes, descargas y admin
-- -----------------------------------------------------------------------------

-- Registrar visualización reciente de un usuario autenticado
create or replace function public.record_recent_document(
  p_document_id uuid,
  p_last_page integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  if not exists (
    select 1
    from public.documents d
    where d.id = p_document_id
      and (
        public.is_admin()
        or (d.published = true and d.visibility in ('public', 'registered') and d.sync_status <> 'deleted')
      )
  ) then
    return;
  end if;

  insert into public.recent_documents (user_id, document_id, last_viewed_at, last_page, view_count)
  values (v_uid, p_document_id, now(), greatest(1, coalesce(p_last_page, 1)), 1)
  on conflict (user_id, document_id)
  do update set
    last_viewed_at = now(),
    last_page = greatest(1, coalesce(excluded.last_page, public.recent_documents.last_page)),
    view_count = public.recent_documents.view_count + 1;
end;
$$;

grant execute on function public.record_recent_document(uuid, integer) to authenticated;

-- Registrar descarga autorizada de forma atómica
create or replace function public.record_document_download(
  p_document_id uuid,
  p_channel text default 'direct_download'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_doc public.documents%rowtype;
begin
  select * into v_doc from public.documents where id = p_document_id;
  if not found then
    return;
  end if;

  if not public.is_admin() then
    if not v_doc.published or v_doc.sync_status = 'deleted' or not v_doc.allow_download then
      raise exception 'Descarga no autorizada para este documento.' using errcode = '42501';
    end if;
    if v_doc.visibility = 'admin_only' then
      raise exception 'Acceso restringido.' using errcode = '42501';
    end if;
    if v_doc.visibility = 'registered' and v_uid is null then
      raise exception 'Inicia sesión para descargar este documento.' using errcode = '42501';
    end if;
  end if;

  insert into public.download_events (document_id, user_id, channel)
  values (
    p_document_id,
    v_uid,
    case when p_channel in ('proxy_download', 'direct_download', 'preview_open') then p_channel else 'direct_download' end
  );

  update public.documents
  set downloads_count = coalesce(downloads_count, 0) + 1
  where id = p_document_id;
end;
$$;

grant execute on function public.record_document_download(uuid, text) to anon, authenticated;

-- Resumen seguro de conexión Google Drive para administradores (jamás expone tokens)
create or replace function public.get_drive_connection_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conn record;
  v_sync record;
begin
  if not public.is_admin() then
    raise exception 'Acceso exclusivo de administradores.' using errcode = '42501';
  end if;

  select
    id,
    google_email,
    google_display_name,
    google_avatar_url,
    scopes,
    status,
    token_expires_at,
    last_error,
    connected_at,
    updated_at
  into v_conn
  from public.google_drive_connections
  where is_active = true
  order by updated_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'connected', false,
      'connection', null,
      'sync_state', null
    );
  end if;

  select
    id,
    status,
    start_page_token is not null as has_change_token,
    tracked_roots,
    last_sync_at,
    last_successful_sync_at,
    files_added,
    files_updated,
    files_removed,
    last_error,
    recent_errors,
    updated_at
  into v_sync
  from public.drive_sync_state
  where connection_id = v_conn.id;

  return jsonb_build_object(
    'connected', v_conn.status in ('connected', 'expired'),
    'connection', jsonb_build_object(
      'id', v_conn.id,
      'google_email', v_conn.google_email,
      'google_display_name', v_conn.google_display_name,
      'google_avatar_url', v_conn.google_avatar_url,
      'scopes', v_conn.scopes,
      'status', v_conn.status,
      'token_expires_at', v_conn.token_expires_at,
      'last_error', v_conn.last_error,
      'connected_at', v_conn.connected_at,
      'updated_at', v_conn.updated_at
    ),
    'sync_state', case when v_sync.id is not null then to_jsonb(v_sync) else null end
  );
end;
$$;

grant execute on function public.get_drive_connection_summary() to authenticated;

-- Estadísticas consolidadas del Dashboard Administrativo
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_documents bigint;
  v_total_books bigint;
  v_total_laws bigint;
  v_total_judgments bigint;
  v_total_categories bigint;
  v_total_folders bigint;
  v_total_downloads bigint;
  v_drive_linked bigint;
begin
  if not public.is_admin() then
    raise exception 'Acceso exclusivo de administradores.' using errcode = '42501';
  end if;

  select
    count(*) filter (where sync_status <> 'deleted'),
    count(*) filter (where sync_status <> 'deleted' and document_type in ('libro', 'manual', 'doctrina')),
    count(*) filter (where sync_status <> 'deleted' and document_type in ('ley', 'codigo')),
    count(*) filter (where sync_status <> 'deleted' and document_type in ('jurisprudencia', 'sentencia')),
    coalesce(sum(downloads_count), 0),
    count(*) filter (where sync_status <> 'deleted' and drive_file_id is not null)
  into
    v_total_documents,
    v_total_books,
    v_total_laws,
    v_total_judgments,
    v_total_downloads,
    v_drive_linked
  from public.documents;

  select count(*) into v_total_categories from public.categories where is_active = true;
  select count(*) into v_total_folders from public.folders;

  return jsonb_build_object(
    'total_documents', v_total_documents,
    'total_books', v_total_books,
    'total_laws', v_total_laws,
    'total_judgments', v_total_judgments,
    'total_categories', v_total_categories,
    'total_folders', v_total_folders,
    'total_downloads', v_total_downloads,
    'drive_linked_documents', v_drive_linked,
    'drive_summary', public.get_drive_connection_summary()
  );
end;
$$;

grant execute on function public.get_admin_dashboard_stats() to authenticated;

-- -----------------------------------------------------------------------------
-- 12. Permisos explícitos de esquema y tablas (necesarios en proyectos nuevos
--     de Supabase junto a las políticas RLS). Nunca se otorga acceso directo a
--     google_drive_connections ni google_drive_oauth_states (solo service_role).
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- Lectura pública controlada por RLS
grant select on table
  public.categories,
  public.folders,
  public.documents,
  public.books
to anon, authenticated;

-- Operaciones autenticadas controladas por RLS (propietario o admin)
grant insert, update, delete on table
  public.categories,
  public.folders,
  public.documents,
  public.books
to authenticated;

grant select, insert, update, delete on table
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

revoke all on table
  public.google_drive_connections,
  public.google_drive_oauth_states
from anon, authenticated;
