import type { Book, DocumentSyncStatus, DocumentType, ValidityStatus } from '../types';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  libro: 'Libro',
  codigo: 'Código',
  ley: 'Legislación / Ley',
  jurisprudencia: 'Jurisprudencia',
  sentencia: 'Sentencia',
  doctrina: 'Doctrina',
  articulo: 'Artículo académico',
  curso: 'Curso / Trabajo',
  guia: 'Guía práctica',
  manual: 'Manual',
  otro: 'Documento',
};

export const VALIDITY_STATUS_LABELS: Record<ValidityStatus, string> = {
  vigente: 'Vigente',
  derogada: 'Derogada',
  reformada: 'Reformada',
  historica: 'Histórica',
  borrador: 'Borrador / Proyecto',
  no_aplica: 'No aplica',
};

export const SYNC_STATUS_LABELS: Record<DocumentSyncStatus, string> = {
  synced: 'Sincronizado',
  pending: 'Pendiente',
  modified: 'Modificado en Drive',
  missing: 'No encontrado en Drive',
  deleted: 'Eliminado en Drive',
  error: 'Error de sincronización',
  manual: 'Registro manual',
};

export function getDocumentTypeLabel(type?: string | null): string {
  if (!type) return 'Recurso';
  return DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type;
}

export function getValidityStatusLabel(status?: string | null): string {
  if (!status || status === 'no_aplica') return '';
  return VALIDITY_STATUS_LABELS[status as ValidityStatus] ?? status;
}

export function getSyncStatusLabel(status?: string | null): string {
  if (!status) return 'Manual';
  return SYNC_STATUS_LABELS[status as DocumentSyncStatus] ?? status;
}

export function isPdfDocument(mimeType?: string | null, extension?: string | null): boolean {
  const mime = (mimeType ?? '').toLowerCase();
  const ext = (extension ?? '').toLowerCase();
  return (
    mime === 'application/pdf' ||
    mime === 'application/vnd.google-apps.document' ||
    ext === 'pdf' ||
    ext === 'gdoc'
  );
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size < 10 && unitIndex > 0 ? size.toFixed(1) : Math.round(size)} ${units[unitIndex]}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatFullDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null
): string {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return 'LX';
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export interface BookAvailabilityInfo {
  status: 'available' | 'login_required' | 'unavailable';
  shortLabel: string;
  label: string;
  detail: string;
  canRead: boolean;
  canDownload: boolean;
}

export function getBookAvailability(
  book: Book,
  isAuthenticated = false
): BookAvailabilityInfo {
  const hasFile = Boolean(book.file_url || book.drive_file_id);
  const isDeletedOrMissing =
    book.sync_status === 'deleted' || book.sync_status === 'missing';
  const formatExt = (book.file_extension || 'PDF').toUpperCase();
  const sizeSuffix =
    book.size_label && book.size_label.toUpperCase() !== formatExt
      ? ` · ${book.size_label}`
      : '';

  if (!hasFile || isDeletedOrMissing || book.published === false) {
    return {
      status: 'unavailable',
      shortLabel: 'No disponible',
      label: 'No disponible actualmente',
      detail: 'Solo consulta de ficha bibliográfica; no cuenta con archivo digital enlazado.',
      canRead: false,
      canDownload: false,
    };
  }

  const requiresAccount = book.visibility === 'registered' || book.is_private === true;
  if (requiresAccount && !isAuthenticated) {
    return {
      status: 'login_required',
      shortLabel: 'Requiere cuenta',
      label: 'Disponible para usuarios registrados',
      detail: `Inicia sesión para leer en línea o descargar este documento (${formatExt}${sizeSuffix}).`,
      canRead: false,
      canDownload: false,
    };
  }

  const canRead = book.allow_preview !== false;
  const canDownload = book.allow_download !== false;

  if (canRead && canDownload) {
    return {
      status: 'available',
      shortLabel: 'Disponible',
      label: 'Disponible para lectura y descarga',
      detail: `Acceso digital inmediato en visor integrado y descarga (${formatExt}${sizeSuffix}).`,
      canRead: true,
      canDownload: true,
    };
  }

  if (canRead) {
    return {
      status: 'available',
      shortLabel: 'Solo lectura',
      label: 'Disponible para lectura en línea',
      detail: `Consulta directa en el lector integrado (${formatExt}${sizeSuffix}). Descarga restringida.`,
      canRead: true,
      canDownload: false,
    };
  }

  if (canDownload) {
    return {
      status: 'available',
      shortLabel: 'Solo descarga',
      label: 'Disponible para descarga directa',
      detail: `Archivo listo para descarga (${formatExt}${sizeSuffix}). Vista previa deshabilitada.`,
      canRead: false,
      canDownload: true,
    };
  }

  return {
    status: 'unavailable',
    shortLabel: 'Restringido',
    label: 'Acceso restringido',
    detail: 'Este recurso figura en catálogo, pero su lectura y descarga están temporalmente deshabilitadas.',
    canRead: false,
    canDownload: false,
  };
}
