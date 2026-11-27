import { useEffect, useState } from 'react';
import { Loader2, Printer, QrCode } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { buildAppQrUrl, generateQrDataUrl } from '../../utils/qr';
import type { Book } from '../../types';

interface AdminBulkQrModalProps {
  open: boolean;
  onClose: () => void;
  books: Book[];
}

interface GeneratedQrEntry {
  book: Book;
  url: string;
  dataUrl: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function AdminBulkQrModal({ open, onClose, books }: AdminBulkQrModalProps) {
  const [entries, setEntries] = useState<GeneratedQrEntry[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || books.length === 0) return;
    let cancelled = false;

    const buildAll = async () => {
      setGenerating(true);
      try {
        const results = await Promise.all(
          books.map(async (book) => {
            const url = buildAppQrUrl(`/libro/${book.id}`);
            const dataUrl = await generateQrDataUrl(url, 260);
            return { book, url, dataUrl };
          })
        );
        if (!cancelled) setEntries(results);
      } finally {
        if (!cancelled) setGenerating(false);
      }
    };

    void buildAll();
    return () => {
      cancelled = true;
    };
  }, [books, open]);

  const handlePrintSheet = () => {
    if (entries.length === 0) return;
    const printWin = window.open('', '_blank', 'width=960,height=780');
    if (!printWin) return;

    const cardsHtml = entries
      .map(
        ({ book, dataUrl }) => `
        <article class="card">
          <div class="brand">MICOLE LIBRARY</div>
          <img class="qr" src="${dataUrl}" alt="QR ${escapeHtml(book.title)}" />
          <h2 class="title">${escapeHtml(book.title)}</h2>
          <p class="meta">${escapeHtml(book.author || '')}${book.category ? ` · ${escapeHtml(book.category)}` : ''}</p>
        </article>`
      )
      .join('');

    printWin.document.open();
    printWin.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Hoja de códigos QR — MICOLE LIBRARY</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, -apple-system, sans-serif; color: #111E32; background: #fff; }
    header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #C5AA70; padding-bottom: 8px; margin-bottom: 16px; }
    header h1 { margin: 0; font-size: 16px; letter-spacing: 0.04em; }
    header span { font-size: 11px; color: #667085; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .card { break-inside: avoid; border: 1px solid #E5E3DD; border-radius: 12px; padding: 12px; text-align: center; display: flex; flex-direction: column; align-items: center; }
    .brand { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; color: #9A7D43; margin-bottom: 6px; }
    .qr { width: 136px; height: 136px; display: block; margin-bottom: 8px; }
    .title { margin: 0; font-family: Georgia, serif; font-size: 11.5px; line-height: 1.25; color: #111E32; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .meta { margin: 4px 0 0; font-size: 9.5px; color: #667085; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  </style>
</head>
<body>
  <header>
    <h1>MICOLE LIBRARY · Códigos QR</h1>
    <span>${entries.length} ${entries.length === 1 ? 'documento' : 'documentos'}</span>
  </header>
  <section class="grid">${cardsHtml}</section>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
    printWin.document.close();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Hoja de códigos QR (${books.length})`}
      description="Vista lista para imprimir o guardar como PDF con etiquetas individuales para cada documento seleccionado."
    >
      <div className="p-6 space-y-5 max-h-[76vh] flex flex-col">
        {generating ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-sm text-[#667085]">
            <Loader2 className="h-6 w-6 animate-spin text-[#9A7D43]" />
            <span>Generando {books.length} códigos QR…</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#667085] space-y-2">
            <QrCode className="h-8 w-8 mx-auto opacity-50" />
            <p>No hay documentos seleccionados.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {entries.map(({ book, dataUrl }) => (
                <div
                  key={book.id}
                  className="rounded-2xl border border-[#E5E3DD] bg-[#FAF9F6] p-3.5 flex flex-col items-center text-center space-y-2"
                >
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#9A7D43]">
                    MICOLE LIBRARY
                  </span>
                  <div className="p-2 rounded-xl bg-white border border-[#E5E3DD]">
                    <img
                      src={dataUrl}
                      alt={`QR de ${book.title}`}
                      className="h-28 w-28 sm:h-32 sm:w-32 block"
                    />
                  </div>
                  <p
                    title={book.title}
                    className="font-editorial text-xs font-semibold text-[#111E32] leading-snug line-clamp-2"
                  >
                    {book.title}
                  </p>
                  <p className="text-[10.5px] text-[#667085] truncate w-full">{book.category}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E5E3DD] shrink-0">
          <p className="text-xs text-[#667085]">
            Cada QR dirige a la ficha del documento respetando los permisos de acceso.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="rounded-full">
              Cerrar
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={generating || entries.length === 0}
              onClick={handlePrintSheet}
              className="rounded-full bg-[#111E32] hover:bg-[#192B45]"
            >
              <Printer className="h-4 w-4 text-[#E5C784]" />
              Imprimir / Guardar PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
