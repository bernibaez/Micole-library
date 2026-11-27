import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DOCUMENT_TYPE_LABELS, VALIDITY_STATUS_LABELS } from '../../utils/format';
import type {
  Book,
  CategoryInfo,
  DocumentType,
  DocumentVisibility,
  LibraryFolder,
  ValidityStatus,
} from '../../types';
import type { UpsertDocumentInput } from '../../services/adminService';

interface DocumentLocationDefaults {
  categoryId?: string | null;
  subcategoryId?: string | null;
  folderId?: string | null;
}

interface DocumentFormModalProps {
  open: boolean;
  onClose: () => void;
  document: Book | null;
  categories: CategoryInfo[];
  folders: LibraryFolder[];
  defaultLocation?: DocumentLocationDefaults | null;
  onSave: (payload: UpsertDocumentInput) => Promise<void>;
}

const COVER_COLORS = ['#101D35', '#1C3152', '#2F4D44', '#5C3A41', '#4E3B31', '#3B4259', '#25394D'];

function DocumentFormFields({
  editingDoc,
  categories,
  folders,
  defaultLocation,
  onClose,
  onSave,
}: {
  editingDoc: Book | null;
  categories: CategoryInfo[];
  folders: LibraryFolder[];
  defaultLocation?: DocumentLocationDefaults | null;
  onClose: () => void;
  onSave: (payload: UpsertDocumentInput) => Promise<void>;
}) {
  const topCategories = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const [title, setTitle] = useState(editingDoc?.title ?? '');
  const [name, setName] = useState(editingDoc?.name ?? editingDoc?.title ?? '');
  const [author, setAuthor] = useState(editingDoc?.author ?? '');
  const [publisher, setPublisher] = useState(editingDoc?.publisher ?? '');
  const [publicationDate, setPublicationDate] = useState(editingDoc?.publication_date ?? '');
  const [year, setYear] = useState(editingDoc?.year ? String(editingDoc.year) : '');
  const [subject, setSubject] = useState(editingDoc?.subject ?? '');
  const [categoryId, setCategoryId] = useState(
    editingDoc?.category_id ?? defaultLocation?.categoryId ?? topCategories[0]?.id ?? ''
  );
  const [subcategoryId, setSubcategoryId] = useState(
    editingDoc?.subcategory_id ?? defaultLocation?.subcategoryId ?? ''
  );
  const [folderId, setFolderId] = useState(
    editingDoc?.folder_id ?? defaultLocation?.folderId ?? ''
  );
  const [documentType, setDocumentType] = useState<DocumentType>(
    editingDoc?.document_type ?? 'libro'
  );
  const [validityStatus, setValidityStatus] = useState<ValidityStatus>(
    editingDoc?.validity_status ?? 'no_aplica'
  );
  const [country, setCountry] = useState(editingDoc?.country ?? 'República Dominicana');
  const [court, setCourt] = useState(editingDoc?.court ?? '');
  const [judgmentNumber, setJudgmentNumber] = useState(editingDoc?.judgment_number ?? '');
  const [pageCount, setPageCount] = useState(editingDoc?.pages ? String(editingDoc.pages) : '');
  const [language, setLanguage] = useState(editingDoc?.language ?? 'Español');
  const [isbn, setIsbn] = useState(editingDoc?.isbn ?? '');
  const [source, setSource] = useState(editingDoc?.source ?? '');
  const [description, setDescription] = useState(editingDoc?.description ?? '');
  const [keywordsText, setKeywordsText] = useState((editingDoc?.keywords ?? []).join(', '));
  const [externalUrl, setExternalUrl] = useState(
    editingDoc?.file_url && !editingDoc.file_url.startsWith('drive://') ? editingDoc.file_url : ''
  );
  const [driveFileId, setDriveFileId] = useState(editingDoc?.drive_file_id ?? '');
  const [color, setColor] = useState(editingDoc?.color || '#101D35');
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    editingDoc?.visibility ?? 'public'
  );
  const [published, setPublished] = useState(editingDoc ? editingDoc.published !== false : true);
  const [featured, setFeatured] = useState(Boolean(editingDoc?.featured));
  const [allowPreview, setAllowPreview] = useState(
    editingDoc ? editingDoc.allow_preview !== false : true
  );
  const [allowDownload, setAllowDownload] = useState(
    editingDoc ? editingDoc.allow_download !== false : true
  );
  const [saving, setSaving] = useState(false);

  const subcategoriesForSelected = useMemo(
    () => categories.filter((c) => c.parent_id === categoryId),
    [categories, categoryId]
  );

  const foldersForSelected = useMemo(
    () => folders.filter((f) => !categoryId || f.category_id === categoryId || f.id === folderId),
    [categoryId, folderId, folders]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: editingDoc?.id,
        name: name.trim() || title.trim(),
        title: title.trim(),
        author: author.trim() || 'Autor no especificado',
        publisher: publisher.trim() || null,
        publication_date: publicationDate || null,
        year: year ? Number(year) : null,
        subject: subject.trim() || null,
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        folder_id: folderId || null,
        description: description.trim(),
        document_type: documentType,
        page_count: pageCount ? Number(pageCount) : null,
        validity_status: validityStatus,
        country: country.trim() || 'República Dominicana',
        court: court.trim() || null,
        judgment_number: judgmentNumber.trim() || null,
        language: language.trim() || 'Español',
        isbn: isbn.trim() || null,
        source: source.trim() || null,
        keywords: keywordsText
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        color,
        external_url: externalUrl.trim() || null,
        drive_file_id: driveFileId.trim() || null,
        visibility,
        published,
        featured,
        allow_preview: allowPreview,
        allow_download: allowDownload,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="p-6 space-y-5 max-h-[75vh] overflow-y-auto"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Título del documento *"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Código Procesal Penal de la República Dominicana"
        />
        <Input
          label="Nombre de archivo / referencia"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. ley-76-02-cpp.pdf"
        />
        <Input
          label="Autor / Órgano emisor"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Ej. Congreso Nacional / Autor"
        />
        <Input
          label="Editorial"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
          placeholder="Editorial o institución"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-navy">Categoría principal</label>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId('');
              setFolderId('');
            }}
            className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
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
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            disabled={subcategoriesForSelected.length === 0}
            className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink disabled:bg-surface-secondary"
          >
            <option value="">Ninguna</option>
            {subcategoriesForSelected.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-navy">Carpeta</label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
          >
            <option value="">Raíz de la categoría</option>
            {foldersForSelected.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-navy">Tipo de documento</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
          >
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-navy">Estado de vigencia</label>
          <select
            value={validityStatus}
            onChange={(e) => setValidityStatus(e.target.value as ValidityStatus)}
            className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
          >
            {Object.entries(VALIDITY_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Materia"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ej. Derecho Constitucional"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Input
          label="Fecha de publicación"
          type="date"
          value={publicationDate}
          onChange={(e) => setPublicationDate(e.target.value)}
        />
        <Input
          label="Año"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="2025"
        />
        <Input
          label="Páginas"
          type="number"
          value={pageCount}
          onChange={(e) => setPageCount(e.target.value)}
          placeholder="240"
        />
        <Input
          label="País / Jurisdicción"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Tribunal (si es sentencia/jurisprudencia)"
          value={court}
          onChange={(e) => setCourt(e.target.value)}
          placeholder="Ej. Tribunal Constitucional / SCJ"
        />
        <Input
          label="Número de sentencia"
          value={judgmentNumber}
          onChange={(e) => setJudgmentNumber(e.target.value)}
          placeholder="Ej. TC/0168/13"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Idioma" value={language} onChange={(e) => setLanguage(e.target.value)} />
        <Input label="ISBN" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
        <Input label="Fuente" value={source} onChange={(e) => setSource(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-navy">Descripción / Resumen</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Resumen jurídico del contenido, alcance normativo o criterios relevantes..."
          className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-2.5 text-sm text-ink focus:border-navy focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Palabras clave (separadas por coma)"
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          placeholder="casación, debido proceso, prueba"
        />
        <Input
          label="ID de Google Drive (solo si aplica)"
          value={driveFileId}
          onChange={(e) => setDriveFileId(e.target.value)}
          disabled={Boolean(editingDoc?.drive_file_id)}
          placeholder="Identificador de archivo en Drive"
        />
      </div>

      {!driveFileId && (
        <Input
          label="Enlace externo del archivo (PDF o documento)"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://..."
        />
      )}

      <div className="rounded-2xl border border-line bg-surface-secondary/50 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">
              Nivel de acceso (validado en backend)
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="public">Público (visitantes y registrados)</option>
              <option value="registered">Solo usuarios registrados</option>
              <option value="admin_only">Privado (solo administrador)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Color editorial de portada</label>
            <div className="flex items-center gap-2">
              {COVER_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={`Seleccionar color ${hex}`}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    color === hex ? 'border-gold scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-xs font-medium text-navy pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="accent-navy h-4 w-4"
            />
            Publicado en catálogo
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPreview}
              onChange={(e) => setAllowPreview(e.target.checked)}
              className="accent-navy h-4 w-4"
            />
            Permitir lectura / vista previa
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="accent-navy h-4 w-4"
            />
            Permitir descarga autorizada
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="accent-navy h-4 w-4"
            />
            Destacar en portada
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {editingDoc ? 'Guardar cambios' : 'Registrar documento'}
        </Button>
      </div>
    </form>
  );
}

export function DocumentFormModal({
  open,
  onClose,
  document: editingDoc,
  categories,
  folders,
  defaultLocation,
  onSave,
}: DocumentFormModalProps) {
  const formKey = editingDoc?.id
    ? `edit-${editingDoc.id}`
    : `new-${defaultLocation?.categoryId ?? ''}-${defaultLocation?.subcategoryId ?? ''}-${defaultLocation?.folderId ?? ''}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={editingDoc ? 'Editar metadatos del documento' : 'Agregar documento manualmente'}
      description="Los metadatos se guardan en Supabase; los archivos permanecen en Google Drive o referencia externa."
    >
      {open && (
        <DocumentFormFields
          key={formKey}
          editingDoc={editingDoc}
          categories={categories}
          folders={folders}
          defaultLocation={defaultLocation}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
}
