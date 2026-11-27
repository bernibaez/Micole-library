import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  BookmarkItem,
  DownloadRecord,
  FavoriteItem,
  LibraryStatus,
  ReadingHistoryItem,
  ReadingProgress,
  RecentDocumentItem,
  UserCollection,
  UserLibraryItem,
} from '../types';

export interface PersonalLibrarySnapshot {
  library: UserLibraryItem[];
  favorites: FavoriteItem[];
  recents: RecentDocumentItem[];
  progress: ReadingProgress[];
  history: ReadingHistoryItem[];
  bookmarks: BookmarkItem[];
  downloads: DownloadRecord[];
  collections: UserCollection[];
}

const LOCAL_KEY_PREFIX = 'lexlibrary:v2:personal:';
const DISMISSED_DOWNLOADS_PREFIX = 'lexlibrary:v2:dismissed-downloads:';
const COLLECTION_ICONS_PREFIX = 'lexlibrary:v2:collection-icons:';
const GUEST_FAVORITES_KEY = 'lexlibrary:v2:guest:favorites';
const GUEST_RECENTS_KEY = 'lexlibrary:v2:guest:recents';

function readCollectionIconsMap(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${COLLECTION_ICONS_PREFIX}${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveCollectionIconLocal(userId: string, collectionId: string, icon: string): void {
  const map = readCollectionIconsMap(userId);
  map[collectionId] = icon;
  try {
    localStorage.setItem(`${COLLECTION_ICONS_PREFIX}${userId}`, JSON.stringify(map));
  } catch {
    // ignore storage quota
  }
}

function removeCollectionIconLocal(userId: string, collectionId: string): void {
  const map = readCollectionIconsMap(userId);
  if (!(collectionId in map)) return;
  delete map[collectionId];
  try {
    localStorage.setItem(`${COLLECTION_ICONS_PREFIX}${userId}`, JSON.stringify(map));
  } catch {
    // ignore storage quota
  }
}

function readDismissedDownloadIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${DISMISSED_DOWNLOADS_PREFIX}${userId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function addDismissedDownloadIds(userId: string, ids: string[]): void {
  const current = readDismissedDownloadIds(userId);
  ids.forEach((id) => current.add(id));
  try {
    localStorage.setItem(`${DISMISSED_DOWNLOADS_PREFIX}${userId}`, JSON.stringify(Array.from(current)));
  } catch {
    // ignore storage quota
  }
}

export function readGuestFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

export function toggleGuestFavorite(documentId: string): boolean {
  const current = readGuestFavorites();
  const exists = current.some((f) => f.book_id === documentId);
  const next = exists
    ? current.filter((f) => f.book_id !== documentId)
    : [
        {
          id: `guest-fav-${documentId}`,
          user_id: 'guest',
          book_id: documentId,
          created_at: new Date().toISOString(),
        },
        ...current,
      ];
  try {
    localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota
  }
  return !exists;
}

export function readGuestRecents(): RecentDocumentItem[] {
  try {
    const raw = localStorage.getItem(GUEST_RECENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as RecentDocumentItem[]) : [];
  } catch {
    return [];
  }
}

export function recordGuestRecent(documentId: string, lastPage = 1): RecentDocumentItem[] {
  const current = readGuestRecents();
  const existing = current.find((r) => r.document_id === documentId);
  const now = new Date().toISOString();
  const entry: RecentDocumentItem = {
    id: `guest-rec-${documentId}`,
    user_id: null,
    document_id: documentId,
    last_viewed_at: now,
    last_page: Math.max(1, lastPage),
    view_count: (existing?.view_count ?? 0) + 1,
  };
  const next = [entry, ...current.filter((r) => r.document_id !== documentId)].slice(0, 40);
  try {
    localStorage.setItem(GUEST_RECENTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota
  }
  return next;
}

function readLocalSnapshot(userId: string): PersonalLibrarySnapshot {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersonalLibrarySnapshot>;
      return {
        library: parsed.library ?? [],
        favorites: parsed.favorites ?? [],
        recents: parsed.recents ?? [],
        progress: parsed.progress ?? [],
        history: parsed.history ?? [],
        bookmarks: parsed.bookmarks ?? [],
        downloads: parsed.downloads ?? [],
        collections: parsed.collections ?? [],
      };
    }
  } catch {
    // Ignore corrupt local state
  }

  return {
    library: [],
    favorites: [],
    recents: [],
    progress: [],
    history: [],
    bookmarks: [],
    downloads: [],
    collections: [],
  };
}

function writeLocalSnapshot(userId: string, snapshot: PersonalLibrarySnapshot): void {
  try {
    localStorage.setItem(`${LOCAL_KEY_PREFIX}${userId}`, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors
  }
}

function normalizeDocRefId(row: Record<string, unknown>): string {
  return String(row.document_id ?? row.book_id ?? '');
}

export async function fetchPersonalLibrary(userId: string): Promise<PersonalLibrarySnapshot> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    return readLocalSnapshot(userId);
  }

  const [libRes, docFavRes, recentRes, progRes, histRes, bmRes, dlRes, colRes, colBooksRes] =
    await Promise.all([
      supabase
        .from('user_library')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('document_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('recent_documents')
        .select('*')
        .eq('user_id', userId)
        .order('last_viewed_at', { ascending: false })
        .limit(40),
      supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .order('last_read_at', { ascending: false }),
      supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .order('opened_at', { ascending: false })
        .limit(50),
      supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('page_number', { ascending: true }),
      supabase
        .from('download_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('collection_books').select('collection_id, book_id, document_id'),
    ]);

  const colBookMap = new Map<string, string[]>();
  if (!colBooksRes.error && colBooksRes.data) {
    for (const row of colBooksRes.data as Array<Record<string, unknown>>) {
      const colId = String(row.collection_id);
      const docId = normalizeDocRefId(row);
      if (!docId) continue;
      const list = colBookMap.get(colId) ?? [];
      list.push(docId);
      colBookMap.set(colId, list);
    }
  }

  const localIcons = readCollectionIconsMap(userId);
  const collections: UserCollection[] = (
    (colRes.data ?? []) as Array<Omit<UserCollection, 'book_ids'>>
  ).map((col) => ({
    ...col,
    icon: col.icon || localIcons[col.id] || 'folder',
    book_ids: colBookMap.get(col.id) ?? [],
  }));

  // Fallback a tabla legacy `favorites` si `document_favorites` aún no existe
  let favorites: FavoriteItem[];
  if (!docFavRes.error && docFavRes.data) {
    favorites = (docFavRes.data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      book_id: String(row.document_id),
      created_at: String(row.created_at),
    }));
  } else {
    const legacyFav = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    favorites = (legacyFav.data ?? []) as FavoriteItem[];
  }

  const library: UserLibraryItem[] = ((libRes.data ?? []) as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      book_id: normalizeDocRefId(row),
      status: (row.status as LibraryStatus) ?? 'pending',
      added_at: String(row.added_at),
      updated_at: String(row.updated_at),
    })
  );

  const progress: ReadingProgress[] = ((progRes.data ?? []) as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      book_id: normalizeDocRefId(row),
      current_page: Number(row.current_page ?? 1),
      total_pages: typeof row.total_pages === 'number' ? row.total_pages : null,
      progress_percent: Number(row.progress_percent ?? 0),
      last_read_at: String(row.last_read_at),
      completed_at: row.completed_at ? String(row.completed_at) : null,
    })
  );

  const bookmarks: BookmarkItem[] = ((bmRes.data ?? []) as Array<Record<string, unknown>>).map(
    (row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      book_id: normalizeDocRefId(row),
      page_number: Number(row.page_number ?? 1),
      label: row.label ? String(row.label) : null,
      note: row.note ? String(row.note) : null,
      created_at: String(row.created_at),
    })
  );

  const dismissedDownloads = readDismissedDownloadIds(userId);
  const downloads: DownloadRecord[] = !dlRes.error
    ? ((dlRes.data ?? []) as Array<Record<string, unknown>>)
        .map((row) => ({
          id: String(row.id),
          user_id: String(row.user_id ?? userId),
          book_id: String(row.document_id),
          downloaded_at: String(row.created_at),
        }))
        .filter((row) => !dismissedDownloads.has(row.id))
    : [];

  return {
    library,
    favorites,
    recents: !recentRes.error ? ((recentRes.data ?? []) as RecentDocumentItem[]) : [],
    progress,
    history: (histRes.data ?? []) as ReadingHistoryItem[],
    bookmarks,
    downloads,
    collections,
  };
}

