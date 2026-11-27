import { Link } from 'react-router-dom';
import { m } from 'motion/react';
import { ArrowRight, BookOpen, Scale, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  HERO_CONTAINER_VARIANTS,
  HERO_ITEM_VARIANTS,
  STAGGER_CONTAINER_VARIANTS,
  STAGGER_ITEM_VARIANTS,
  VIEWPORT_ONCE,
} from '../../utils/motion';

export function AboutPage() {
  return (
    <div className="max-w-3xl space-y-10 py-4">
      <m.div
        variants={HERO_CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <m.p
          variants={HERO_ITEM_VARIANTS}
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark"
        >
          Nuestra misión editorial
        </m.p>
        <m.h1
          variants={HERO_ITEM_VARIANTS}
          className="font-editorial text-3xl sm:text-4xl font-semibold text-navy leading-tight tracking-tight"
        >
          Conocimiento jurídico accesible, organizado y riguroso.
        </m.h1>
        <m.p
          variants={HERO_ITEM_VARIANTS}
          className="text-base text-ink-muted leading-relaxed"
        >
          MICOLE LIBRARY es una biblioteca jurídica digital especializada en el Derecho Procesal Penal
          de la República Dominicana. Está diseñada para estudiantes, docentes, investigadores y
          profesionales que requieren consultar legislación, doctrina y jurisprudencia con rapidez y
          precisión.
        </m.p>
      </m.div>

      <m.div
        variants={STAGGER_CONTAINER_VARIANTS}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_ONCE}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <m.div
          variants={STAGGER_ITEM_VARIANTS}
          className="rounded-2xl border border-line bg-surface-secondary/50 p-5 space-y-2"
        >
          <Scale className="h-5 w-5 text-gold-dark" />
          <h2 className="text-sm font-semibold text-navy">Enfoque dominicano</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            Catálogo estructurado alrededor del Código Procesal Penal, legislación orgánica y
            jurisprudencia nacional.
          </p>
        </m.div>
        <m.div
          variants={STAGGER_ITEM_VARIANTS}
          className="rounded-2xl border border-line bg-surface-secondary/50 p-5 space-y-2"
        >
          <BookOpen className="h-5 w-5 text-gold-dark" />
          <h2 className="text-sm font-semibold text-navy">Lectura editorial</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            Lector PDF avanzado con búsqueda interna, marcadores, progreso sincronizado y modo
            concentración.
          </p>
        </m.div>
        <m.div
          variants={STAGGER_ITEM_VARIANTS}
          className="rounded-2xl border border-line bg-surface-secondary/50 p-5 space-y-2"
        >
          <ShieldCheck className="h-5 w-5 text-gold-dark" />
          <h2 className="text-sm font-semibold text-navy">Acceso responsable</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            Publica únicamente materiales de acceso público o con autorización expresa. Verifica
            siempre la vigencia legal en fuentes oficiales.
          </p>
        </m.div>
      </m.div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link to="/explorar">
          <Button variant="primary" size="lg">
            Explorar catálogo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to="/categorias">
          <Button variant="secondary" size="lg">
            Ver categorías
          </Button>
        </Link>
      </div>
    </div>
  );
}
