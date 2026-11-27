import { useEffect, useRef, useState } from 'react';
import { Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface AvatarUploaderModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (blob: Blob) => Promise<void>;
}

const PREVIEW_SIZE = 240;
const EXPORT_SIZE = 384;

export function AvatarUploaderModal({ open, onClose, onUpload }: AvatarUploaderModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1.1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleClose = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setZoom(1.1);
    setOffsetX(0);
    setOffsetY(0);
    setError(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido (JPG, PNG o WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5 MB.');
      return;
    }
    setError(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    setZoom(1.1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleSave = async () => {
    if (!imgRef.current) return;
    setUploading(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo procesar el recorte.');

      const img = imgRef.current;
      const baseScale = Math.max(EXPORT_SIZE / naturalSize.w, EXPORT_SIZE / naturalSize.h);
      const drawW = naturalSize.w * baseScale * zoom;
      const drawH = naturalSize.h * baseScale * zoom;
      const factor = EXPORT_SIZE / PREVIEW_SIZE;
      const dx = (EXPORT_SIZE - drawW) / 2 + offsetX * factor;
      const dy = (EXPORT_SIZE - drawH) / 2 + offsetY * factor;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('Error al generar la imagen.'))),
          'image/webp',
          0.9
        );
      });

      await onUpload(blob);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  const previewBaseScale = Math.max(PREVIEW_SIZE / naturalSize.w, PREVIEW_SIZE / naturalSize.h);
  const previewW = naturalSize.w * previewBaseScale * zoom;
  const previewH = naturalSize.h * previewBaseScale * zoom;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Actualizar foto de perfil"
      description="Selecciona una imagen, ajusta el encuadre y previsualiza el resultado."
      size="sm"
    >
      <div className="p-6 space-y-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {!imageUrl ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-52 rounded-2xl border-2 border-dashed border-line-strong bg-surface-secondary/60 hover:bg-surface-secondary flex flex-col items-center justify-center gap-2.5 text-center p-6 transition-colors"
          >
            <span className="h-11 w-11 rounded-xl bg-white border border-line flex items-center justify-center text-navy shadow-subtle">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy">Seleccionar fotografía</p>
              <p className="text-xs text-ink-muted mt-0.5">JPG, PNG o WebP · Máximo 5 MB</p>
            </div>
          </button>
        ) : (
          <div className="space-y-4">
            {/* Circular Crop Preview */}
            <div className="flex justify-center">
              <div
                style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                className="relative rounded-full overflow-hidden border-2 border-gold/60 bg-surface-secondary shadow-subtle"
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Vista previa de recorte"
                  onLoad={(e) => {
                    const target = e.currentTarget;
                    setNaturalSize({
                      w: target.naturalWidth || 1,
                      h: target.naturalHeight || 1,
                    });
                  }}
                  style={{
                    width: previewW,
                    height: previewH,
                    maxWidth: 'none',
                    left: (PREVIEW_SIZE - previewW) / 2 + offsetX,
                    top: (PREVIEW_SIZE - previewH) / 2 + offsetY,
                  }}
                  className="absolute select-none pointer-events-none"
                />
              </div>
            </div>

            {/* Crop Controls */}
            <div className="space-y-3 bg-surface-secondary/60 rounded-xl p-3.5 text-xs">
              <label className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-ink-muted shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={2.4}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="Zoom del recorte"
                  className="flex-1 accent-navy"
                />
                <ZoomIn className="h-4 w-4 text-ink-muted shrink-0" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-ink-muted">Posición horizontal</span>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    step={2}
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full accent-navy"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-ink-muted">Posición vertical</span>
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    step={2}
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full accent-navy"
                  />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium text-navy hover:text-gold-dark underline underline-offset-2"
            >
              Elegir otra imagen
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!imageUrl}
            loading={uploading}
            onClick={() => void handleSave()}
          >
            Guardar foto
          </Button>
        </div>
      </div>
    </Modal>
  );
}
