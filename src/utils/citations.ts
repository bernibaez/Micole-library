import type { Book, BookmarkItem } from '../types';
import { getAppOrigin } from '../lib/supabase';
import { getDocumentTypeLabel } from './format';

export interface GeneratedCitations {
  juridica: string;
  apa7: string;
  inText: string;
  url: string;
}

function formatApaAuthor(rawAuthor: string): string {
  const clean = rawAuthor.trim();
  if (
    !clean ||
    clean.toLowerCase().includes('no especificado') ||
    clean.toLowerCase().includes('por catalogar')
  ) {
    return 'MICOLE LIBRARY';
  }
  // Corporate / institutional authors stay intact
  if (
    /congreso|tribunal|suprema|corte|ministerio|poder|colegio|universidad|comisión|senado|cámara/i.test(
      clean
    )
  ) {
    return clean;
  }
  // If already "Apellido, Nombre" keep it
  if (clean.includes(',')) return clean;
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return clean;
  const last = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p[0]?.toUpperCase() ?? ''}.`)
    .join(' ');
  return `${last}, ${initials}`;
}

export function buildBookCitations(
  book: Book,
  options?: { page?: number | null; includeUrl?: boolean }
): GeneratedCitations {
  const origin = getAppOrigin().replace(/\/$/, '');
  const page = options?.page && options.page > 0 ? Math.floor(options.page) : null;
  const includeUrl = options?.includeUrl !== false;
  const url = page ? `${origin}/leer/${book.id}?pagina=${page}` : `${origin}/libro/${book.id}`;

  const yearStr = book.year ? String(book.year) : 's. f.';
  const pageLabel = page ? `, p. ${page}` : '';
  const hasRealAuthor =
    Boolean(book.author) &&
    !book.author.toLowerCase().includes('no especificado') &&
    !book.author.toLowerCase().includes('por catalogar');

  // 1. Formato Jurídico / Académico Dominicano
  let juridica: string;
  if (book.document_type === 'sentencia' || book.document_type === 'jurisprudencia') {
    const court = book.court || (hasRealAuthor ? book.author : 'Tribunal de la República Dominicana');
    const num = book.judgment_number ? `, Sentencia núm. ${book.judgment_number}` : '';
    juridica = `${court}${num}, «${book.title}» (${yearStr})${pageLabel}. MICOLE LIBRARY.`;
  } else if (book.document_type === 'ley' || book.document_type === 'codigo') {
    const jurisdiction = book.country || 'República Dominicana';
    juridica = `${jurisdiction}. ${book.title} (${yearStr})${pageLabel}. Disponible en MICOLE LIBRARY.`;
  } else {
    const authorPart = hasRealAuthor ? `${book.author}, ` : '';
    const publisherPart = book.publisher ? `, ${book.publisher}` : '';
    juridica = `${authorPart}${book.title}${publisherPart}, ${yearStr}${pageLabel}.`;
  }
  if (includeUrl) {
    juridica = `${juridica} ${url}`;
  }

  // 2. Formato APA 7.ª edición
  const apaAuthor =
    book.document_type === 'sentencia' && book.court
      ? book.court
      : book.document_type === 'ley' || book.document_type === 'codigo'
        ? book.country || 'República Dominicana'
        : formatApaAuthor(book.author);
  const publisherApa = book.publisher ? ` ${book.publisher}.` : ' MICOLE LIBRARY.';
  const apaPage = page ? ` (p. ${page})` : '';
  const apa7 = `${apaAuthor} (${yearStr}). ${book.title}${apaPage}.${publisherApa}${
    includeUrl ? ` ${url}` : ''
  }`;

  // 3. Cita breve en texto
  const shortAuthor =
    book.judgment_number ||
    book.court ||
    (hasRealAuthor ? book.author.split(',')[0].split(' ').slice(-1)[0] : book.title.slice(0, 32));
  const inText = `(${shortAuthor}, ${yearStr}${page ? `, p. ${page}` : ''})`;

  return { juridica, apa7, inText, url };
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeFileSlug(raw: string): string {
  return (
    raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 56) || 'apuntes-micole'
  );
}

export function buildStudyNotesMarkdown(book: Book, bookmarks: BookmarkItem[]): string {
  const sorted = [...bookmarks].sort((a, b) => a.page_number - b.page_number);
  const { juridica, apa7 } = buildBookCitations(book);
  const dateStr = new Date().toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [
    `# Apuntes de estudio — ${book.title}`,
    '',
    `- **Autor / Órgano:** ${book.author}`,
    `- **Categoría:** ${book.category} · ${getDocumentTypeLabel(book.document_type)}`,
    ...(book.year ? [`- **Año:** ${book.year}`] : []),
    `- **Exportado desde:** MICOLE LIBRARY (${dateStr})`,
    '',
    '## Referencias bibliográficas',
    `- **Jurídica:** ${juridica}`,
    `- **APA 7:** ${apa7}`,
    '',
    `## Marcadores y notas (${sorted.length})`,
    '',
  ];

  for (const bm of sorted) {
    const heading =
      bm.label && bm.label !== `Página ${bm.page_number}`
        ? `### Página ${bm.page_number} — ${bm.label}`
        : `### Página ${bm.page_number}`;
    lines.push(heading);
    lines.push(bm.note?.trim() ? bm.note.trim() : '_Página marcada para referencia rápida._');
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadStudyNotesMarkdown(book: Book, bookmarks: BookmarkItem[]): void {
  const md = buildStudyNotesMarkdown(book, bookmarks);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `apuntes-${sanitizeFileSlug(book.title)}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function printStudyNotesSheet(book: Book, bookmarks: BookmarkItem[]): boolean {
  const sorted = [...bookmarks].sort((a, b) => a.page_number - b.page_number);
  const { juridica, apa7 } = buildBookCitations(book);
  const win = window.open('', '_blank', 'width=860,height=780');
  if (!win) return false;

  const dateStr = new Date().toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const notesHtml = sorted
    .map(
      (bm) => `
      <article class="note">
        <div class="note-head">
          <span class="page-pill">Página ${bm.page_number}</span>
          ${
            bm.label && bm.label !== `Página ${bm.page_number}`
              ? `<h3>${escapeHtml(bm.label)}</h3>`
              : ''
          }
        </div>
        <p>${
          bm.note?.trim()
            ? escapeHtml(bm.note.trim()).replace(/\n/g, '<br />')
            : '<em>Página marcada para consulta rápida.</em>'
        }</p>
      </article>`
    )
    .join('');

  win.document.open();
  win.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Apuntes — ${escapeHtml(book.title)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, -apple-system, sans-serif; color: #111E32; line-height: 1.55; }
    .brand-bar { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #C5AA70; padding-bottom: 8px; margin-bottom: 18px; }
    .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: #111E32; }
    .date { font-size: 11px; color: #667085; }
    h1 { font-family: Georgia, serif; font-size: 22px; margin: 0 0 6px; line-height: 1.25; }
    .meta { font-size: 12.5px; color: #667085; margin: 0 0 16px; }
    .cite-box { background: #F6F5F1; border: 1px solid #E5E3DD; border-radius: 10px; padding: 12px 14px; font-size: 11.5px; margin-bottom: 20px; }
    .cite-box p { margin: 4px 0; }
    .cite-box strong { color: #111E32; }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; color: #9A7D43; margin: 0 0 12px; }
    .note { break-inside: avoid; border-left: 3px solid #C5AA70; background: #fff; border-top: 1px solid #ECE9E1; border-right: 1px solid #ECE9E1; border-bottom: 1px solid #ECE9E1; border-radius: 0 10px 10px 0; padding: 11px 14px; margin-bottom: 12px; }
    .note-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .page-pill { font-size: 10.5px; font-weight: 700; background: #111E32; color: #E5C784; padding: 2px 8px; border-radius: 999px; }
    .note h3 { margin: 0; font-size: 13px; color: #111E32; }
    .note p { margin: 0; font-size: 12.5px; color: #242C3A; }
  </style>
</head>
<body>
  <div class="brand-bar">
    <span class="brand">MICOLE LIBRARY · CUADERNO DE APUNTES</span>
    <span class="date">${escapeHtml(dateStr)}</span>
  </div>
  <h1>${escapeHtml(book.title)}</h1>
  <p class="meta">${escapeHtml(book.author)} · ${escapeHtml(book.category)}${
    book.year ? ` · ${book.year}` : ''
  }</p>
  <div class="cite-box">
    <p><strong>Cita jurídica:</strong> ${escapeHtml(juridica)}</p>
    <p><strong>Cita APA 7:</strong> ${escapeHtml(apa7)}</p>
  </div>
  <h2>Marcadores y apuntes (${sorted.length})</h2>
  ${notesHtml}
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
  win.document.close();
  return true;
}