export async function toggleLibraryBook(
  userId: string,
  documentId: string,
  currentlyInLibrary: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    const now = new Date().toISOString();
    if (currentlyInLibrary) {
      snap.library = snap.library.filter((item) => item.book_id !== documentId);
    } else {
      snap.library = [
        {
          id: `local-lib-${documentId}`,
          user_id: userId,
          book_id: documentId,
          status: 'pending',
          added_at: now,
          updated_at: now,
        },
        ...snap.library.filter((item) => item.book_id !== documentId),
      ];
    }
    writeLocalSnapshot(userId, snap);
    return !currentlyInLibrary;
  }

  if (currentlyInLibrary) {
    const { error } = await supabase
      .from('user_library')
      .delete()
      .eq('user_id', userId)
      .or(`document_id.eq.${documentId},book_id.eq.${documentId}`);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('user_library')
    .insert({ user_id: userId, document_id: documentId, status: 'pending' });
  if (error && !error.message.includes('duplicate')) throw error;
  return true;
}

export async function updateLibraryStatus(
  userId: string,
  documentId: string,
  status: LibraryStatus
): Promise<void> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    const now = new Date().toISOString();
    const existing = snap.library.find((item) => item.book_id === documentId);
    if (existing) {
      existing.status = status;
      existing.updated_at = now;
    } else {
      snap.library.unshift({
        id: `local-lib-${documentId}`,
        user_id: userId,
        book_id: documentId,
        status,
        added_at: now,
        updated_at: now,
      });
    }
    writeLocalSnapshot(userId, snap);
    return;
  }

  const { data: existing } = await supabase
    .from('user_library')
    .select('id')
    .eq('user_id', userId)
    .or(`document_id.eq.${documentId},book_id.eq.${documentId}`)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_library')
      .update({ status })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_library')
      .insert({ user_id: userId, document_id: documentId, status });
    if (error) throw error;
  }
}

