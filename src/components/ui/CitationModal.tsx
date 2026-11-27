import { useMemo, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useToast } from '../feedback/ToastProvider';
import { buildBookCitations } from '../../utils/citations';
import type { Book } from '../../types';

interface CitationModalProps {
  open: boolean;
  onClose: () => void;
  book: Book;
  initialPage?: number | null;
}

function CitationModalContent({
  book,
  initialPage,
  onClose,
}: Omit<CitationModalProps, 'open'>) {
  const { notify } = useToast();
  const [pageInput, setPageInput] = useState(
    initialPage && initialPage > 0 ? String(initialPage) : ''
  );
  const [includeUrl, setIncludeUrl] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const parsedPage = useMemo(() => {
    const n = Number.parseInt(pageInput, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [pageInput]);

  const citations = useMemo(
    () => buildBookCitations(book, { page: parsedPage, includeUrl }),
    [book, includeUrl, parsedPage]
  );

  const copyText = async (id: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      notify(`Cita (${label}) copiada al portapapeles`);
      window.setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
    } catch {
      notify('No se pudo copiar la cita.', 'error');
    }
  };

  const items = [
    {
      id: 'juridica',
      label: 'Estilo jurídico / académico',
      tag: 'Recomendado RD',
      text: citations.juridica,
    },
    {
      id: 'apa7',
      label: 'APA 7.ª edición',
      tag: 'Académico',
      text: citations.apa7,
    },
    {
      id: 'intext',
      label: 'Cita breve en texto',
      tag: 'Párrafo',
      text: citations.inText,
    },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Optional page + URL toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E3DD] bg-[#F6F5F1]/70 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <label htmlFor="citation-page-input" className="text-xs font-semibold text-[#111E32]">
            Página (opcional)
          </label>
          <input
            id="citation-page-input"
            type="text"
            inputMode="numeric"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="Ej. 42"
            className="w-20 h-8 rounded-lg border border-[#D8D4C9] bg-white px-2.5 text-xs font-semibold text-[#111E32] tabular-nums focus:border-[#111E32] focus:outline-none"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#111E32] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeUrl}
            onChange={(e) => setIncludeUrl(e.target.checked)}
            className="h-4 w-4 rounded accent-[#111E32]"
          />
          <Link2 className="h-3.5 w-3.5 text-[#9A7D43]" aria-hidden="true" />
          Incluir enlace directo
        </label>
      </div>

      {/* Generated Citation Cards */}
      <div className="space-y-3">
        {items.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-[#E5E3DD] bg-white p-4 space-y-2.5 shadow-subtle"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#111E32]">{item.label}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A7D43] bg-[#FBF6EA] border border-[#E5C784]/50 rounded-full px-2 py-0.5">
                    {item.tag}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void copyText(item.id, item.text, item.label)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#111E32] hover:bg-[#192B45] text-white text-xs font-medium transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#E5C784]" />
                      Copiada
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#E5C784]" />
                      Copiar
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs sm:text-[13px] text-[#242C3A] leading-relaxed bg-[#FAF9F6] rounded-xl px-3 py-2.5 border border-[#ECE9E1] select-all break-words">
                {item.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <Button variant="secondary" size="sm" onClick={onClose} className="rounded-full px-5">
          Cerrar
        </Button>
      </div>
    </div>
  );
}

export function CitationModal({ open, onClose, book, initialPage = null }: CitationModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Citar documento"
      description={book.title}
    >
      {open && (
        <CitationModalContent
          key={`${book.id}-${initialPage ?? 'all'}`}
          book={book}
          initialPage={initialPage}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
