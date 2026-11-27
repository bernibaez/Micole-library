import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/feedback/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import {
  fetchBookById,
  fetchBooks,
  fetchCategories,
  fetchFolders,
  incrementBookDownloads,
  resolveDocumentSource,
} from '../../services/booksService';
import {
  clearDownloadHistory,
  createCollection,
  deleteCollection,
  deleteDownloadRecord,
  fetchPersonalLibrary,
  readGuestFavorites,
  readGuestRecents,
  recordDownload,
  recordGuestRecent,
  recordReadingHistory,
  toggleBookInCollection,
  toggleFavoriteBook,
  toggleGuestFavorite,
  toggleLibraryBook,
  togglePageBookmark,
  updateCollection,
  updateLibraryStatus,
  upsertPageBookmarkNote,
  upsertReadingProgress,
  type PersonalLibrarySnapshot,
} from '../../services/libraryService';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationsService';
import {
  DEFAULT_PREFERENCES,
  fetchUserPreferences,
  updateUserPreferences,
} from '../../services/profileService';
import type { Book, LibraryStatus, UserPreferences } from '../../types';

export const QUERY_KEYS = {
  books: ['books'] as const,
  book: (id: string) => ['books', id] as const,
  categories: ['categories'] as const,
  folders: ['folders'] as const,
  personal: (userId: string) => ['personal-library', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  preferences: (userId: string) => ['preferences', userId] as const,
  adminStats: ['admin', 'stats'] as const,
  adminDocuments: ['admin', 'documents'] as const,
  driveSummary: ['admin', 'drive-summary'] as const,
};

export function useBooksQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.books,
    queryFn: ({ signal }) => fetchBooks(signal),
  });
}

export function useBookQuery(id?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.book(id ?? ''),
    queryFn: ({ signal }) => fetchBookById(id!, signal),
    enabled: Boolean(id),
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: ({ signal }) => fetchCategories(signal),
  });
}

export function useFoldersQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.folders,
    queryFn: ({ signal }) => fetchFolders(signal),
  });
}

const EMPTY_SNAPSHOT: PersonalLibrarySnapshot = {
  library: [],
  favorites: [],
  recents: [],
  progress: [],
  history: [],
  bookmarks: [],
  downloads: [],
  collections: [],
};