export async function toggleFavoriteBook(
  userId: string,
  documentId: string,
  currentlyFavorite: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    if (currentlyFavorite) {
      snap.favorites = snap.favorites.filter((item) => item.book_id !== documentId);
    } else {
      snap.favorites = [
        {
          id: `local-fav-${documentId}`,
          user_id: userId,
          book_id: documentId,
          created_at: new Date().toISOString(),
        },
        ...snap.favorites.filter((item) => item.book_id !== documentId),
      ];
    }
    writeLocalSnapshot(userId, snap);
    return !currentlyFavorite;
  }

  if (currentlyFavorite) {
    const { error } = await supabase
      .from('document_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('document_id', documentId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('document_favorites')
    .upsert(
      { user_id: userId, document_id: documentId },
      { onConflict: 'user_id,document_id' }
    );
  if (error) throw error;
  return true;
}

export async function recordRecentDocument(
  userId: string,
  documentId: string,
  lastPage = 1
): Promise<void> {
  const now = new Date().toISOString();
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    const existing = snap.recents.find((r) => r.document_id === documentId);
    snap.recents = [
      {
        id: `local-rec-${documentId}`,
        user_id: userId,
        document_id: documentId,
        last_viewed_at: now,
        last_page: Math.max(1, lastPage),
        view_count: (existing?.view_count ?? 0) + 1,
      },
      ...snap.recents.filter((r) => r.document_id !== documentId),
    ].slice(0, 40);
    writeLocalSnapshot(userId, snap);
    return;
  }

  await supabase.rpc('record_recent_document', {
    p_document_id: documentId,
    p_last_page: Math.max(1, lastPage),
  });
}

export async function upsertReadingProgress(
  userId: string,
  documentId: string,
  currentPage: number,
  totalPages: number | null
): Promise<void> {
  const safeTotal = totalPages && totalPages > 0 ? totalPages : null;
  const percent = safeTotal ? Math.min(100, Math.round((currentPage / safeTotal) * 100)) : 0;
  const isCompleted = safeTotal !== null && currentPage >= safeTotal;
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    snap.progress = [
      {
        id: `local-prog-${documentId}`,
        user_id: userId,
        book_id: documentId,
        current_page: currentPage,
        total_pages: safeTotal,
        progress_percent: percent,
        last_read_at: now,
        completed_at: isCompleted ? now : null,
      },
      ...snap.progress.filter((item) => item.book_id !== documentId),
    ];
    writeLocalSnapshot(userId, snap);
    return;
  }

  const { data: existing } = await supabase
    .from('reading_progress')
    .select('id')
    .eq('user_id', userId)
    .or(`document_id.eq.${documentId},book_id.eq.${documentId}`)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('reading_progress')
      .update({
        current_page: currentPage,
        total_pages: safeTotal,
        progress_percent: percent,
        last_read_at: now,
        completed_at: isCompleted ? now : null,
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('reading_progress').insert({
      user_id: userId,
      document_id: documentId,
      current_page: currentPage,
      total_pages: safeTotal,
      progress_percent: percent,
      last_read_at: now,
      completed_at: isCompleted ? now : null,
    });
  }

  await updateLibraryStatus(userId, documentId, isCompleted ? 'completed' : 'reading');
}

