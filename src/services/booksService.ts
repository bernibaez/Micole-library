import { DEFAULT_CATEGORIES, DEFAULT_FOLDERS, DEMO_BOOKS } from '../lib/demoData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { buildDriveProxyRequest } from './driveService';
import type {
  Book,
  CategoryInfo,
  DocumentSourceType,
  DocumentSyncStatus,
  DocumentType,
  DocumentVisibility,
  LibraryFolder,
  ValidityStatus,
} from '../types';

export function normalizeDocumentRow(row: Record<string, unknown>): Book {
  const driveFileId = row.drive_file_id ? String(row.drive_file_id) : null;
  const externalUrl = row.external_url
    ? String(row.external_url)
    : row.file_url
      ? String(row.file_url)
      : null;

  return {
    id: String(row.id),
    name: row.name ? String(row.name) : String(row.title ?? 'Sin título'),
    title: String(row.title ?? row.name ?? 'Sin título'),
    author: String(row.author ?? 'Autor no especificado'),
    year: typeof row.year === 'number' ? row.year : null,
    publication_date: row.publication_date ? String(row.publication_date) : null,
    added_at: row.added_at
      ? String(row.added_at)
      : row.created_at
        ? String(row.created_at)
        : undefined,
    subject: row.subject ? String(row.subject) : null,
    category: String(row.category_name ?? row.category ?? 'Otras lecturas'),
    category_id: row.category_id ? String(row.category_id) : null,
    subcategory_id: row.subcategory_id ? String(row.subcategory_id) : null,
    folder_id: row.folder_id ? String(row.folder_id) : null,
    document_type: (row.document_type as DocumentType) ?? 'libro',
    description: String(row.description ?? ''),
    color: String(row.color ?? '#101D35'),
    file_url: driveFileId ? `drive://${driveFileId}` : externalUrl,
    file_path: row.file_path ? String(row.file_path) : null,
    cover_url: row.cover_url ? String(row.cover_url) : null,
    size_label: String(row.size_label ?? 'PDF'),
    downloads: Number(row.downloads_count ?? row.downloads ?? 0),
    published: Boolean(row.published ?? true),
    publisher: row.publisher ? String(row.publisher) : null,
    isbn: row.isbn ? String(row.isbn) : null,
    pages:
      typeof row.page_count === 'number'
        ? row.page_count
        : typeof row.pages === 'number'
          ? row.pages
          : null,
    language: row.language ? String(row.language) : 'Español',
    source: row.source ? String(row.source) : null,
    validity_status: (row.validity_status as ValidityStatus) ?? 'no_aplica',
    country: row.country ? String(row.country) : 'República Dominicana',
    court: row.court ? String(row.court) : null,
    judgment_number: row.judgment_number ? String(row.judgment_number) : null,
    source_type:
      (row.source_type as DocumentSourceType) ??
      (driveFileId ? 'google_drive' : 'external_url'),
    drive_file_id: driveFileId,
    drive_folder_id: row.drive_folder_id ? String(row.drive_folder_id) : null,
    drive_web_view_link: row.drive_web_view_link ? String(row.drive_web_view_link) : null,
    drive_modified_time: row.drive_modified_time ? String(row.drive_modified_time) : null,
    mime_type: row.mime_type ? String(row.mime_type) : 'application/pdf',
    file_extension: row.file_extension ? String(row.file_extension) : 'pdf',
    file_size_bytes: typeof row.file_size_bytes === 'number' ? row.file_size_bytes : null,
    visibility: (row.visibility as DocumentVisibility) ?? (row.is_private ? 'registered' : 'public'),
    allow_preview: row.allow_preview !== undefined ? Boolean(row.allow_preview) : true,
    allow_download: row.allow_download !== undefined ? Boolean(row.allow_download) : true,
    sync_status: (row.sync_status as DocumentSyncStatus) ?? 'manual',
    last_synced_at: row.last_synced_at ? String(row.last_synced_at) : null,
    is_private: row.visibility === 'registered' || Boolean(row.is_private ?? false),
    featured: Boolean(row.featured ?? false),
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function fetchBooks(signal?: AbortSignal): Promise<Book[]> {
  if (!isSupabaseConfigured || !supabase) {
    return DEMO_BOOKS;
  }

  let docsQuery = supabase
    .from('documents')
    .select('*')
    .neq('sync_status', 'deleted')
    .order('added_at', { ascending: false });

  if (signal) {
    docsQuery = docsQuery.abortSignal(signal);
  }

  const docsRes = await docsQuery;
  if (!docsRes.error) {
    return (docsRes.data ?? []).map((row) =>
      normalizeDocumentRow(row as Record<string, unknown>)
    );
  }

  // Fallback no destructivo si aún no se ejecutó la migración 002
  let legacyQuery = supabase
    .from('books')
    .select('*')
    .eq('published', true)
    .order('year', { ascending: false });
  if (signal) legacyQuery = legacyQuery.abortSignal(signal);

  const legacyRes = await legacyQuery;
  if (legacyRes.error) throw legacyRes.error;
  return (legacyRes.data ?? []).map((row) =>
    normalizeDocumentRow(row as Record<string, unknown>)
  );
}

export async function fetchBookById(id: string, signal?: AbortSignal): Promise<Book | null> {
  if (!isSupabaseConfigured || !supabase) {
    return DEMO_BOOKS.find((b) => b.id === id) ?? null;
  }

  let docQuery = supabase.from('documents').select('*').eq('id', id);
  if (signal) docQuery = docQuery.abortSignal(signal);
  const docRes = await docQuery.maybeSingle();

  if (!docRes.error) {
    return docRes.data ? normalizeDocumentRow(docRes.data as Record<string, unknown>) : null;
  }

  let legacyQuery = supabase.from('books').select('*').eq('id', id).eq('published', true);
  if (signal) legacyQuery = legacyQuery.abortSignal(signal);
  const legacyRes = await legacyQuery.maybeSingle();
  if (legacyRes.error) throw legacyRes.error;
  return legacyRes.data ? normalizeDocumentRow(legacyRes.data as Record<string, unknown>) : null;
}

export async function fetchCategories(signal?: AbortSignal): Promise<CategoryInfo[]> {
  if (!isSupabaseConfigured || !supabase) {
    return DEFAULT_CATEGORIES;
  }

  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return DEFAULT_CATEGORIES;
  }
  return (data as CategoryInfo[]).filter((c) => c.is_active !== false);
}

export async function fetchFolders(signal?: AbortSignal): Promise<LibraryFolder[]> {
  if (!isSupabaseConfigured || !supabase) {
    return DEFAULT_FOLDERS;
  }

  let query = supabase
    .from('folders')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }
  return data as LibraryFolder[];
}

