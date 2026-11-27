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
} from 'lucide-react';

interface CollectionIconProps {
  iconId?: string | null;
  className?: string;
  strokeWidth?: number;
}

export function CollectionIcon({ iconId, className, strokeWidth }: CollectionIconProps) {
  switch (iconId) {
    case 'scale':
      return <Scale className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'gavel':
      return <Gavel className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'landmark':
      return <Landmark className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'book-open':
      return <BookOpen className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'graduation-cap':
      return <GraduationCap className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'file-text':
      return <FileText className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'briefcase':
      return <Briefcase className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'library':
      return <Library className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'bookmark':
      return <Bookmark className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
    case 'folder':
    default:
      return <Folder className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
  }
}
