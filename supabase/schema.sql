create table if not exists public.books (
 id uuid primary key default gen_random_uuid(), title text not null, author text not null, year integer not null, category text not null, description text not null default '', color text not null default '#101D35', file_url text, cover_url text, size_label text not null default 'PDF', downloads integer not null default 0, published boolean not null default false
);
alter table public.books enable row level security;
create policy "Public reads published books" on public.books for select to anon, authenticated using (published);
insert into storage.buckets (id,name,public) values ('documents','documents',true),('covers','covers',true) on conflict (id) do nothing;
-- Public buckets: upload only documents authorized for public distribution.
-- No public write policies: manage uploads and book records from the Supabase dashboard.
