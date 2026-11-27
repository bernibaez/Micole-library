import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cloud,
  Edit3,
  Eye,
  FolderInput,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { AdminNavHeader } from './AdminNavHeader';
import { DocumentFormModal } from './DocumentFormModal';
import { DriveImportModal } from './DriveImportModal';
import {
  deleteAdminDocument,
  fetchAdminDocuments,
  moveAdminDocument,
  saveAdminDocument,
  type UpsertDocumentInput,
} from '../../services/adminService';
import { fetchDriveConnectionSummary } from '../../services/driveService';
import {
  QUERY_KEYS,
  useCategoriesQuery,
  useFoldersQuery,
} from '../library/useLibraryData';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/feedback/EmptyState';
import { useToast } from '../../components/feedback/ToastProvider';
import {
  DOCUMENT_TYPE_LABELS,
  getDocumentTypeLabel,
  getSyncStatusLabel,
  getValidityStatusLabel,
  normalizeText,
} from '../../utils/format';
import type { Book } from '../../types';

export function AdminDocumentsPage() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const docsQuery = useQuery({
    queryKey: QUERY_KEYS.adminDocuments,
    queryFn: fetchAdminDocuments,
  });
  const driveQuery = useQuery({
    queryKey: QUERY_KEYS.driveSummary,
    queryFn: fetchDriveConnectionSummary,
  });
  const { data: categories = [] } = useCategoriesQuery();
  const { data: folders = [] } = useFoldersQuery();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [syncFilter, setSyncFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Book | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [moveTargetDoc, setMoveTargetDoc] = useState<Book | null>(null);
  const [moveCatId, setMoveCatId] = useState('');
  const [moveSubId, setMoveSubId] = useState('');
  const [moveFolderId, setMoveFolderId] = useState('');
  const [moving, setMoving] = useState(false);

  const [deleteTargetDoc, setDeleteTargetDoc] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const docs = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);

  const filteredDocs = useMemo(() => {
    const q = normalizeText(search);
    return docs.filter((d) => {
      if (categoryFilter && d.category_id !== categoryFilter) return false;
      if (typeFilter && d.document_type !== typeFilter) return false;
      if (syncFilter && d.sync_status !== syncFilter) return false;
      if (!q) return true;
      const hay = normalizeText(
        [d.title, d.name ?? '', d.author, d.subject ?? '', d.court ?? '', d.judgment_number ?? ''].join(' ')
      );
      return hay.includes(q);
    });
  }, [categoryFilter, docs, search, syncFilter, typeFilter]);

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDocuments });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.books });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.folders });
  };

  const handleSaveDoc = async (payload: UpsertDocumentInput) => {
    await saveAdminDocument(payload);
    notify(payload.id ? 'Metadatos actualizados' : 'Documento registrado en la biblioteca');
    invalidateAll();
  };

  const openMoveModal = (doc: Book) => {
    setMoveTargetDoc(doc);
    setMoveCatId(doc.category_id ?? '');
    setMoveSubId(doc.subcategory_id ?? '');
    setMoveFolderId(doc.folder_id ?? '');
  };

  const handleConfirmMove = async () => {
    if (!moveTargetDoc) return;
    setMoving(true);
    try {
      await moveAdminDocument(moveTargetDoc.id, {
        category_id: moveCatId || null,
        subcategory_id: moveSubId || null,
        folder_id: moveFolderId || null,
      });
      notify('Documento reubicado correctamente');
      setMoveTargetDoc(null);
      invalidateAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo mover el documento.', 'error');
    } finally {
      setMoving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetDoc) return;
    setDeleting(true);
    try {
      await deleteAdminDocument(deleteTargetDoc.id);
      notify('Registro eliminado de Supabase (el archivo en Google Drive se conserva intacto).');
      setDeleteTargetDoc(null);
      invalidateAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo eliminar el registro.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminNavHeader
        title="Gestión documental"
        subtitle="Agrega registros manuales, importa archivos o carpetas completas desde Google Drive, edita metadatos y organiza el acervo."
        actions={
          <>
            <Button
              variant="gold"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Cloud className="h-4 w-4" />
              Importar desde Google Drive
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingDoc(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Agregar documento
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[220px] flex items-center gap-2 h-10 rounded-xl border border-line-strong bg-white px-3">
          <Search className="h-4 w-4 text-ink-muted shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, autor, materia o sentencia..."
            className="w-full min-w-0 bg-transparent text-sm focus:outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filtrar por categoría"
          className="h-10 rounded-xl border border-line-strong bg-white px-3 text-xs font-medium text-ink"
        >
          <option value="">Todas las categorías</option>
          {topCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filtrar por tipo"
          className="h-10 rounded-xl border border-line-strong bg-white px-3 text-xs font-medium text-ink"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={syncFilter}
          onChange={(e) => setSyncFilter(e.target.value)}
          aria-label="Filtrar por estado de sincronización"
          className="h-10 rounded-xl border border-line-strong bg-white px-3 text-xs font-medium text-ink"
        >
          <option value="">Todos los estados</option>
          <option value="synced">Sincronizado (Drive)</option>
          <option value="manual">Manual</option>
          <option value="missing">No encontrado en Drive</option>
          <option value="deleted">Eliminado en Drive</option>
          <option value="error">Con error</option>
        </select>
      </div>

      {/* Document List */}
      {docsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          title="No hay documentos registrados con estos filtros"
          description="Importa documentos o carpetas completas desde Google Drive, o crea un registro manual."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="gold" onClick={() => setImportOpen(true)}>
                <Cloud className="h-4 w-4" />
                Importar desde Drive
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingDoc(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Agregar documento
              </Button>
            </div>
          }
        />
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface-secondary/60 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Organización</th>
                  <th className="py-3 px-4">Tipo / Vigencia</th>
                  <th className="py-3 px-4">Acceso / Sync</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filteredDocs.map((doc) => {
                  const folderName = doc.folder_id ? folderById.get(doc.folder_id)?.name : null;
                  const validity = getValidityStatusLabel(doc.validity_status);
                  return (
                    <tr key={doc.id} className="hover:bg-surface-secondary/40 transition-colors">
                      <td className="py-3.5 px-4 max-w-[320px]">
                        <p className="font-semibold text-navy truncate">{doc.title}</p>
                        <p className="text-xs text-ink-muted truncate">
                          {doc.author}
                          {doc.year ? ` · ${doc.year}` : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <p className="font-medium text-navy">{doc.category}</p>
                        {folderName && (
                          <p className="text-ink-muted truncate max-w-[180px]">{folderName}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">
                            {getDocumentTypeLabel(doc.document_type)}
                          </Badge>
                          {validity && <Badge variant="neutral">{validity}</Badge>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={doc.published ? 'gold' : 'neutral'}>
                            {doc.published ? doc.visibility || 'public' : 'Oculto'}
                          </Badge>
                          <Badge variant="neutral">{getSyncStatusLabel(doc.sync_status)}</Badge>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/libro/${doc.id}`}
                            title="Ver ficha"
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-surface-secondary"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            title="Editar metadatos"
                            onClick={() => {
                              setEditingDoc(doc);
                              setFormOpen(true);
                            }}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-surface-secondary"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Mover documento"
                            onClick={() => openMoveModal(doc)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-ink-muted hover:text-navy hover:bg-surface-secondary"
                          >
                            <FolderInput className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Eliminar registro"
                            onClick={() => setDeleteTargetDoc(doc)}
                            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Document Modal */}
      <DocumentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        document={editingDoc}
        categories={categories}
        folders={folders}
        onSave={handleSaveDoc}
      />

      {/* Google Drive Picker Import Modal */}
      <DriveImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        driveConnected={Boolean(driveQuery.data?.connected)}
        categories={categories}
        folders={folders}
        onImported={invalidateAll}
      />

      {/* Move Document Modal */}
      <Modal
        open={Boolean(moveTargetDoc)}
        onClose={() => setMoveTargetDoc(null)}
        size="sm"
        title="Mover documento"
        description={moveTargetDoc?.title}
      >
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Categoría</label>
            <select
              value={moveCatId}
              onChange={(e) => {
                setMoveCatId(e.target.value);
                setMoveSubId('');
                setMoveFolderId('');
              }}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm"
            >
              <option value="">Sin categoría</option>
              {topCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Subcategoría</label>
            <select
              value={moveSubId}
              onChange={(e) => setMoveSubId(e.target.value)}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm"
            >
              <option value="">Ninguna</option>
              {categories
                .filter((c) => c.parent_id === moveCatId)
                .map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Carpeta</label>
            <select
              value={moveFolderId}
              onChange={(e) => setMoveFolderId(e.target.value)}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm"
            >
              <option value="">Raíz de la categoría</option>
              {folders
                .filter((f) => !moveCatId || f.category_id === moveCatId)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setMoveTargetDoc(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={moving}
              onClick={() => void handleConfirmMove()}
            >
              Mover
            </Button>
          </div>
        </div>
      </Modal>

      {/* Safe Delete Confirmation Modal */}
      <Modal
        open={Boolean(deleteTargetDoc)}
        onClose={() => setDeleteTargetDoc(null)}
        size="sm"
        title="Eliminar registro del catálogo"
        description="Esta acción elimina únicamente los metadatos en Supabase."
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-ink">
            ¿Deseas eliminar <strong className="text-navy">{deleteTargetDoc?.title}</strong> del
            catálogo?
          </p>
          <p className="text-xs text-ink-muted bg-surface-secondary border border-line rounded-xl p-3">
            El archivo original almacenado en Google Drive <strong>no será modificado ni eliminado</strong>.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteTargetDoc(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              Eliminar registro
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