export function usePersonalLibrary() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const navigate = useNavigate();

  // Visitantes anónimos conservan favoritos y recientes en localStorage sin exigir cuenta
  const [guestFavorites, setGuestFavorites] = useState(() => readGuestFavorites());
  const [guestRecents, setGuestRecents] = useState(() => readGuestRecents());

  const query = useQuery({
    queryKey: QUERY_KEYS.personal(userId ?? 'guest'),
    queryFn: () => fetchPersonalLibrary(userId!),
    enabled: Boolean(userId && isAuthenticated),
  });

  const data: PersonalLibrarySnapshot = isAuthenticated
    ? (query.data ?? EMPTY_SNAPSHOT)
    : {
        ...EMPTY_SNAPSHOT,
        favorites: guestFavorites,
        recents: guestRecents,
      };

  const requireAuth = (actionLabel: string): string | null => {
    if (!userId || !isAuthenticated) {
      notify(`Inicia sesión para ${actionLabel}.`, 'info');
      navigate(
        `/iniciar-sesion?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      );
      return null;
    }
    return userId;
  };

  const invalidate = useCallback(() => {
    if (userId) {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.personal(userId) });
    }
  }, [queryClient, userId]);

  const toggleLibraryMutation = useMutation({
    mutationFn: async ({ bookId, inLibrary }: { bookId: string; inLibrary: boolean }) => {
      if (!userId) throw new Error('Sin sesión');
      return toggleLibraryBook(userId, bookId, inLibrary);
    },
    onSuccess: (added) => {
      invalidate();
      notify(added ? 'Añadido a tu biblioteca' : 'Eliminado de tu biblioteca');
    },
    onError: () => notify('No se pudo actualizar tu biblioteca.', 'error'),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ bookId, isFav }: { bookId: string; isFav: boolean }) => {
      if (!userId) throw new Error('Sin sesión');
      return toggleFavoriteBook(userId, bookId, isFav);
    },
    onSuccess: (added) => {
      invalidate();
      notify(added ? 'Añadido a favoritos' : 'Eliminado de favoritos');
    },
    onError: () => notify('No se pudo actualizar favoritos.', 'error'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      bookId,
      status,
      totalPages,
    }: {
      bookId: string;
      status: LibraryStatus;
      totalPages?: number | null;
    }) => {
      if (!userId) throw new Error('Sin sesión');
      await updateLibraryStatus(userId, bookId, status);
      if (status === 'completed') {
        const pages = totalPages && totalPages > 0 ? totalPages : 1;
        await upsertReadingProgress(userId, bookId, pages, pages);
      }
    },
    onSuccess: (_data, vars) => {
      invalidate();
      notify(
        vars.status === 'completed'
          ? 'Marcado como completado'
          : vars.status === 'pending'
            ? 'Marcado como pendiente'
            : 'Estado de lectura actualizado'
      );
    },
    onError: () => notify('No se pudo actualizar el estado de lectura.', 'error'),
  });

  const createCollectionMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
    }) => {
      if (!userId) throw new Error('Sin sesión');
      return createCollection(userId, payload);
    },
    onSuccess: (col) => {
      invalidate();
      notify(`Colección "${col.name}" creada`);
    },
    onError: () => notify('No se pudo crear la colección. Verifica si ya existe.', 'error'),
  });

  const updateCollectionMutation = useMutation({
    mutationFn: async ({
      collectionId,
      name,
      description,
      color,
      icon,
    }: {
      collectionId: string;
      name: string;
      description?: string;
      color?: string;
      icon?: string;
    }) => {
      if (!userId) throw new Error('Sin sesión');
      return updateCollection(userId, collectionId, { name, description, color, icon });
    },
    onSuccess: (col) => {
      invalidate();
      notify(`Colección "${col.name}" actualizada`);
    },
    onError: () => notify('No se pudo actualizar la colección.', 'error'),
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      if (!userId) throw new Error('Sin sesión');
      await deleteCollection(userId, collectionId);
    },
    onSuccess: () => {
      invalidate();
      notify('Colección eliminada');
    },
  });

  const toggleCollectionBookMutation = useMutation({
    mutationFn: async ({
      collectionId,
      bookId,
      inCollection,
    }: {
      collectionId: string;
      bookId: string;
      inCollection: boolean;
    }) => {
      if (!userId) throw new Error('Sin sesión');
      return toggleBookInCollection(userId, collectionId, bookId, inCollection);
    },
    onSuccess: (added) => {
      invalidate();
      notify(added ? 'Recurso añadido a la colección' : 'Recurso quitado de la colección');
    },
  });

  const deleteDownloadMutation = useMutation({
    mutationFn: async (downloadId: string) => {
      if (!userId) throw new Error('Sin sesión');
      await deleteDownloadRecord(userId, downloadId);
      return downloadId;
    },
    onSuccess: (downloadId) => {
      if (userId) {
        queryClient.setQueryData<PersonalLibrarySnapshot>(
          QUERY_KEYS.personal(userId),
          (prev) =>
            prev
              ? { ...prev, downloads: prev.downloads.filter((d) => d.id !== downloadId) }
              : prev
        );
      }
      invalidate();
      notify('Descarga eliminada del historial');
    },
    onError: () => notify('No se pudo eliminar la descarga.', 'error'),
  });

  const clearDownloadsMutation = useMutation({
    mutationFn: async (downloadIds: string[]) => {
      if (!userId) throw new Error('Sin sesión');
      await clearDownloadHistory(userId, downloadIds);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.setQueryData<PersonalLibrarySnapshot>(
          QUERY_KEYS.personal(userId),
          (prev) => (prev ? { ...prev, downloads: [] } : prev)
        );
      }
      invalidate();
      notify('Historial de descargas limpiado');
    },
    onError: () => notify('No se pudo limpiar el historial de descargas.', 'error'),
  });

  const isInLibrary = (bookId: string) => data.library.some((item) => item.book_id === bookId);
  const isFavorite = (bookId: string) => data.favorites.some((item) => item.book_id === bookId);
  const getProgress = (bookId: string) => data.progress.find((item) => item.book_id === bookId);
  const getBookmarks = (bookId: string) => data.bookmarks.filter((item) => item.book_id === bookId);

  const handleToggleLibrary = (bookId: string) => {
    if (!requireAuth('guardar recursos en tu biblioteca')) return;
    toggleLibraryMutation.mutate({ bookId, inLibrary: isInLibrary(bookId) });
  };

  const handleToggleFavorite = (bookId: string) => {
    if (!isAuthenticated || !userId) {
      const added = toggleGuestFavorite(bookId);
      setGuestFavorites(readGuestFavorites());
      notify(
        added
          ? 'Guardado en favoritos de este navegador'
          : 'Eliminado de favoritos'
      );
      return;
    }
    toggleFavoriteMutation.mutate({ bookId, isFav: isFavorite(bookId) });
  };

  const handleDownloadBook = async (book: Book) => {
    if (book.allow_download === false) {
      notify('La descarga no está habilitada para este documento.', 'error');
      throw new Error('Descarga deshabilitada');
    }

    const source = await resolveDocumentSource(book, 'download');
    if (!source) {
      notify('Este recurso no tiene un archivo disponible para descarga.', 'error');
      throw new Error('Archivo no disponible');
    }

    const ext = book.file_extension || 'pdf';
    const safeName = `${book.title.replace(/[^\w\s-]/g, '').trim() || 'documento'}.${ext}`;

    if (source.kind === 'proxy') {
      const res = await fetch(source.url, { headers: source.httpHeaders });
      if (!res.ok) {
        let message = 'No tienes autorización o el archivo no está disponible.';
        try {
          const errJson = (await res.json()) as { error?: string };
          if (errJson.error) message = errJson.error;
        } catch {
          // ignore
        }
        notify(message, 'error');
        throw new Error(message);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = safeName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

      if (userId && isAuthenticated) {
        invalidate();
      }
      notify('Descarga del documento iniciada');
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = source.url;
    anchor.download = safeName;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    void incrementBookDownloads(book.id);
    if (userId && isAuthenticated) {
      await recordDownload(userId, book.id);
      invalidate();
    }
    notify('Descarga del documento iniciada');
  };

  const saveProgress = useCallback(
    async (bookId: string, page: number, totalPages: number | null) => {
      if (!userId || !isAuthenticated) return;
      await upsertReadingProgress(userId, bookId, page, totalPages);
      invalidate();
    },
    [invalidate, isAuthenticated, userId]
  );

  const logHistory = useCallback(
    async (bookId: string, page = 1) => {
      if (!userId || !isAuthenticated) {
        setGuestRecents(recordGuestRecent(bookId, page));
        return;
      }
      await recordReadingHistory(userId, bookId, page);
      invalidate();
    },
    [invalidate, isAuthenticated, userId]
  );

  const handleToggleBookmark = async (bookId: string, pageNumber: number, label?: string) => {
    if (!requireAuth('guardar marcadores de página')) return false;
    const added = await togglePageBookmark(userId!, bookId, pageNumber, label);
    invalidate();
    notify(
      added
        ? `Marcador guardado en página ${pageNumber}`
        : `Marcador eliminado (pág. ${pageNumber})`
    );
    return added;
  };

  const handleSaveBookmarkNote = async (
    bookId: string,
    pageNumber: number,
    label: string,
    note: string
  ) => {
    if (!requireAuth('guardar notas y marcadores')) return false;
    try {
      await upsertPageBookmarkNote(userId!, bookId, pageNumber, label, note);
      invalidate();
      notify(`Nota guardada en página ${pageNumber}`);
      return true;
    } catch {
      notify('No se pudo guardar la nota.', 'error');
      return false;
    }
  };

  return {
    ...query,
    snapshot: data,
    isInLibrary,
    isFavorite,
    getProgress,
    getBookmarks,
    handleToggleLibrary,
    handleToggleFavorite,
    handleDownloadBook,
    saveProgress,
    logHistory,
    handleToggleBookmark,
    handleSaveBookmarkNote,
    updateStatus: (bookId: string, status: LibraryStatus, totalPages?: number | null) => {
      if (!requireAuth('actualizar tu estado de lectura')) return;
      statusMutation.mutate({ bookId, status, totalPages });
    },
    createCollection: createCollectionMutation.mutateAsync,
    updateCollection: updateCollectionMutation.mutateAsync,
    deleteCollection: deleteCollectionMutation.mutateAsync,
    deleteDownload: deleteDownloadMutation.mutateAsync,
    clearDownloads: () =>
      clearDownloadsMutation.mutateAsync(data.downloads.map((d) => d.id)),
    toggleBookInCollection: toggleCollectionBookMutation.mutateAsync,
    isMutatingLibrary: toggleLibraryMutation.isPending,
    isMutatingFavorite: toggleFavoriteMutation.isPending,
  };
}

export function useNotificationsQuery() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEYS.notifications(userId ?? 'guest'),
    queryFn: () => fetchNotifications(userId!),
    enabled: Boolean(userId && isAuthenticated),
  });

  const markRead = async (id: string) => {
    if (!userId) return;
    await markNotificationRead(userId, id);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications(userId) });
  };

  const markAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications(userId) });
  };

  const items = query.data ?? [];
  const unreadCount = items.filter((n) => !n.read_at).length;

  return { ...query, items, unreadCount, markRead, markAllRead };
}

export function usePreferencesQuery() {
  const { userId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const query = useQuery({
    queryKey: QUERY_KEYS.preferences(userId ?? 'guest'),
    queryFn: () => fetchUserPreferences(userId!),
    enabled: Boolean(userId && isAuthenticated),
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<Omit<UserPreferences, 'user_id'>>) => {
      if (!userId) return DEFAULT_PREFERENCES('guest');
      return updateUserPreferences(userId, updates);
    },
    onSuccess: (next) => {
      if (userId) {
        queryClient.setQueryData(QUERY_KEYS.preferences(userId), next);
      }
    },
    onError: () => notify('No se pudieron guardar tus preferencias.', 'error'),
  });

  return {
    preferences: query.data ?? DEFAULT_PREFERENCES(userId ?? 'guest'),
    isLoading: query.isLoading,
    updatePreferences: mutation.mutateAsync,
  };
}
