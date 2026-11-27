import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import {
  Archive,
  ArrowRight,
  BookOpen,
  Briefcase,
  FileSearch,
  FileText,
  Folder,
  Gavel,
  Globe,
  GraduationCap,
  Landmark,
  Library,
  Scale,
  ScrollText,
  Shield,
  Zap,
} from 'lucide-react';
import {
  useBooksQuery,
  useCategoriesQuery,
  useFoldersQuery,
} from '../library/useLibraryData';
import { Skeleton } from '../../components/ui/Skeleton';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import {
  EASE_EDITORIAL,
  STAGGER_CONTAINER_VARIANTS,
  STAGGER_ITEM_VARIANTS,
  VIEWPORT_ONCE,
} from '../../utils/motion';
import type { CategoryInfo } from '../../types';

const ICON_MAP: Record<string, typeof Scale> = {
  zap: Zap,
  scale: Scale,
  'book-open': BookOpen,
  landmark: Landmark,
  gavel: Gavel,
  shield: Shield,
  scroll: ScrollText,
  'file-search': FileSearch,
  'file-text': FileText,
  library: Library,
  globe: Globe,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  archive: Archive,
};

export function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategoriesQuery();
  const { data: books = [] } = useBooksQuery();
  const { data: folders = [] } = useFoldersQuery();

  const { topLevel, childrenByParent } = useMemo(() => {
    const top: CategoryInfo[] = [];
    const childMap = new Map<string, CategoryInfo[]>();

    for (const cat of categories) {
      if (cat.parent_id) {
        const list = childMap.get(cat.parent_id) ?? [];
        list.push(cat);
        childMap.set(cat.parent_id, list);
      } else {
        top.push(cat);
      }
    }

    top.sort((a, b) => a.sort_order - b.sort_order);
    for (const list of childMap.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }

    return { topLevel: top, childrenByParent: childMap };
  }, [categories]);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark">
          Estructura documental
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-navy tracking-tight">
          Categorías jurídicas
        </h1>
        <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
          Organización temática de la Biblioteca Jurídica Virtual con subcategorías y carpetas
          sincronizadas con el acervo documental.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <m.div
          variants={STAGGER_CONTAINER_VARIANTS}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_ONCE}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {topLevel.map((cat) => {
            const Icon = ICON_MAP[cat.icon] ?? Scale;
            const subcats = childrenByParent.get(cat.id) ?? [];
            const subcatIds = new Set(subcats.map((s) => s.id));
            const count = books.filter(
              (b) =>
                b.category_id === cat.id ||
                (b.subcategory_id && subcatIds.has(b.subcategory_id)) ||
                b.category.toLowerCase() === cat.name.toLowerCase()
            ).length;
            const folderCount = folders.filter(
              (f) => f.category_id === cat.id && !f.parent_id
            ).length;

            return (
              <m.div
                key={cat.id}
                variants={STAGGER_ITEM_VARIANTS}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
              >
                <div className="group h-full rounded-2xl border border-line bg-white p-6 hover:border-line-strong hover:bg-surface-secondary/60 hover:shadow-subtle transition-all flex flex-col justify-between gap-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="h-10 w-10 rounded-xl bg-surface-secondary text-gold-dark inline-flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-colors">
                        <Icon className="h-5 w-5" />
                      </span>
                      {folderCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted bg-surface-secondary px-2.5 py-1 rounded-full">
                          <Folder className="h-3 w-3 text-gold-dark" />
                          {folderCount} {folderCount === 1 ? 'carpeta' : 'carpetas'}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/explorar?categoria=${encodeURIComponent(cat.name)}`}
                      className="block"
                    >
                      <h2 className="text-base font-semibold text-navy group-hover:text-navy-secondary">
                        {cat.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-ink-muted mt-1 leading-relaxed">
                        {cat.description ||
                          'Consulta los recursos disponibles en esta área jurídica.'}
                      </p>
                    </Link>

                    {/* Subcategorías integradas (p. ej. Legislación derogada o histórica) */}
                    {subcats.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {subcats.map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/explorar?categoria=${encodeURIComponent(cat.name)}&subcategoria=${encodeURIComponent(sub.id)}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold-soft/70 px-2.5 py-1 text-[11px] font-medium text-navy hover:bg-gold-soft transition-colors"
                          >
                            <Archive className="h-3 w-3 text-gold-dark shrink-0" />
                            <span>{sub.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/explorar?categoria=${encodeURIComponent(cat.name)}`}
                    className="flex items-center justify-between text-xs font-medium text-navy pt-3 border-t border-line"
                  >
                    <span className="tabular-nums">
                      <AnimatedCounter value={count} /> {count === 1 ? 'documento' : 'documentos'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-subtle group-hover:text-navy group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </div>
              </m.div>
            );
          })}
        </m.div>
      )}
    </div>
  );
}
