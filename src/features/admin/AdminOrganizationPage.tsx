import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, m } from 'motion/react';
import {
  Archive,
  BookOpen,
  BookPlus,
  Briefcase,
  ChevronRight,
  Cloud,
  ExternalLink,
  Folder,
  FolderMinus,
  FolderOpen,
  FolderPlus,
  Gavel,
  GraduationCap,
  Home,
  Landmark,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Scale,
  ScrollText,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { AdminNavHeader } from './AdminNavHeader';
import { DocumentFormModal } from './DocumentFormModal';
import { DriveImportModal } from './DriveImportModal';
import { FolderAddBooksModal } from './FolderAddBooksModal';
import {
  assignDocumentsToFolder,
  deleteAdminCategory,
  deleteAdminFolder,
  removeDocumentFromFolder,
  saveAdminCategory,
  saveAdminDocument,
  saveAdminFolder,
  type UpsertDocumentInput,
} from '../../services/adminService';
import { fetchDriveConnectionSummary } from '../../services/driveService';
import {
  QUERY_KEYS,
  useBooksQuery,
  useCategoriesQuery,
  useFoldersQuery,
} from '../library/useLibraryData';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LexNotFoundMascot } from '../../components/mascot/LexNotFoundMascot';
import { useToast } from '../../components/feedback/ToastProvider';
import { getDocumentTypeLabel, normalizeText } from '../../utils/format';
import { EASE_EDITORIAL } from '../../utils/motion';
import { cn } from '../../utils/cn';
import type { Book, CategoryInfo, LibraryFolder } from '../../types';

const ICON_OPTIONS = [
  { id: 'scale', label: 'Balanza', icon: Scale },
  { id: 'book-open', label: 'Libro', icon: BookOpen },
  { id: 'landmark', label: 'Legislación', icon: Landmark },
  { id: 'gavel', label: 'Jurisprudencia', icon: Gavel },
  { id: 'shield', label: 'Penal', icon: Shield },
  { id: 'scroll', label: 'Constitucional', icon: ScrollText },
  { id: 'graduation-cap', label: 'Académico', icon: GraduationCap },
  { id: 'briefcase', label: 'Práctica', icon: Briefcase },
  { id: 'archive', label: 'Archivo', icon: Archive },
  { id: 'folder', label: 'Carpeta', icon: Folder },
] as const;

function getCategoryIcon(iconName?: string | null) {
  const match = ICON_OPTIONS.find((item) => item.id === iconName);
  return match?.icon ?? Scale;
}

type OrgView = 'categories' | 'folders';

