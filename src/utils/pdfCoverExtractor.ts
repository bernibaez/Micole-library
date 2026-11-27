import { pdfjs } from 'react-pdf';
import { ensurePdfWorker } from '../features/reader/pdfWorker';
import { resolveDocumentSource } from '../services/booksService';
import { isPdfDocument } from './format';
import type { Book } from '../types';

export interface PdfCoverExtractResult {
  dataUrl: string | null;
  skippedPlainText: boolean;
}

/**
 * Heuristic that distinguishes a real designed book cover from a plain
 * black-and-white legal text page (ley, sentencia, contrato sin portada).
 */
function looksLikeVisualCover(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  const step = 2;
  const marginX = Math.max(4, Math.round(width * 0.06));
  const marginY = Math.max(4, Math.round(height * 0.06));

  let total = 0;
  let nonWhite = 0;
  let colorful = 0;
  let borderTotal = 0;
  let borderNonWhite = 0;

  for (let y = 0; y < height; y += step) {
    const isBorderY = y < marginY || y >= height - marginY;
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const isNonWhite = r < 236 || g < 236 || b < 236;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const isColorful = maxC - minC >= 24;

      total += 1;
      if (isNonWhite) nonWhite += 1;
      if (isColorful) colorful += 1;

      if (isBorderY || x < marginX || x >= width - marginX) {
        borderTotal += 1;
        if (isNonWhite) borderNonWhite += 1;
      }
    }
  }

  if (total === 0) return false;

  const nonWhiteRatio = nonWhite / total;
  const colorfulRatio = colorful / total;
  const borderNonWhiteRatio = borderTotal > 0 ? borderNonWhite / borderTotal : 0;

  // Real covers have either noticeable color artwork/logos, substantial dark/shaded area,
  // or a non-white background/border/banner. Plain text pages fail all three.
  return colorfulRatio >= 0.045 || nonWhiteRatio >= 0.28 || borderNonWhiteRatio >= 0.2;
}

/**
 * Renders Page 1 of a PDF document onto an offscreen canvas using PDF.js
 * and returns a compressed JPEG/WebP Data URL suitable for storing as a book cover.
 * When `onlyIfVisualCover` is true (default), plain white text pages are skipped
 * so the document keeps its editorial hardcover design.
 */
export async function renderPdfFirstPageCover(
  book: Book,
  options?: { targetWidth?: number; onlyIfVisualCover?: boolean }
): Promise<PdfCoverExtractResult> {
  const targetWidth = options?.targetWidth ?? 420;
  const onlyIfVisualCover = options?.onlyIfVisualCover ?? true;

  if (!isPdfDocument(book.mime_type, book.file_extension)) {
    return { dataUrl: null, skippedPlainText: false };
  }

  const source = await resolveDocumentSource(book, 'view');
  if (!source) return { dataUrl: null, skippedPlainText: false };

  ensurePdfWorker();

  let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;
  try {
    const docInput =
      source.kind === 'proxy'
        ? { url: source.url, httpHeaders: source.httpHeaders }
        : { url: source.url };

    loadingTask = pdfjs.getDocument({
      ...docInput,
      disableAutoFetch: true,
      disableStream: false,
    });

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, Math.max(0.4, targetWidth / Math.max(1, unscaledViewport.width)));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      await pdf.destroy();
      return { dataUrl: null, skippedPlainText: false };
    }

    // Solid white background behind transparent PDF pages
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    if (onlyIfVisualCover && !looksLikeVisualCover(ctx, canvas.width, canvas.height)) {
      page.cleanup();
      await pdf.destroy();
      return { dataUrl: null, skippedPlainText: true };
    }

    // Prefer WebP if supported by browser canvas, fallback to crisp JPEG
    let dataUrl = canvas.toDataURL('image/webp', 0.86);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    }

    page.cleanup();
    await pdf.destroy();
    return { dataUrl, skippedPlainText: false };
  } catch {
    try {
      await loadingTask?.destroy();
    } catch {
      // ignore cleanup error
    }
    return { dataUrl: null, skippedPlainText: false };
  }
}
