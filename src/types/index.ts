export type DocumentType =
  | 'libro'
  | 'codigo'
  | 'ley'
  | 'jurisprudencia'
  | 'sentencia'
  | 'doctrina'
  | 'articulo'
  | 'curso'
  | 'guia'
  | 'manual'
  | 'otro';

export type ValidityStatus =
  | 'vigente'
  | 'derogada'
  | 'reformada'
  | 'historica'
  | 'borrador'
  | 'no_aplica';

export type DocumentVisibility = 'public' | 'registered' | 'admin_only';

export type DocumentSourceType = 'google_drive' | 'external_url' | 'local' | 'legacy_storage';

export type DocumentSyncStatus =
  | 'synced'
  | 'pending'
  | 'modified'
  | 'missing'
  | 'deleted'
  | 'error'
  | 'manual';

export type UserRole = 'admin' | 'visitor';

export interface Book {
  id: string;
  name?: string;
  title: string;
  author: string;
  year: number | null;
  publication_date?: string | null;
  added_at?: string;
  subject?: string | null;
  category: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  subcategory_name?: string | null;
  folder_id?: string | null;
  document_type: DocumentType;
  description: string;
  color: string;
  file_url: string | null;
  file_path?: string | null;
  cover_url: string | null;
  size_label: string;
  downloads: number;
  published?: boolean;
  publisher?: string | null;
  isbn?: string | null;
  pages?: number | null;
  language?: string | null;
  source?: string | null;
  validity_status?: ValidityStatus;
  country?: string | null;
  court?: string | null;
  judgment_number?: string | null;
  source_type?: DocumentSourceType;
  drive_file_id?: string | null;
  drive_folder_id?: string | null;
  drive_web_view_link?: string | null;
  drive_modified_time?: string | null;
  mime_type?: string | null;
  file_extension?: string | null;
  file_size_bytes?: number | null;
  visibility?: DocumentVisibility;
  allow_preview?: boolean;
  allow_download?: boolean;
  sync_status?: DocumentSyncStatus;
  last_synced_at?: string | null;
  is_private?: boolean;
  featured?: boolean;
  keywords?: string[];
  created_at?: string;
  updated_at?: string;
}

export type LegalDocument = Book;

export interface CategoryInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  parent_id?: string | null;
  is_system?: boolean;
  is_active?: boolean;
}

export interface LibraryFolder {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  subcategory_id: string | null;
  parent_id: string | null;
  drive_folder_id: string | null;
  drive_parent_id: string | null;
  drive_web_view_link: string | null;
  is_drive_root: boolean;
  sort_order: number;
  published: boolean;
  created_at?: string;
  updated_at?: string;
}

export type UserType = 'estudiante' | 'profesor' | 'investigador';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  institution: string | null;
  career: string | null;
  user_type: UserType;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at?: string;
}

export type LibraryStatus = 'pending' | 'reading' | 'completed';

export interface UserLibraryItem {
  id: string;
  user_id: string;
  book_id: string;
  status: LibraryStatus;
  added_at: string;
  updated_at: string;
}

export interface FavoriteItem {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string;
}

export interface RecentDocumentItem {
  id: string;
  user_id?: string | null;
  document_id: string;
  last_viewed_at: string;
  last_page: number;
  view_count: number;
}

export interface ReadingProgress {
  id: string;
  user_id: string;
  book_id: string;
  current_page: number;
  total_pages: number | null;
  progress_percent: number;
  last_read_at: string;
  completed_at: string | null;
}

export interface ReadingHistoryItem {
  id: string;
  user_id: string;
  book_id: string;
  opened_at: string;
  last_page: number;
}

export interface BookmarkItem {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  label: string | null;
  note: string | null;
  created_at: string;
}

export interface DownloadRecord {
  id: string;
  user_id: string;
  book_id: string;
  downloaded_at: string;
}

export interface UserCollection {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  icon?: string;
  created_at: string;
  book_ids: string[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'info' | 'new_book' | 'reading' | 'system';
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export type ReaderTheme = 'light' | 'dark' | 'sepia';
export type ReaderFitMode = 'width' | 'page' | 'custom';

export interface UserPreferences {
  user_id: string;
  reader_theme: ReaderTheme;
  reader_zoom: number;
  reader_fit_mode: ReaderFitMode;
  reduce_motion: boolean;
  email_notifications: boolean;
  catalog_view: 'grid' | 'list';
}

export interface CatalogFilters {
  q: string;
  category: string;
  subcategory: string;
  folder: string;
  author: string;
  year: string;
  type: string;
  validity: string;
  subject: string;
  sort: 'relevance' | 'recent' | 'popular' | 'title';
}

export interface DriveConnectionInfo {
  id: string;
  google_email: string;
  google_display_name: string | null;
  google_avatar_url: string | null;
  scopes: string[];
  status: 'connected' | 'expired' | 'needs_reauth' | 'disconnected' | 'error';
  token_expires_at: string | null;
  last_error: string | null;
  connected_at: string;
  updated_at: string;
}

export interface TrackedDriveRoot {
  driveFolderId: string;
  folderId: string;
  categoryId: string | null;
  subcategoryId: string | null;
  name: string;
}

export interface DriveSyncErrorEntry {
  at: string;
  fileId?: string;
  name?: string;
  message: string;
}

export interface DriveSyncStateInfo {
  id: string;
  status: 'idle' | 'running' | 'success' | 'partial_error' | 'error';
  has_change_token: boolean;
  tracked_roots: TrackedDriveRoot[];
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  files_added: number;
  files_updated: number;
  files_removed: number;
  last_error: string | null;
  recent_errors: DriveSyncErrorEntry[];
  updated_at: string;
}

export interface DriveConnectionSummary {
  connected: boolean;
  connection: DriveConnectionInfo | null;
  sync_state: DriveSyncStateInfo | null;
}

export interface AdminDashboardStats {
  total_documents: number;
  total_books: number;
  total_laws: number;
  total_judgments: number;
  total_categories: number;
  total_folders: number;
  total_downloads: number;
  drive_linked_documents: number;
  drive_summary: DriveConnectionSummary;
}
