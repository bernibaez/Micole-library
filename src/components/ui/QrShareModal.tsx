import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, QrCode, Scale } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useToast } from '../feedback/ToastProvider';
import {
  buildAppQrUrl,
  generateQrDataUrl,
  generateQrSvgString,
  renderEditorialQrCardPng,
  sanitizeQrFilename,
  triggerFileDownload,
} from '../../utils/qr';
import { cn } from '../../utils/cn';

export interface QrTargetMode {
  id: string;
  label: string;
  path: string;
  badge?: string;
  hint?: string;
}

interface QrShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  modes: QrTargetMode[];
  defaultModeId?: string;
}

function QrShareContent({
  title,
  subtitle,
  modes,
  defaultModeId,
}: Omit<QrShareModalProps, 'open' | 'onClose'>) {
  const { notify } = useToast();
  const [selectedModeId, setSelectedModeId] = useState<string>(
    defaultModeId ?? modes[0]?.id ?? 'default'
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

  const activeMode = useMemo(
    () => modes.find((m) => m.id === selectedModeId) ?? modes[0],
    [modes, selectedModeId]
  );

  const targetUrl = useMemo(
    () => (activeMode ? buildAppQrUrl(activeMode.path) : ''),
    [activeMode]
  );

  useEffect(() => {
    if (!targetUrl) return;
    let active = true;
    generateQrDataUrl(targetUrl, 340)
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [targetUrl]);

  const handleCopyLink = async () => {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      notify('Enlace del código QR copiado');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('No se pudo copiar el enlace.', 'error');
    }
  };

  const handleDownloadCardPng = async () => {
    if (!targetUrl || downloadingPng) return;
    setDownloadingPng(true);
    try {
      const pngDataUrl = await renderEditorialQrCardPng({
        url: targetUrl,
        title,
        subtitle,
        badge: activeMode?.badge,
      });
      const fileSlug = sanitizeQrFilename(title);
      triggerFileDownload(pngDataUrl, `qr-${fileSlug}.png`);
      notify('Tarjeta QR descargada en PNG');
    } catch {
      notify('No se pudo generar la tarjeta PNG.', 'error');
    } finally {
      setDownloadingPng(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (!targetUrl) return;
    try {
      const svg = await generateQrSvgString(targetUrl);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const fileSlug = sanitizeQrFilename(title);
      triggerFileDownload(blobUrl, `qr-${fileSlug}.svg`);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      notify('Código QR descargado en formato vectorial SVG');
    } catch {
      notify('No se pudo descargar el archivo SVG.', 'error');
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Target Mode Switcher (when multiple modes are available) */}
      {modes.length > 1 && (
        <div
          role="tablist"
          aria-label="Destino del código QR"
          className="flex flex-wrap gap-1.5 rounded-2xl bg-[#F6F5F1] border border-[#E5E3DD] p-1"
        >
          {modes.map((mode) => {
            const active = mode.id === activeMode?.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedModeId(mode.id)}
                className={cn(
                  'flex-1 min-w-[100px] px-3 py-2 rounded-xl text-xs font-semibold transition-all text-center',
                  active
                    ? 'bg-[#111E32] text-white shadow-subtle'
                    : 'text-[#667085] hover:text-[#111E32]'
                )}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Branded Editorial QR Card Preview */}
      <div className="rounded-2xl border border-[#E5E3DD] bg-[#FAF9F6] p-5 flex flex-col items-center text-center space-y-3.5">
        <div className="relative p-3.5 rounded-2xl bg-white border border-[#E5E3DD] shadow-subtle">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`Código QR para ${title}`}
              className="h-48 w-48 sm:h-52 sm:w-52 block"
            />
          ) : (
            <div className="h-48 w-48 sm:h-52 sm:w-52 flex items-center justify-center text-[#667085]">
              <QrCode className="h-10 w-10 animate-pulse" />
            </div>
          )}

          {/* Centered MICOLE LIBRARY gold/navy emblem (safe with Error Correction H) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-white p-1 shadow-sm flex items-center justify-center"
          >
            <span className="h-full w-full rounded-lg bg-[#111E32] border border-[#C5AA70] text-[#E5C784] inline-flex items-center justify-center">
              <Scale className="h-4 w-4" strokeWidth={1.85} />
            </span>
          </span>
        </div>

        <div className="space-y-1 max-w-xs">
          {activeMode?.badge && (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#9A7D43]">
              {activeMode.badge}
            </p>
          )}
          <p className="font-editorial text-base font-semibold text-[#111E32] leading-snug line-clamp-2">
            {title}
          </p>
          {subtitle && <p className="text-xs text-[#667085] truncate">{subtitle}</p>}
          <p className="text-[11px] text-[#667085]/90 pt-1">
            {activeMode?.hint || 'Escanea con la cámara de tu teléfono para abrir directamente.'}
          </p>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="space-y-2.5">
        <Button
          variant="primary"
          size="lg"
          loading={downloadingPng}
          onClick={() => void handleDownloadCardPng()}
          className="w-full rounded-full bg-[#111E32] hover:bg-[#192B45]"
        >
          <Download className="h-4 w-4 text-[#E5C784]" />
          Descargar tarjeta PNG
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => void handleDownloadSvg()}
            className="rounded-full"
          >
            <FileCode2 className="h-4 w-4 text-[#667085]" />
            Solo QR (SVG)
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => void handleCopyLink()}
            className="rounded-full"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4 text-[#667085]" />
            )}
            {copied ? 'Copiado' : 'Copiar enlace'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QrShareModal({
  open,
  onClose,
  title,
  subtitle,
  modes,
  defaultModeId,
}: QrShareModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Código QR"
      description="Comparte acceso inmediato respetando los permisos configurados."
    >
      {open && (
        <QrShareContent
          key={`${defaultModeId ?? modes[0]?.id ?? 'qr'}-${title}`}
          title={title}
          subtitle={subtitle}
          modes={modes}
          defaultModeId={defaultModeId}
        />
      )}
    </Modal>
  );
}
