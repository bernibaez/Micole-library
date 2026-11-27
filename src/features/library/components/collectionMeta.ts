import {
  Bookmark,
  BookOpen,
  Briefcase,
  FileText,
  Folder,
  Gavel,
  GraduationCap,
  Landmark,
  Library,
  Scale,
  type LucideIcon,
} from 'lucide-react';

export interface CollectionColorOption {
  hex: string;
  name: string;
}

export const COLLECTION_COLORS: CollectionColorOption[] = [
  { hex: '#111E32', name: 'Azul marino' },
  { hex: '#3D5245', name: 'Oliva editorial' },
  { hex: '#5E4636', name: 'Marrón editorial' },
  { hex: '#46566B', name: 'Gris azulado' },
  { hex: '#5C3A41', name: 'Borgoña jurídico' },
  { hex: '#8A6F3B', name: 'Dorado sobrio' },
];

export interface CollectionIconOption {
  id: string;
  label: string;
  Icon: LucideIcon;
}

export const COLLECTION_ICONS: CollectionIconOption[] = [
  { id: 'folder', label: 'Carpeta', Icon: Folder },
  { id: 'scale', label: 'Balanza', Icon: Scale },
  { id: 'gavel', label: 'Jurisprudencia', Icon: Gavel },
  { id: 'landmark', label: 'Legislación', Icon: Landmark },
  { id: 'book-open', label: 'Lectura', Icon: BookOpen },
  { id: 'graduation-cap', label: 'Exámenes', Icon: GraduationCap },
  { id: 'file-text', label: 'Artículos', Icon: FileText },
  { id: 'briefcase', label: 'Casos', Icon: Briefcase },
  { id: 'library', label: 'Doctrina', Icon: Library },
  { id: 'bookmark', label: 'Estudio', Icon: Bookmark },
];

export function getCollectionIcon(iconId?: string | null): LucideIcon {
  const found = COLLECTION_ICONS.find((item) => item.id === iconId);
  return found ? found.Icon : Folder;
}
