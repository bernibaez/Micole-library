-- =============================================================================
-- MICOLE LIBRARY — Migración 004: Iconos personalizados en colecciones
-- No destructiva e idempotente. Conserva RLS existente en public.collections.
-- =============================================================================

alter table public.collections
  add column if not exists icon text not null default 'folder';