export async function recordReadingHistory(
  userId: string,
  documentId: string,
  lastPage = 1
): Promise<void> {
  await recordRecentDocument(userId, documentId, lastPage);
  const now = new Date().toISOString();
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    snap.history = [
      {
        id: `local-hist-${Date.now()}`,
        user_id: userId,
        book_id: documentId,
        opened_at: now,
        last_page: lastPage,
      },
      ...snap.history.filter((item) => item.book_id !== documentId),
    ].slice(0, 50);
    writeLocalSnapshot(userId, snap);
  }
}

export async function recordDownload(userId: string, documentId: string): Promise<void> {
  const now = new Date().toISOString();
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    snap.downloads = [
      {
        id: `local-dl-${Date.now()}`,
        user_id: userId,
        book_id: documentId,
        downloaded_at: now,
      },
      ...snap.downloads,
    ].slice(0, 50);
    writeLocalSnapshot(userId, snap);
  }
}

export async function deleteDownloadRecord(userId: string, downloadId: string): Promise<void> {
  addDismissedDownloadIds(userId, [downloadId]);

  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    snap.downloads = snap.downloads.filter((item) => item.id !== downloadId);
    writeLocalSnapshot(userId, snap);
    return;
  }

  try {
    await supabase
      .from('download_events')
      .delete()
      .eq('id', downloadId)
      .eq('user_id', userId);
  } catch {
    // Si RLS restringe DELETE sobre eventos de auditoría, el registro queda oculto localmente
  }
}

export async function clearDownloadHistory(userId: string, downloadIds: string[]): Promise<void> {
  if (downloadIds.length > 0) {
    addDismissedDownloadIds(userId, downloadIds);
  }

  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    snap.downloads = [];
    writeLocalSnapshot(userId, snap);
    return;
  }

  try {
    await supabase.from('download_events').delete().eq('user_id', userId);
  } catch {
    // Fallback local si RLS restringe DELETE
  }
}

export async function togglePageBookmark(
  userId: string,
  documentId: string,
  pageNumber: number,
  label?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    const exists = snap.bookmarks.some(
      (b) => b.book_id === documentId && b.page_number === pageNumber
    );
    if (exists) {
      snap.bookmarks = snap.bookmarks.filter(
        (b) => !(b.book_id === documentId && b.page_number === pageNumber)
      );
    } else {
      snap.bookmarks = [
        ...snap.bookmarks,
        {
          id: `local-bm-${documentId}-${pageNumber}`,
          user_id: userId,
          book_id: documentId,
          page_number: pageNumber,
          label: label ?? `Página ${pageNumber}`,
          note: null,
          created_at: new Date().toISOString(),
        },
      ].sort((a, b) => a.page_number - b.page_number);
    }
    writeLocalSnapshot(userId, snap);
    return !exists;
  }

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .or(`document_id.eq.${documentId},book_id.eq.${documentId}`)
    .eq('page_number', pageNumber)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase.from('bookmarks').insert({
    user_id: userId,
    document_id: documentId,
    page_number: pageNumber,
    label: label ?? `Página ${pageNumber}`,
  });
  if (error) throw error;
  return true;
}

export async function upsertPageBookmarkNote(
  userId: string,
  documentId: string,
  pageNumber: number,
  label: string,
  note: string
): Promise<void> {
  const cleanLabel = label.trim() || `Página ${pageNumber}`;
  const cleanNote = note.trim() || null;

  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    const exists = snap.bookmarks.some(
      (b) => b.book_id === documentId && b.page_number === pageNumber
    );
    if (exists) {
      snap.bookmarks = snap.bookmarks.map((b) =>
        b.book_id === documentId && b.page_number === pageNumber
          ? { ...b, label: cleanLabel, note: cleanNote }
          : b
      );
    } else {
      snap.bookmarks = [
        ...snap.bookmarks,
        {
          id: `local-bm-${documentId}-${pageNumber}`,
          user_id: userId,
          book_id: documentId,
          page_number: pageNumber,
          label: cleanLabel,
          note: cleanNote,
          created_at: new Date().toISOString(),
        },
      ].sort((a, b) => a.page_number - b.page_number);
    }
    writeLocalSnapshot(userId, snap);
    return;
  }

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .or(`document_id.eq.${documentId},book_id.eq.${documentId}`)
    .eq('page_number', pageNumber)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('bookmarks')
      .update({ label: cleanLabel, note: cleanNote })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('bookmarks').insert({
    user_id: userId,
    document_id: documentId,
    page_number: pageNumber,
    label: cleanLabel,
    note: cleanNote,
  });
  if (error) throw error;
}

