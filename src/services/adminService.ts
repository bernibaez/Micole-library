import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { slugify } from '../utils/format';
import type {
  AdminDashboardStats,
  Book,
  CategoryInfo,
  DocumentType,
  DocumentVisibility,
  LibraryFolder,
  ValidityStatus,
} from '../types';
import { normalizeDocumentRow } from './booksService';

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw error;
  return data as AdminDashboardStats;
}

export async function fetchAdminDocuments(): Promise<Book[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeDocumentRow(row as Record<string, unknown>));
}

export interface UpsertDocumentInput {
  id?: string;
  name?: string;
  title: string;
  author: string;
  publisher?: string | null;
  publication_date?: string | null;
  year?: number | null;
  subject?: string | null;
  category_id: string | null;
  subcategory_id?: string | null;
  folder_id?: string | null;
  description?: string;
  document_type: DocumentType;
  page_count?: number | null;
  validity_status: ValidityStatus;
  country?: string;
  court?: string | null;
  judgment_number?: string | null;
  language?: string;
  isbn?: string | null;
  source?: string | null;
  keywords?: string[];
  color?: string;
  cover_url?: string | null;
  external_url?: string | null;
  drive_file_id?: string | null;
  visibility: DocumentVisibility;
  published: boolean;
  featured?: boolean;
  allow_preview: boolean;
  allow_download: boolean;
}

export async function saveAdminDocument(input: UpsertDocumentInput): Promise<Book> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para crear o editar documentos.');
  }

  const payload = {
    name: (input.name?.trim() || input.title.trim()),
    title: input.title.trim(),
    author: input.author.trim() || 'Autor no especificado',
    publisher: input.publisher?.trim() || null,
    publication_date: input.publication_date || null,
    year: input.year ?? (input.publication_date ? Number(input.publication_date.slice(0, 4)) : null),
    subject: input.subject?.trim() || null,
    category_id: input.category_id || null,
    subcategory_id: input.subcategory_id || null,
    folder_id: input.folder_id || null,
    description: input.description?.trim() ?? '',
    document_type: input.document_type,
    page_count: input.page_count ?? null,
    validity_status: input.validity_status,
    country: input.country?.trim() || 'República Dominicana',
    court: input.court?.trim() || null,
    judgment_number: input.judgment_number?.trim() || null,
    language: input.language?.trim() || 'Español',
    isbn: input.isbn?.trim() || null,
    source: input.source?.trim() || null,
    keywords: input.keywords ?? [],
    color: input.color || '#101D35',
    cover_url: input.cover_url?.trim() || null,
    external_url: input.external_url?.trim() || null,
    visibility: input.visibility,
    published: input.published,
    featured: Boolean(input.featured),
    allow_preview: input.allow_preview,
    allow_download: input.allow_download,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('documents')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw error;
    return normalizeDocumentRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      ...payload,
      source_type: input.drive_file_id ? 'google_drive' : 'external_url',
      drive_file_id: input.drive_file_id?.trim() || null,
      sync_status: input.drive_file_id ? 'pending' : 'manual',
    })
    .select('*')
    .single();
  if (error) throw error;
  return normalizeDocumentRow(data as Record<string, unknown>);
}

// Elimina únicamente el registro en Supabase. Nunca elimina el archivo original en Google Drive.
export async function deleteAdminDocument(documentId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para eliminar registros.');
  }
  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  if (error) throw error;
}

// Eliminación masiva por lotes en Supabase. Nunca modifica ni elimina archivos en Google Drive.
export async function deleteAdminDocuments(documentIds: string[]): Promise<number> {
  const uniqueIds = Array.from(new Set(documentIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para eliminar registros.');
  }

  const chunkSize = 100;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const { error } = await supabase.from('documents').delete().in('id', chunk);
    if (error) throw error;
  }
  return uniqueIds.length;
}

// Restaura la portada editorial jurídica (elimina cover_url) para los documentos indicados.
export async function clearAdminDocumentCovers(documentIds: string[]): Promise<number> {
  const uniqueIds = Array.from(new Set(documentIds.filter(Boolean)));
  if (uniqueIds.length === 0) return 0;
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para actualizar portadas.');
  }

  const chunkSize = 100;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('documents')
      .update({ cover_url: null })
      .in('id', chunk);
    if (error) throw error;
  }
  return uniqueIds.length;
}

export async function moveAdminDocument(
  documentId: string,
  target: { category_id: string | null; subcategory_id: string | null; folder_id: string | null }
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para mover documentos.');
  }
  const { error } = await supabase.from('documents').update(target).eq('id', documentId);
  if (error) throw error;
}

export async function assignDocumentsToFolder(
  documentIds: string[],
  target: { folder_id: string; category_id?: string | null; subcategory_id?: string | null }
): Promise<void> {
  if (documentIds.length === 0) return;
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para asignar documentos a carpetas.');
  }
  const patch: Record<string, string | null> = {
    folder_id: target.folder_id,
  };
  if (target.category_id) {
    patch.category_id = target.category_id;
    patch.subcategory_id = target.subcategory_id ?? null;
  }
  const { error } = await supabase.from('documents').update(patch).in('id', documentIds);
  if (error) throw error;
}

export async function removeDocumentFromFolder(documentId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para quitar documentos de una carpeta.');
  }
  const { error } = await supabase
    .from('documents')
    .update({ folder_id: null })
    .eq('id', documentId);
  if (error) throw error;
}

export async function saveAdminCategory(input: {
  id?: string;
  name: string;
  description: string;
  icon: string;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<CategoryInfo> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para administrar categorías.');
  }
  const slug = slugify(input.name) || `categoria-${Date.now()}`;
  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    icon: input.icon || 'scale',
    parent_id: input.parent_id || null,
    sort_order: input.sort_order ?? 10,
    is_active: input.is_active ?? true,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as CategoryInfo;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ ...payload, slug, is_system: false })
    .select('*')
    .single();
  if (error) throw error;
  return data as CategoryInfo;
}

export async function deleteAdminCategory(categoryId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para eliminar categorías.');
  }
  // Desasociar subcategorías hijas primero para evitar conflictos de clave foránea
  await supabase
    .from('categories')
    .update({ parent_id: null })
    .eq('parent_id', categoryId);

  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw error;
}

export async function saveAdminFolder(input: {
  id?: string;
  name: string;
  description?: string;
  category_id: string | null;
  subcategory_id?: string | null;
  parent_id?: string | null;
  published?: boolean;
}): Promise<LibraryFolder> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para administrar carpetas.');
  }
  const payload = {
    name: input.name.trim(),
    slug: slugify(input.name) || `carpeta-${Date.now()}`,
    description: input.description?.trim() ?? '',
    category_id: input.category_id || null,
    subcategory_id: input.subcategory_id || null,
    parent_id: input.parent_id || null,
    published: input.published ?? true,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('folders')
      .update(payload)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as LibraryFolder;
  }

  const { data, error } = await supabase
    .from('folders')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as LibraryFolder;
}

export async function deleteAdminFolder(folderId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura Supabase para eliminar carpetas.');
  }
  const { error } = await supabase.from('folders').delete().eq('id', folderId);
  if (error) throw error;
}