export function AdminOrganizationPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: folders = [] } = useFoldersQuery();
  const { data: books = [] } = useBooksQuery();
  const driveQuery = useQuery({
    queryKey: QUERY_KEYS.driveSummary,
    queryFn: fetchDriveConnectionSummary,
  });

  const [tab, setTab] = useState<OrgView>('categories');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');

  // Drive-like folder navigation state
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Add / manage books inside a folder
  const [addBooksFolderId, setAddBooksFolderId] = useState<string | null>(null);
  const [docFormOpen, setDocFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Book | null>(null);
  const [docFormLocation, setDocFormLocation] = useState<{
    categoryId?: string | null;
    subcategoryId?: string | null;
    folderId?: string | null;
  } | null>(null);
  const [driveImportOpen, setDriveImportOpen] = useState(false);
  const [driveImportLocation, setDriveImportLocation] = useState<{
    categoryId?: string | null;
    subcategoryId?: string | null;
    folderId?: string | null;
  } | null>(null);
  const [removingDocId, setRemovingDocId] = useState<string | null>(null);

  // Category modal state (create or edit)
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryInfo | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIcon, setCatIcon] = useState('scale');
  const [catParentId, setCatParentId] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('10');
  const [savingCat, setSavingCat] = useState(false);

  // Folder modal state (create or edit)
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<LibraryFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderCatId, setFolderCatId] = useState('');
  const [folderParentId, setFolderParentId] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  // Branded Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'category'; item: CategoryInfo; docCount: number; subCount: number }
    | { kind: 'folder'; item: LibraryFolder; docCount: number; childCount: number }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const subcatsByParent = useMemo(() => {
    const map = new Map<string, CategoryInfo[]>();
    for (const c of categories) {
      if (!c.parent_id) continue;
      const list = map.get(c.parent_id) ?? [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }
    return map;
  }, [categories]);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const docCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of books) {
      if (b.category_id) {
        map.set(b.category_id, (map.get(b.category_id) ?? 0) + 1);
      } else {
        const matched = categories.find(
          (c) => c.name.toLowerCase() === b.category.toLowerCase()
        );
        if (matched) map.set(matched.id, (map.get(matched.id) ?? 0) + 1);
      }
      if (b.subcategory_id) {
        map.set(b.subcategory_id, (map.get(b.subcategory_id) ?? 0) + 1);
      }
    }
    return map;
  }, [books, categories]);

  const folderCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of folders) {
      if (f.category_id) {
        map.set(f.category_id, (map.get(f.category_id) ?? 0) + 1);
      }
    }
    return map;
  }, [folders]);

  const docCountByFolder = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of books) {
      if (b.folder_id) {
        map.set(b.folder_id, (map.get(b.folder_id) ?? 0) + 1);
      }
    }
    return map;
  }, [books]);

  const childFolderCountByParent = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of folders) {
      if (f.parent_id) {
        map.set(f.parent_id, (map.get(f.parent_id) ?? 0) + 1);
      }
    }
    return map;
  }, [folders]);

  // Filtered categories for search
  const filteredTopCategories = useMemo(() => {
    const term = normalizeText(search);
    if (!term) return topCategories;
    return topCategories.filter((cat) => {
      const subcats = subcatsByParent.get(cat.id) ?? [];
      const selfMatches = normalizeText(`${cat.name} ${cat.description}`).includes(term);
      const subMatches = subcats.some((s) =>
        normalizeText(`${s.name} ${s.description}`).includes(term)
      );
      return selfMatches || subMatches;
    });
  }, [search, subcatsByParent, topCategories]);

  // Breadcrumb trail for Google Drive–style folder navigation
  const folderTrail = useMemo(() => {
    const trail: LibraryFolder[] = [];
    let cursor = currentFolderId ? (folderById.get(currentFolderId) ?? null) : null;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      trail.unshift(cursor);
      cursor = cursor.parent_id ? (folderById.get(cursor.parent_id) ?? null) : null;
    }
    return trail;
  }, [currentFolderId, folderById]);

  // Visible folders in current Drive level (or all matching if searching)
  const visibleFolders = useMemo(() => {
    const term = normalizeText(search);
    if (term) {
      return folders.filter((f) => {
        if (activeCategoryFilter && f.category_id !== activeCategoryFilter) return false;
        return normalizeText(`${f.name} ${f.description}`).includes(term);
      });
    }
    return folders.filter((f) => {
      if (currentFolderId) return f.parent_id === currentFolderId;
      if (activeCategoryFilter) return f.category_id === activeCategoryFilter && !f.parent_id;
      return !f.parent_id;
    });
  }, [activeCategoryFilter, currentFolderId, folders, search]);

  const docsInCurrentFolder = useMemo(() => {
    if (!currentFolderId) return [];
    return books.filter((b) => b.folder_id === currentFolderId);
  }, [books, currentFolderId]);

  const currentFolder = currentFolderId ? (folderById.get(currentFolderId) ?? null) : null;
  const addBooksFolder = addBooksFolderId ? (folderById.get(addBooksFolderId) ?? null) : null;

  const resolveFolderLocation = (fld: LibraryFolder) => {
    let categoryId = fld.category_id;
    let subcategoryId = fld.subcategory_id;
    let cursor = fld.parent_id ? (folderById.get(fld.parent_id) ?? null) : null;
    const seen = new Set<string>([fld.id]);
    while (cursor && !seen.has(cursor.id) && (!categoryId || !subcategoryId)) {
      seen.add(cursor.id);
      if (!categoryId && cursor.category_id) categoryId = cursor.category_id;
      if (!subcategoryId && cursor.subcategory_id) subcategoryId = cursor.subcategory_id;
      cursor = cursor.parent_id ? (folderById.get(cursor.parent_id) ?? null) : null;
    }
    return {
      categoryId: categoryId ?? null,
      subcategoryId: subcategoryId ?? null,
      folderId: fld.id,
    };
  };

  const invalidateOrg = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folders });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.books });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDocuments });
  };

  const handleAssignBooksToFolder = async (bookIds: string[], folder: LibraryFolder) => {
    try {
      const loc = resolveFolderLocation(folder);
      await assignDocumentsToFolder(bookIds, {
        folder_id: folder.id,
        category_id: loc.categoryId,
        subcategory_id: loc.subcategoryId,
      });
      notify(
        bookIds.length === 1
          ? `Libro agregado a "${folder.name}"`
          : `${bookIds.length} libros agregados a "${folder.name}"`
      );
      invalidateOrg();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'No se pudieron agregar los libros a la carpeta.',
        'error'
      );
      throw err;
    }
  };

  const handleRemoveDocFromFolder = async (docId: string) => {
    setRemovingDocId(docId);
    try {
      await removeDocumentFromFolder(docId);
      notify('Libro quitado de la carpeta');
      invalidateOrg();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'No se pudo quitar el libro de la carpeta.',
        'error'
      );
    } finally {
      setRemovingDocId(null);
    }
  };

  const handleSaveDocument = async (payload: UpsertDocumentInput) => {
    await saveAdminDocument(payload);
    notify(payload.id ? 'Documento actualizado' : 'Libro agregado a la carpeta');
    invalidateOrg();
  };

  const openCreateDocInFolder = (folder: LibraryFolder) => {
    setEditingDoc(null);
    setDocFormLocation(resolveFolderLocation(folder));
    setDocFormOpen(true);
  };

  const openImportDriveInFolder = (folder: LibraryFolder) => {
    setDriveImportLocation(resolveFolderLocation(folder));
    setDriveImportOpen(true);
  };

  // Modal openers
  const openCreateCategory = (parentId = '') => {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setCatIcon(parentId ? 'archive' : 'scale');
    setCatParentId(parentId);
    setCatSortOrder(String(topCategories.length + 1));
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: CategoryInfo) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description ?? '');
    setCatIcon(cat.icon || 'scale');
    setCatParentId(cat.parent_id ?? '');
    setCatSortOrder(String(cat.sort_order ?? 10));
    setCatModalOpen(true);
  };

  const openCreateFolder = (presetCategoryId?: string, presetParentId?: string) => {
    setEditingFolder(null);
    setFolderName('');
    setFolderDesc('');
    setFolderCatId(presetCategoryId ?? activeCategoryFilter ?? '');
    setFolderParentId(presetParentId ?? currentFolderId ?? '');
    setFolderModalOpen(true);
  };

  const openEditFolder = (fld: LibraryFolder) => {
    setEditingFolder(fld);
    setFolderName(fld.name);
    setFolderDesc(fld.description ?? '');
    setFolderCatId(fld.category_id ?? '');
    setFolderParentId(fld.parent_id ?? '');
    setFolderModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSavingCat(true);
    try {
      await saveAdminCategory({
        id: editingCat?.id,
        name: catName.trim(),
        description: catDesc.trim(),
        icon: catIcon,
        parent_id: catParentId || null,
        sort_order: Number(catSortOrder) || 10,
      });
      notify(
        editingCat
          ? 'Categoría actualizada correctamente'
          : catParentId
            ? 'Subcategoría creada'
            : 'Categoría creada'
      );
      setCatModalOpen(false);
      invalidateOrg();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo guardar la categoría.', 'error');
    } finally {
      setSavingCat(false);
    }
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setSavingFolder(true);
    try {
      await saveAdminFolder({
        id: editingFolder?.id,
        name: folderName.trim(),
        description: folderDesc.trim(),
        category_id: folderCatId || null,
        parent_id: folderParentId || null,
        published: editingFolder?.published ?? true,
      });
      notify(
        editingFolder
          ? 'Carpeta actualizada correctamente'
          : folderParentId
            ? 'Subcarpeta creada'
            : 'Carpeta creada'
      );
      setFolderModalOpen(false);
      invalidateOrg();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo guardar la carpeta.', 'error');
    } finally {
      setSavingFolder(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'category') {
        await deleteAdminCategory(deleteTarget.item.id);
        if (activeCategoryFilter === deleteTarget.item.id) {
          setActiveCategoryFilter('');
        }
        notify(`Categoría "${deleteTarget.item.name}" eliminada`);
      } else {
        await deleteAdminFolder(deleteTarget.item.id);
        if (currentFolderId === deleteTarget.item.id) {
          setCurrentFolderId(deleteTarget.item.parent_id ?? null);
        }
        notify(`Carpeta "${deleteTarget.item.name}" eliminada`);
      }
      setDeleteTarget(null);
      invalidateOrg();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al eliminar el elemento.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const totalSubcategories = categories.length - topCategories.length;

  return (
    <div className="space-y-6">
      <AdminNavHeader
        title="Categorías y carpetas"
        subtitle="Organiza la taxonomía jurídica, edita o elimina secciones y navega tus carpetas al estilo Google Drive."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => openCreateFolder()}>
              <FolderPlus className="h-4 w-4" />
              Nueva carpeta
            </Button>
            <Button variant="primary" size="sm" onClick={() => openCreateCategory()}>
              <Plus className="h-4 w-4" />
              Nueva categoría
            </Button>
          </>
        }
      />

      {/* Compact Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-line bg-white px-4 py-3.5 flex items-center gap-3 shadow-subtle">
          <span className="h-9 w-9 rounded-xl bg-sand-soft text-gold-dark inline-flex items-center justify-center shrink-0">
            <Scale className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-navy tabular-nums leading-none">
              {topCategories.length}
            </p>
            <p className="text-[11px] text-ink-muted mt-1 truncate">Categorías principales</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white px-4 py-3.5 flex items-center gap-3 shadow-subtle">
          <span className="h-9 w-9 rounded-xl bg-sand-soft text-gold-dark inline-flex items-center justify-center shrink-0">
            <Archive className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-navy tabular-nums leading-none">
              {totalSubcategories}
            </p>
            <p className="text-[11px] text-ink-muted mt-1 truncate">Subcategorías</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white px-4 py-3.5 flex items-center gap-3 shadow-subtle">
          <span className="h-9 w-9 rounded-xl bg-sand-soft text-gold-dark inline-flex items-center justify-center shrink-0">
            <Folder className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-navy tabular-nums leading-none">
              {folders.length}
            </p>
            <p className="text-[11px] text-ink-muted mt-1 truncate">Carpetas totales</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white px-4 py-3.5 flex items-center gap-3 shadow-subtle">
          <span className="h-9 w-9 rounded-xl bg-sand-soft text-gold-dark inline-flex items-center justify-center shrink-0">
            <Cloud className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-navy tabular-nums leading-none">
              {folders.filter((f) => Boolean(f.drive_folder_id)).length}
            </p>
            <p className="text-[11px] text-ink-muted mt-1 truncate">Vinculadas a Drive</p>
          </div>
        </div>
      </div>

      {/* Drive-style Workspace Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3 shadow-subtle">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-sand-soft/90 p-1 border border-line/70">
            <button
              type="button"
              onClick={() => setTab('categories')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                tab === 'categories'
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-ink-muted hover:text-navy'
              )}
            >
              Categorías ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('folders')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                tab === 'folders'
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-ink-muted hover:text-navy'
              )}
            >
              Explorador de carpetas ({folders.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:flex-initial sm:min-w-[290px]">
          <div className="flex-1 flex items-center gap-2 h-9 rounded-xl border border-line bg-surface-secondary/50 px-3 focus-within:bg-white focus-within:border-navy/40 transition-colors">
            <Search className="h-3.5 w-3.5 text-ink-subtle shrink-0" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === 'categories'
                  ? 'Buscar categoría o subcategoría...'
                  : 'Buscar carpeta...'
              }
              className="w-full min-w-0 bg-transparent text-xs sm:text-sm text-ink placeholder:text-ink-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpiar búsqueda"
                className="text-ink-subtle hover:text-navy"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Modo de vista"
            className="inline-flex items-center rounded-xl border border-line bg-surface-secondary/60 p-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Vista en cuadrícula"
              aria-pressed={viewMode === 'grid'}
              className={cn(
                'h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors',
                viewMode === 'grid'
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-ink-muted hover:text-navy'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Vista en lista"
              aria-pressed={viewMode === 'list'}
              className={cn(
                'h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors',
                viewMode === 'list'
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-ink-muted hover:text-navy'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <AnimatePresence mode="wait" initial={false}>
        {tab === 'categories' ? (
          <m.div
            key={`cats-${viewMode}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
          >
            {filteredTopCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-3xl border border-line bg-white shadow-subtle">
                <LexNotFoundMascot compact className="mb-2" />
                <p className="text-base font-semibold text-navy">
                  No se encontraron categorías
                </p>
                <p className="text-xs text-ink-muted mt-1 max-w-sm">
                  Ajusta el texto de búsqueda o crea una nueva sección temática.
                </p>
                <div className="mt-4 flex gap-2">
                  {search && (
                    <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                      Limpiar búsqueda
                    </Button>
                  )}
                  <Button variant="primary" size="sm" onClick={() => openCreateCategory()}>
                    <Plus className="h-3.5 w-3.5" />
                    Nueva categoría
                  </Button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTopCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon);
                  const subcats = subcatsByParent.get(cat.id) ?? [];
                  const docCount = docCountByCategory.get(cat.id) ?? 0;
                  const fldCount = folderCountByCategory.get(cat.id) ?? 0;

                  return (
                    <article
                      key={cat.id}
                      className="group rounded-2xl border border-line bg-white p-5 flex flex-col justify-between gap-4 hover:border-navy/25 hover:shadow-subtle transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="h-11 w-11 rounded-2xl bg-sand-soft border border-sand-deep/50 text-gold-dark inline-flex items-center justify-center shrink-0 group-hover:bg-navy group-hover:text-gold group-hover:border-navy transition-colors">
                              <Icon className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <h2 className="text-sm sm:text-base font-semibold text-navy leading-snug line-clamp-1">
                                {cat.name}
                              </h2>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[11px] font-medium text-ink-muted tabular-nums">
                                  {docCount} {docCount === 1 ? 'doc.' : 'docs.'}
                                </span>
                                <span className="text-line-strong">·</span>
                                <span className="text-[11px] font-medium text-ink-muted tabular-nums">
                                  {fldCount} {fldCount === 1 ? 'carpeta' : 'carpetas'}
                                </span>
                                {cat.is_system && (
                                  <Badge variant="gold" className="text-[10px] px-1.5 py-0">
                                    Base
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Edit & Delete Actions (Enabled for ALL categories!) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditCategory(cat)}
                              aria-label={`Editar categoría ${cat.name}`}
                              title="Editar categoría"
                              className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-sand-soft transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: 'category',
                                  item: cat,
                                  docCount,
                                  subCount: subcats.length,
                                })
                              }
                              aria-label={`Eliminar categoría ${cat.name}`}
                              title="Eliminar categoría"
                              className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {cat.description && (
                          <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                            {cat.description}
                          </p>
                        )}

                        {/* Nested Subcategories */}
                        {subcats.length > 0 && (
                          <div className="pt-2 border-t border-line/70 space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                              Subcategorías ({subcats.length})
                            </p>
                            <div className="space-y-1.5">
                              {subcats.map((sub) => {
                                const subDocs = docCountByCategory.get(sub.id) ?? 0;
                                return (
                                  <div
                                    key={sub.id}
                                    className="flex items-center justify-between gap-2 rounded-xl bg-sand-soft/75 border border-line/60 px-3 py-1.5"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Archive className="h-3.5 w-3.5 text-gold-dark shrink-0" />
                                      <span className="text-xs font-medium text-navy truncate">
                                        {sub.name}
                                      </span>
                                      <span className="text-[10px] text-ink-subtle tabular-nums shrink-0">
                                        ({subDocs})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => openEditCategory(sub)}
                                        aria-label={`Editar subcategoría ${sub.name}`}
                                        title="Editar subcategoría"
                                        className="h-6 w-6 rounded-md inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-white"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeleteTarget({
                                            kind: 'category',
                                            item: sub,
                                            docCount: subDocs,
                                            subCount: 0,
                                          })
                                        }
                                        aria-label={`Eliminar subcategoría ${sub.name}`}
                                        title="Eliminar subcategoría"
                                        className="h-6 w-6 rounded-md inline-flex items-center justify-center text-ink-muted hover:text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Quick Actions */}
                      <div className="pt-3 border-t border-line/70 flex items-center justify-between gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => openCreateCategory(cat.id)}
                          className="inline-flex items-center gap-1 font-medium text-navy hover:text-gold-dark transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Subcategoría
                        </button>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCategoryFilter(cat.id);
                              setCurrentFolderId(null);
                              setTab('folders');
                            }}
                            className="inline-flex items-center gap-1 text-ink-muted hover:text-navy transition-colors"
                          >
                            <Folder className="h-3.5 w-3.5" />
                            Carpetas
                          </button>
                          <Link
                            to={`/explorar?categoria=${encodeURIComponent(cat.name)}`}
                            className="inline-flex items-center gap-1 text-ink-muted hover:text-navy transition-colors"
                            title="Ver en catálogo"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* List View for Categories */
              <div className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden shadow-subtle">
                {filteredTopCategories.map((cat) => {
                  const Icon = getCategoryIcon(cat.icon);
                  const subcats = subcatsByParent.get(cat.id) ?? [];
                  const docCount = docCountByCategory.get(cat.id) ?? 0;
                  const fldCount = folderCountByCategory.get(cat.id) ?? 0;
                  return (
                    <div key={cat.id} className="p-4 sm:p-5 space-y-3 hover:bg-sand-soft/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="h-10 w-10 rounded-xl bg-sand-soft text-gold-dark inline-flex items-center justify-center shrink-0">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-navy truncate">{cat.name}</p>
                              {cat.is_system && <Badge variant="gold">Base</Badge>}
                              <span className="text-[11px] text-ink-subtle tabular-nums">
                                Orden #{cat.sort_order}
                              </span>
                            </div>
                            <p className="text-xs text-ink-muted line-clamp-1 mt-0.5">
                              {cat.description || 'Sin descripción'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span className="text-xs font-medium text-ink-muted tabular-nums">
                            {docCount} docs · {fldCount} carpetas
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCreateCategory(cat.id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Subcat.
                          </Button>
                          <button
                            type="button"
                            onClick={() => openEditCategory(cat)}
                            aria-label={`Editar ${cat.name}`}
                            className="h-8 w-8 rounded-lg border border-line bg-white inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-sand-soft"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                kind: 'category',
                                item: cat,
                                docCount,
                                subCount: subcats.length,
                              })
                            }
                            aria-label={`Eliminar ${cat.name}`}
                            className="h-8 w-8 rounded-lg border border-line bg-white inline-flex items-center justify-center text-ink-muted hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {subcats.length > 0 && (
                        <div className="pl-5 ml-5 border-l-2 border-gold/40 flex flex-wrap gap-2">
                          {subcats.map((sub) => {
                            const subDocs = docCountByCategory.get(sub.id) ?? 0;
                            return (
                              <div
                                key={sub.id}
                                className="inline-flex items-center gap-2 rounded-xl border border-line bg-sand-soft/70 px-3 py-1.5 text-xs"
                              >
                                <Archive className="h-3.5 w-3.5 text-gold-dark" />
                                <span className="font-medium text-navy">{sub.name}</span>
                                <span className="text-[11px] text-ink-subtle tabular-nums">
                                  ({subDocs})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openEditCategory(sub)}
                                  className="p-0.5 text-ink-muted hover:text-navy"
                                  aria-label={`Editar ${sub.name}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: 'category',
                                      item: sub,
                                      docCount: subDocs,
                                      subCount: 0,
                                    })
                                  }
                                  className="p-0.5 text-ink-muted hover:text-red-600"
                                  aria-label={`Eliminar ${sub.name}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </m.div>
        ) : (
          /* Google Drive–Style Interactive Folder Explorer */
          <m.div
            key={`folders-${viewMode}-${currentFolderId ?? 'root'}-${activeCategoryFilter}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
            className="space-y-4"
          >
            {/* Drive Breadcrumbs + Category Quick Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-sand-soft/50 px-4 py-2.5">
              <nav aria-label="Ruta de carpetas" className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentFolderId(null);
                    setActiveCategoryFilter('');
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors',
                    !currentFolderId && !activeCategoryFilter
                      ? 'bg-white text-navy shadow-subtle font-semibold'
                      : 'text-ink-muted hover:text-navy hover:bg-white/70'
                  )}
                >
                  <Home className="h-3.5 w-3.5 text-gold-dark" />
                  Mi biblioteca
                </button>

                {activeCategoryFilter && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
                    <button
                      type="button"
                      onClick={() => setCurrentFolderId(null)}
                      className={cn(
                        'rounded-lg px-2 py-1 font-medium transition-colors',
                        !currentFolderId
                          ? 'bg-white text-navy shadow-subtle font-semibold'
                          : 'text-ink-muted hover:text-navy hover:bg-white/70'
                      )}
                    >
                      {categories.find((c) => c.id === activeCategoryFilter)?.name ?? 'Categoría'}
                    </button>
                  </>
                )}

                {folderTrail.map((fld, idx) => {
                  const isLast = idx === folderTrail.length - 1;
                  return (
                    <span key={fld.id} className="inline-flex items-center gap-1">
                      <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(fld.id)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition-colors',
                          isLast
                            ? 'bg-white text-navy shadow-subtle font-semibold'
                            : 'text-ink-muted hover:text-navy hover:bg-white/70'
                        )}
                      >
                        <FolderOpen className="h-3.5 w-3.5 text-gold-dark" />
                        {fld.name}
                      </button>
                    </span>
                  );
                })}
              </nav>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filtrar carpetas por categoría"
                  value={activeCategoryFilter}
                  onChange={(e) => {
                    setActiveCategoryFilter(e.target.value);
                    setCurrentFolderId(null);
                  }}
                  className="h-8 rounded-lg border border-line bg-white px-2.5 text-xs font-medium text-navy"
                >
                  <option value="">Todas las categorías</option>
                  {topCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {currentFolder && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setAddBooksFolderId(currentFolder.id)}
                  >
                    <BookPlus className="h-3.5 w-3.5" />
                    Agregar libros
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openCreateFolder(activeCategoryFilter, currentFolderId ?? '')}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  {currentFolder ? 'Subcarpeta' : 'Aquí'}
                </Button>
              </div>
            </div>

            {visibleFolders.length === 0 && docsInCurrentFolder.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-3xl border border-line bg-white shadow-subtle">
                <LexNotFoundMascot compact className="mb-2" />
                <p className="text-base font-semibold text-navy">
                  {currentFolder
                    ? `La carpeta "${currentFolder.name}" aún está vacía`
                    : 'No hay carpetas en esta vista'}
                </p>
                <p className="text-xs text-ink-muted mt-1 max-w-md">
                  {currentFolder
                    ? 'Agrega libros existentes del catálogo, registra un documento nuevo o importa archivos desde Google Drive.'
                    : 'Crea una carpeta manualmente aquí o importa carpetas completas desde Google Drive.'}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {currentFolder ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setAddBooksFolderId(currentFolder.id)}
                      >
                        <BookPlus className="h-3.5 w-3.5" />
                        Agregar libros
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openCreateDocInFolder(currentFolder)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Crear libro aquí
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openImportDriveInFolder(currentFolder)}
                      >
                        <Cloud className="h-3.5 w-3.5" />
                        Importar de Drive
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCreateFolder(activeCategoryFilter, currentFolder.id)}
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                        Crear subcarpeta
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openCreateFolder(activeCategoryFilter, '')}
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                        Crear carpeta
                      </Button>
                      <Link to="/admin/documentos">
                        <Button variant="secondary" size="sm">
                          <Cloud className="h-3.5 w-3.5" />
                          Importar desde Drive
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {visibleFolders.length > 0 &&
                  (viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                      {visibleFolders.map((fld) => {
                        const cat = categories.find((c) => c.id === fld.category_id);
                        const docCount = docCountByFolder.get(fld.id) ?? 0;
                        const childCount = childFolderCountByParent.get(fld.id) ?? 0;

                        return (
                          <div
                            key={fld.id}
                            className="group rounded-2xl border border-line bg-white p-4 hover:border-navy/30 hover:bg-sand-soft/35 hover:shadow-subtle transition-all flex flex-col justify-between gap-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setCurrentFolderId(fld.id)}
                                className="flex items-start gap-3 min-w-0 text-left flex-1"
                              >
                                <span className="h-10 w-10 rounded-xl bg-gold-soft border border-gold/25 text-gold-dark inline-flex items-center justify-center shrink-0 group-hover:bg-navy group-hover:text-gold group-hover:border-navy transition-colors">
                                  <Folder className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-navy truncate group-hover:text-navy-secondary">
                                    {fld.name}
                                  </p>
                                  <p className="text-[11px] text-ink-muted truncate mt-0.5">
                                    {cat?.name ?? 'Sin categoría'}
                                  </p>
                                </div>
                              </button>

                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setAddBooksFolderId(fld.id)}
                                  aria-label={`Agregar libros a ${fld.name}`}
                                  title="Agregar libros a esta carpeta"
                                  className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-gold-dark hover:text-navy hover:bg-gold-soft/70 transition-colors"
                                >
                                  <BookPlus className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditFolder(fld)}
                                  aria-label={`Editar carpeta ${fld.name}`}
                                  title="Editar carpeta"
                                  className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-white"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: 'folder',
                                      item: fld,
                                      docCount,
                                      childCount,
                                    })
                                  }
                                  aria-label={`Eliminar carpeta ${fld.name}`}
                                  title="Eliminar carpeta"
                                  className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60 text-[11px] text-ink-subtle">
                              <span className="tabular-nums truncate">
                                {childCount > 0 ? `${childCount} subcarpetas · ` : ''}
                                {docCount} {docCount === 1 ? 'libro' : 'libros'}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                {fld.drive_folder_id && (
                                  <Badge variant="gold" className="text-[10px] px-1.5 py-0">
                                    <Cloud className="h-2.5 w-2.5 mr-1 inline" />
                                    Drive
                                  </Badge>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setAddBooksFolderId(fld.id)}
                                  className="font-medium text-gold-dark hover:text-navy inline-flex items-center gap-1 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                  Libros
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCurrentFolderId(fld.id)}
                                  className="font-medium text-navy hover:text-gold-dark inline-flex items-center gap-0.5"
                                >
                                  Abrir
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden shadow-subtle">
                      {visibleFolders.map((fld) => {
                        const cat = categories.find((c) => c.id === fld.category_id);
                        const docCount = docCountByFolder.get(fld.id) ?? 0;
                        const childCount = childFolderCountByParent.get(fld.id) ?? 0;

                        return (
                          <div
                            key={fld.id}
                            className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-sand-soft/40 transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => setCurrentFolderId(fld.id)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left"
                            >
                              <span className="h-9 w-9 rounded-xl bg-gold-soft text-gold-dark inline-flex items-center justify-center shrink-0">
                                <Folder className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-navy truncate">
                                    {fld.name}
                                  </p>
                                  {fld.drive_folder_id && (
                                    <Badge variant="gold">
                                      <Cloud className="h-3 w-3 mr-1 inline" />
                                      Google Drive
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-ink-muted truncate">
                                  {cat?.name ?? 'Sin categoría'} · {childCount} subcarpetas ·{' '}
                                  {docCount} archivos
                                </p>
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setAddBooksFolderId(fld.id)}
                              >
                                <BookPlus className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Agregar libros</span>
                              </Button>
                              <button
                                type="button"
                                onClick={() => openEditFolder(fld)}
                                aria-label={`Editar carpeta ${fld.name}`}
                                className="h-8 w-8 rounded-lg border border-line bg-white inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-sand-soft"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    kind: 'folder',
                                    item: fld,
                                    docCount,
                                    childCount,
                                  })
                                }
                                aria-label={`Eliminar carpeta ${fld.name}`}
                                className="h-8 w-8 rounded-lg border border-line bg-white inline-flex items-center justify-center text-ink-muted hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                {/* Files directly inside the currently opened folder */}
                {currentFolder && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                        Libros y documentos en esta carpeta ({docsInCurrentFolder.length})
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openCreateDocInFolder(currentFolder)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Nuevo libro
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setAddBooksFolderId(currentFolder.id)}
                        >
                          <BookPlus className="h-3.5 w-3.5" />
                          Agregar libros
                        </Button>
                      </div>
                    </div>

                    {docsInCurrentFolder.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-line-strong bg-sand-soft/30 px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-ink-muted">
                          <p className="font-semibold text-navy text-sm">
                            Aún no hay libros directos en esta carpeta
                          </p>
                          <p className="mt-0.5">
                            Asigna libros existentes del catálogo, crea un registro nuevo o importa desde Google Drive.
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setAddBooksFolderId(currentFolder.id)}
                        >
                          <BookPlus className="h-3.5 w-3.5" />
                          Agregar libros
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden shadow-subtle">
                        {docsInCurrentFolder.map((doc) => (
                          <div
                            key={doc.id}
                            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-sand-soft/40 transition-colors"
                          >
                            <Link
                              to={`/libro/${doc.id}`}
                              className="flex items-center gap-3 min-w-0 flex-1"
                            >
                              <span
                                className="h-9 w-6 rounded-[4px] shrink-0 border border-black/10"
                                style={{ backgroundColor: doc.color || '#101D35' }}
                                aria-hidden="true"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-navy truncate">
                                  {doc.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                                  <span className="truncate max-w-[200px]">{doc.author}</span>
                                  {doc.year && <span>· {doc.year}</span>}
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {getDocumentTypeLabel(doc.document_type)}
                                  </Badge>
                                </div>
                              </div>
                            </Link>

                            <div className="flex items-center gap-1 shrink-0">
                              <Link
                                to={`/libro/${doc.id}`}
                                title="Ver ficha"
                                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-white"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                              <button
                                type="button"
                                title="Editar metadatos"
                                onClick={() => {
                                  setEditingDoc(doc);
                                  setDocFormLocation(null);
                                  setDocFormOpen(true);
                                }}
                                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-white"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Quitar de esta carpeta"
                                aria-label={`Quitar ${doc.title} de esta carpeta`}
                                disabled={removingDocId === doc.id}
                                onClick={() => void handleRemoveDocFromFolder(doc.id)}
                                className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <FolderMinus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>

      {/* Create / Edit Category Modal */}
      <Modal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCat ? 'Editar categoría' : 'Nueva categoría o subcategoría'}
        description={
          editingCat
            ? 'Actualiza el nombre, icono, descripción o jerarquía de esta sección.'
            : 'Crea una nueva categoría principal o subcategoría dentro de una sección existente.'
        }
        size="md"
      >
        <form onSubmit={(e) => void handleSaveCategory(e)} className="p-6 space-y-4">
          <Input
            label="Nombre *"
            required
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Ej. Derecho Administrativo"
          />

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-navy">
                Jerarquía (categoría padre)
              </label>
              <select
                value={catParentId}
                onChange={(e) => setCatParentId(e.target.value)}
                className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
              >
                <option value="">Sección principal (nivel superior)</option>
                {topCategories
                  .filter((c) => c.id !== editingCat?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      Dentro de: {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <Input
              label="Orden"
              type="number"
              min={1}
              value={catSortOrder}
              onChange={(e) => setCatSortOrder(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Icono representativo</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map(({ id, label, icon: IconComp }) => {
                const selected = catIcon === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCatIcon(id)}
                    title={label}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 px-1 text-[10px] font-medium transition-all',
                      selected
                        ? 'border-navy bg-navy text-gold shadow-sm'
                        : 'border-line bg-white text-ink-muted hover:border-navy/30 hover:bg-sand-soft'
                    )}
                  >
                    <IconComp className="h-4 w-4" />
                    <span className="truncate max-w-full">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Descripción</label>
            <textarea
              rows={3}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Breve descripción temática para orientar a los lectores..."
              className="w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-navy"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setCatModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={savingCat}>
              {editingCat ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Folder Modal */}
      <Modal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title={editingFolder ? 'Editar carpeta' : 'Nueva carpeta o subcarpeta'}
        description={
          editingFolder
            ? 'Renombra la carpeta o cámbiala de categoría o ubicación padre.'
            : 'Organiza tus documentos en carpetas y subcarpetas temáticas.'
        }
        size="md"
      >
        <form onSubmit={(e) => void handleSaveFolder(e)} className="p-6 space-y-4">
          <Input
            label="Nombre de la carpeta *"
            required
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Ej. Sentencias TC 2024"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Categoría</label>
            <select
              value={folderCatId}
              onChange={(e) => {
                setFolderCatId(e.target.value);
                setFolderParentId('');
              }}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="">Sin categoría específica</option>
              {topCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">
              Carpeta padre (para crear subcarpeta)
            </label>
            <select
              value={folderParentId}
              onChange={(e) => setFolderParentId(e.target.value)}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="">Nivel raíz</option>
              {folders
                .filter(
                  (f) =>
                    f.id !== editingFolder?.id &&
                    (!folderCatId || f.category_id === folderCatId)
                )
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </div>

          <Input
            label="Descripción (opcional)"
            value={folderDesc}
            onChange={(e) => setFolderDesc(e.target.value)}
            placeholder="Breve nota descriptiva..."
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="secondary" onClick={() => setFolderModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={savingFolder}>
              {editingFolder ? 'Guardar cambios' : 'Crear carpeta'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Branded Safe Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={
          deleteTarget?.kind === 'category' ? 'Eliminar categoría' : 'Eliminar carpeta'
        }
        size="sm"
      >
        {deleteTarget && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-ink leading-relaxed">
              ¿Seguro que deseas eliminar{' '}
              <strong className="text-navy">"{deleteTarget.item.name}"</strong>?
            </p>
            <div className="rounded-xl bg-sand-soft border border-line p-3.5 text-xs text-ink-muted space-y-1">
              {deleteTarget.kind === 'category' ? (
                <>
                  <p>
                    • Los{' '}
                    <strong className="text-navy">
                      {deleteTarget.docCount} documentos
                    </strong>{' '}
                    asociados NO se eliminarán (solo quedarán sin esta categoría asignada).
                  </p>
                  {deleteTarget.subCount > 0 && (
                    <p>
                      • Sus{' '}
                      <strong className="text-navy">
                        {deleteTarget.subCount} subcategorías
                      </strong>{' '}
                      pasarán al nivel superior.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>
                    • Solo se eliminará el registro en Supabase.{' '}
                    <strong className="text-navy">
                      Google Drive nunca se modifica.
                    </strong>
                  </p>
                  <p>
                    • Los{' '}
                    <strong className="text-navy">
                      {deleteTarget.docCount} documentos
                    </strong>{' '}
                    conservarán su registro en el catálogo.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                loading={deleting}
                onClick={() => void handleConfirmDelete()}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar definitivamente
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Add Existing Books to Folder Modal */}
      <FolderAddBooksModal
        folder={addBooksFolder}
        onClose={() => setAddBooksFolderId(null)}
        books={books}
        folders={folders}
        categories={categories}
        onAssignBooks={handleAssignBooksToFolder}
        onRemoveBook={handleRemoveDocFromFolder}
        onCreateNewInFolder={openCreateDocInFolder}
        onImportDriveInFolder={openImportDriveInFolder}
      />

      {/* Create / Edit Document Directly in Folder */}
      <DocumentFormModal
        open={docFormOpen}
        onClose={() => setDocFormOpen(false)}
        document={editingDoc}
        categories={categories}
        folders={folders}
        defaultLocation={docFormLocation}
        onSave={handleSaveDocument}
      />

      {/* Import from Google Drive Directly into Folder */}
      <DriveImportModal
        open={driveImportOpen}
        onClose={() => setDriveImportOpen(false)}
        driveConnected={Boolean(driveQuery.data?.connected)}
        categories={categories}
        folders={folders}
        defaultLocation={driveImportLocation}
        onImported={invalidateOrg}
      />
    </div>
  );
}
