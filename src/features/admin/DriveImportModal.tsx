import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Check, CheckCircle2, Cloud, FileUp, FolderInput, Palette } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  importFromGoogleDrive,
  requestGooglePickerToken,
  type DriveImportResult,
} from '../../services/driveService';
import { isGooglePickerConfigured, openGooglePicker } from '../../lib/googlePicker';
import { useToast } from '../../components/feedback/ToastProvider';
import { EDITORIAL_COVER_COLORS, EDITORIAL_COVER_HEXES } from '../../utils/bookColors';
import { VALIDITY_STATUS_LABELS } from '../../utils/format';
import type {
  CategoryInfo,
  DocumentVisibility,
  LibraryFolder,
  ValidityStatus,
} from '../../types';

interface DriveImportLocationDefaults {
  categoryId?: string | null;
  subcategoryId?: string | null;
  folderId?: string | null;
}

interface DriveImportModalProps {
  open: boolean;
  onClose: () => void;
  driveConnected: boolean;
  categories: CategoryInfo[];
  folders: LibraryFolder[];
  defaultLocation?: DriveImportLocationDefaults | null;
  onImported: () => void;
}

function DriveImportContent({
  onClose,
  driveConnected,
  categories,
  folders,
  defaultLocation,
  onImported,
}: Omit<DriveImportModalProps, 'open'>) {
  const { notify } = useToast();
  const topCategories = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const [categoryId, setCategoryId] = useState(
    defaultLocation?.categoryId ?? topCategories[0]?.id ?? ''
  );
  const [subcategoryId, setSubcategoryId] = useState(defaultLocation?.subcategoryId ?? '');
  const [targetFolderId, setTargetFolderId] = useState(defaultLocation?.folderId ?? '');
  const [visibility, setVisibility] = useState<DocumentVisibility>('public');
  const [validityStatus, setValidityStatus] = useState<ValidityStatus>('no_aplica');
  const [subject, setSubject] = useState('');
  const [published, setPublished] = useState(true);
  const [allowPreview, setAllowPreview] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [colorMode, setColorMode] = useState<'varied' | 'single'>('varied');
  const [selectedColors, setSelectedColors] = useState<string[]>(() => [...EDITORIAL_COVER_HEXES]);
  const [singleColor, setSingleColor] = useState<string>(EDITORIAL_COVER_HEXES[0]);
  const [extractCovers, setExtractCovers] = useState(true);
  const [busyMode, setBusyMode] = useState<'files' | 'folders' | null>(null);
  const [result, setResult] = useState<DriveImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleVariedColor = (hex: string) => {
    setSelectedColors((prev) => {
      if (prev.includes(hex)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== hex);
      }
      return [...prev, hex];
    });
  };

  const subcategories = useMemo(
    () => categories.filter((c) => c.parent_id === categoryId),
    [categories, categoryId]
  );

  const availableFolders = useMemo(
    () =>
      folders.filter(
        (f) => !categoryId || f.category_id === categoryId || f.id === targetFolderId
      ),
    [categoryId, folders, targetFolderId]
  );

  const pickerReady = isGooglePickerConfigured();

  const handleLaunchPicker = async (mode: 'files' | 'folders') => {
    setErrorMsg(null);
    setResult(null);
    setBusyMode(mode);
    try {
      const { accessToken } = await requestGooglePickerToken();
      const selected = await openGooglePicker({
        accessToken,
        mode,
        title:
          mode === 'folders'
            ? 'Selecciona carpetas completas de Google Drive'
            : 'Selecciona documentos (PDF, Word, Google Docs)',
      });

      if (selected.length === 0) {
        setBusyMode(null);
        return;
      }

      const activeColors =
        colorMode === 'single'
          ? [singleColor]
          : selectedColors.length > 0
            ? selectedColors
            : EDITORIAL_COVER_HEXES;

      const importRes = await importFromGoogleDrive({
        items: selected,
        categoryId: categoryId || null,
        subcategoryId: subcategoryId || null,
        targetFolderId: targetFolderId || null,
        visibility,
        published,
        allowPreview,
        allowDownload,
        validityStatus,
        subject: subject.trim() || null,
        colorMode,
        coverColors: activeColors,
        extractCovers,
      });

      setResult(importRes);
      onImported();
      notify(
        `Importación completada: ${importRes.report.documentsImported} documentos y ${importRes.report.foldersProcessed} carpetas.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo completar la importación.';
      setErrorMsg(msg);
      notify(msg, 'error');
    } finally {
      setBusyMode(null);
    }
  };

  return (
    <div className="p-6 space-y-5 max-h-[76vh] overflow-y-auto">
        {!driveConnected ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2.5 text-sm text-amber-950">
            <p className="font-semibold flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Google Drive aún no está conectado
            </p>
            <p className="text-xs leading-relaxed">
              Conecta primero la cuenta dedicada de Google Drive en la configuración administrativa
              para poder abrir Google Picker e importar archivos o carpetas.
            </p>
            <Link to="/admin/google-drive" onClick={onClose}>
              <Button variant="primary" size="sm">
                Ir a Configuración de Google Drive
              </Button>
            </Link>
          </div>
        ) : !pickerReady ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 space-y-1.5">
            <p className="font-semibold">Faltan variables públicas de Google Picker</p>
            <p>
              Configura <code>VITE_GOOGLE_API_KEY</code> y <code>VITE_GOOGLE_APP_ID</code> en tu
              entorno para habilitar el selector oficial de Google Drive.
            </p>
          </div>
        ) : null}

        {/* Destination & Default Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Categoría de destino</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId('');
                setTargetFolderId('');
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
            <label className="block text-xs font-medium text-navy">Subcategoría (opcional)</label>
            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              disabled={subcategories.length === 0}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink disabled:bg-surface-secondary"
            >
              <option value="">Ninguna</option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">
              Carpeta padre en la biblioteca (opcional)
            </label>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="">Raíz de la categoría</option>
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Visibilidad inicial</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
              className="w-full h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink"
            >
              <option value="public">Público autorizado (vía proxy seguro)</option>
              <option value="registered">Solo usuarios registrados</option>
              <option value="admin_only">Solo administrador (borrador)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-navy">Vigencia por defecto</label>
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
            label="Materia común (opcional)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej. Derecho Penal, Derecho Civil"
          />
        </div>

        {/* Cover Color Selection */}
        <div className="rounded-2xl border border-line bg-surface-secondary/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-gold-dark" aria-hidden="true" />
              <span className="text-xs font-semibold text-navy">Color editorial de portada</span>
            </div>

            <div className="inline-flex rounded-xl bg-white border border-line p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setColorMode('varied')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  colorMode === 'varied'
                    ? 'bg-navy text-white'
                    : 'text-ink-muted hover:text-navy'
                }`}
              >
                Varios colores
              </button>
              <button
                type="button"
                onClick={() => setColorMode('single')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  colorMode === 'single'
                    ? 'bg-navy text-white'
                    : 'text-ink-muted hover:text-navy'
                }`}
              >
                Un solo color
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {EDITORIAL_COVER_COLORS.map(({ hex, name }) => {
              const isSelected =
                colorMode === 'single' ? singleColor === hex : selectedColors.includes(hex);
              return (
                <button
                  key={hex}
                  type="button"
                  title={name}
                  aria-label={`${name} (${hex})`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (colorMode === 'single') {
                      setSingleColor(hex);
                    } else {
                      toggleVariedColor(hex);
                    }
                  }}
                  className={`relative h-8 w-8 rounded-full border-2 inline-flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-gold scale-105 shadow-sm'
                      : 'border-transparent opacity-45 hover:opacity-80'
                  }`}
                  style={{ backgroundColor: hex }}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow-sm" />}
                </button>
              );
            })}

            {colorMode === 'varied' && selectedColors.length < EDITORIAL_COVER_HEXES.length && (
              <button
                type="button"
                onClick={() => setSelectedColors([...EDITORIAL_COVER_HEXES])}
                className="ml-1 text-[11px] font-semibold text-gold-dark hover:text-navy transition-colors"
              >
                Usar todos
              </button>
            )}
          </div>

          <p className="text-[11px] text-ink-muted">
            {colorMode === 'single'
              ? `Todos los libros importados usarán el color ${
                  EDITORIAL_COVER_COLORS.find((c) => c.hex === singleColor)?.name ?? singleColor
                }.`
              : selectedColors.length === EDITORIAL_COVER_HEXES.length
                ? 'Cada libro importado recibirá automáticamente un color distinto de la paleta editorial.'
                : `Se alternarán automáticamente los ${selectedColors.length} colores seleccionados entre los libros importados.`}
          </p>

          <label className="pt-2 border-t border-line/80 flex items-start gap-2.5 cursor-pointer text-xs text-navy">
            <input
              type="checkbox"
              checked={extractCovers}
              onChange={(e) => setExtractCovers(e.target.checked)}
              className="accent-navy h-4 w-4 mt-0.5 shrink-0"
            />
            <span>
              <strong className="font-semibold">
                Extraer automáticamente la portada real desde Google Drive
              </strong>
              <span className="block text-[11px] text-ink-muted mt-0.5">
                Usa la página 1 del PDF como portada 3D; si un archivo no tiene miniatura, se usará
                el color editorial seleccionado.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-5 text-xs font-medium text-navy">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="accent-navy h-4 w-4"
            />
            Publicar inmediatamente
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowPreview}
              onChange={(e) => setAllowPreview(e.target.checked)}
              className="accent-navy h-4 w-4"
            />
            Permitir lectura en visor
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
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Button
            variant="primary"
            size="lg"
            disabled={!driveConnected || !pickerReady || busyMode !== null}
            loading={busyMode === 'files'}
            onClick={() => void handleLaunchPicker('files')}
          >
            <FileUp className="h-4 w-4" />
            Seleccionar documentos
          </Button>
          <Button
            variant="gold"
            size="lg"
            disabled={!driveConnected || !pickerReady || busyMode !== null}
            loading={busyMode === 'folders'}
            onClick={() => void handleLaunchPicker('folders')}
          >
            <FolderInput className="h-4 w-4" />
            Importar carpeta completa
          </Button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-xs text-emerald-950">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              Resultado de la importación
            </p>
            <ul className="space-y-1">
              <li>Carpetas sincronizadas: {result.report.foldersProcessed}</li>
              <li>Documentos registrados/actualizados: {result.report.documentsImported}</li>
              {typeof result.report.coversExtracted === 'number' && result.report.coversExtracted > 0 && (
                <li>Portadas reales extraídas de Drive: {result.report.coversExtracted}</li>
              )}
              <li>
                Omitidos por formato no compatible: {result.report.documentsSkippedUnsupported}
              </li>
            </ul>
            {result.report.errors.length > 0 && (
              <div className="pt-2 border-t border-emerald-200 space-y-1 text-red-800">
                <p className="font-semibold">
                  Incidencias ({result.report.errors.length}):
                </p>
                {result.report.errors.slice(0, 5).map((e, i) => (
                  <p key={i}>
                    {e.name || e.driveId}: {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  );
}

export function DriveImportModal({
  open,
  onClose,
  driveConnected,
  categories,
  folders,
  defaultLocation,
  onImported,
}: DriveImportModalProps) {
  const contentKey = `${defaultLocation?.categoryId ?? ''}-${defaultLocation?.subcategoryId ?? ''}-${defaultLocation?.folderId ?? ''}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Importar desde Google Drive"
      description="Los archivos permanecen en Google Drive; solo se registran sus identificadores, carpetas y metadatos en Supabase sin duplicados."
    >
      {open && (
        <DriveImportContent
          key={contentKey}
          onClose={onClose}
          driveConnected={driveConnected}
          categories={categories}
          folders={folders}
          defaultLocation={defaultLocation}
          onImported={onImported}
        />
      )}
    </Modal>
  );
}
