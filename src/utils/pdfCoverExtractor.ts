import { pdfjs } from 'react-pdf';
import { ensurePdfWorker } from '../features/reader/pdfWorker';
import { resolveDocumentSource } from '../services/booksService';
import { isPdfDocument } from './format';
import type { Book } from '../types';

/**
 * Renders Page 1 of a PDF document onto an offscreen canvas using PDF.js
 * and returns a compressed JPEG/WebP Data URL suitable for storing as a book cover.
 */
export async function renderPdfFirstPageCover(
  book: Book,
  targetWidth = 420
): Promise<string | null> {
  if (!isPdfDocument(book.mime_type, book.file_extension)) {
    return null;
  }

  const source = await resolveDocumentSource(book, 'view');
  if (!source) return null;

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
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      await pdf.destroy();
      return null;
    }

    // Solid white background behind transparent PDF pages
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Prefer WebP if supported by browser canvas, fallback to crisp JPEG
    let dataUrl = canvas.toDataURL('image/webp', 0.86);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    }

    page.cleanup();
    await pdf.destroy();
    return dataUrl;
  } catch {
    try {
      await loadingTask?.destroy();
    } catch {
      // ignore cleanup error
    }
    return null;
  }
}