export async function createCollection(
  userId: string,
  payload: { name: string; description?: string; color?: string; icon?: string }
): Promise<UserCollection> {
  const now = new Date().toISOString();
  const icon = payload.icon || 'folder';
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    const collection: UserCollection = {
      id: `local-col-${Date.now()}`,
      user_id: userId,
      name: payload.name.trim(),
      description: payload.description?.trim() ?? '',
      color: payload.color ?? '#111E32',
      icon,
      created_at: now,
      book_ids: [],
    };
    snap.collections = [collection, ...snap.collections];
    writeLocalSnapshot(userId, snap);
    return collection;
  }

  const baseRow = {
    user_id: userId,
    name: payload.name.trim(),
    description: payload.description?.trim() ?? '',
    color: payload.color ?? '#111E32',
  };

  let { data, error } = await supabase
    .from('collections')
    .insert({ ...baseRow, icon })
    .select()
    .single();

  if (error && (error.code === '42703' || error.message.toLowerCase().includes('icon'))) {
    const retry = await supabase.from('collections').insert(baseRow).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  const created = data as Omit<UserCollection, 'book_ids'>;
  saveCollectionIconLocal(userId, created.id, icon);
  return { ...created, icon: created.icon || icon, book_ids: [] };
}

export async function updateCollection(
  userId: string,
  collectionId: string,
  payload: { name: string; description?: string; color?: string; icon?: string }
): Promise<UserCollection> {
  const icon = payload.icon || 'folder';
  const cleanName = payload.name.trim();
  const cleanDesc = payload.description?.trim() ?? '';
  const color = payload.color ?? '#111E32';

  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    let updated: UserCollection | null = null;
    snap.collections = snap.collections.map((c) => {
      if (c.id !== collectionId) return c;
      updated = { ...c, name: cleanName, description: cleanDesc, color, icon };
      return updated;
    });
    writeLocalSnapshot(userId, snap);
    if (!updated) throw new Error('Colección no encontrada');
    return updated;
  }

  const basePatch = {
    name: cleanName,
    description: cleanDesc,
    color,
  };

  let { data, error } = await supabase
    .from('collections')
    .update({ ...basePatch, icon })
    .eq('id', collectionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error && (error.code === '42703' || error.message.toLowerCase().includes('icon'))) {
    const retry = await supabase
      .from('collections')
      .update(basePatch)
      .eq('id', collectionId)
      .eq('user_id', userId)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  saveCollectionIconLocal(userId, collectionId, icon);
  const row = data as Omit<UserCollection, 'book_ids'>;
  return { ...row, icon: row.icon || icon, book_ids: [] };
}

export async function deleteCollection(userId: string, collectionId: string): Promise<void> {
  removeCollectionIconLocal(userId, collectionId);
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    snap.collections = snap.collections.filter((c) => c.id !== collectionId);
    writeLocalSnapshot(userId, snap);
    return;
  }

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', collectionId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function toggleBookInCollection(
  userId: string,
  collectionId: string,
  documentId: string,
  currentlyInCollection: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || userId === 'demo-user') {
    const snap = readLocalSnapshot(userId);
    snap.collections = snap.collections.map((col) => {
      if (col.id !== collectionId) return col;
      const nextIds = currentlyInCollection
        ? col.book_ids.filter((id) => id !== documentId)
        : Array.from(new Set([...col.book_ids, documentId]));
      return { ...col, book_ids: nextIds };
    });
    writeLocalSnapshot(userId, snap);
    return !currentlyInCollection;
  }

  if (currentlyInCollection) {
    const { error } = await supabase
      .from('collection_books')
      .delete()
      .eq('collection_id', collectionId)
      .or(`document_id.eq.${documentId},book_id.eq.${documentId}`);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('collection_books')
    .insert({ collection_id: collectionId, document_id: documentId });
  if (error && !error.message.includes('duplicate')) throw error;
  return true;
}