export type ResolvedDocumentSource =
  | { kind: 'proxy'; url: string; httpHeaders: Record<string, string> }
  | { kind: 'direct'; url: string }
  | null;

export async function resolveDocumentSource(
  book: Book,
  mode: 'view' | 'download' = 'view'
): Promise<ResolvedDocumentSource> {
  if (book.drive_file_id && isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    const proxy = buildDriveProxyRequest(book.id, mode, data.session?.access_token);
    if (proxy) {
      return { kind: 'proxy', url: proxy.url, httpHeaders: proxy.headers };
    }
  }

  if (book.is_private && book.file_path && supabase) {
    const { data, error } = await supabase.storage
      .from('private-documents')
      .createSignedUrl(book.file_path, 3600);
    if (!error && data?.signedUrl) {
      return { kind: 'direct', url: data.signedUrl };
    }
  }

  if (book.file_url && !book.file_url.startsWith('drive://')) {
    return { kind: 'direct', url: book.file_url };
  }

  return null;
}

export async function resolveBookFileUrl(book: Book): Promise<string | null> {
  const source = await resolveDocumentSource(book, 'view');
  return source ? source.url : null;
}

export async function incrementBookDownloads(bookId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { error } = await supabase.rpc('record_document_download', {
      p_document_id: bookId,
      p_channel: 'direct_download',
    });
    if (error) {
      await supabase.rpc('increment_book_downloads', { p_book_id: bookId });
    }
  } catch {
    // Non-blocking telemetry
  }
}
