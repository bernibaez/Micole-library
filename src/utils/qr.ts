import QRCode from 'qrcode';
import { getAppOrigin } from '../lib/supabase';

const QR_DARK = '#111E32';
const QR_LIGHT = '#FFFFFF';

export function buildAppQrUrl(path: string): string {
  const origin = getAppOrigin().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
}

export async function generateQrDataUrl(url: string, width = 320): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width,
    color: {
      dark: QR_DARK,
      light: QR_LIGHT,
    },
  });
}

export async function generateQrSvgString(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: QR_DARK,
      light: QR_LIGHT,
    },
  });
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }

  if (current) lines.push(current);
  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  // Ellipsize last line if overflowed
  const joined = lines.join(' ');
  if (joined.length < text.trim().length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 4) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export interface EditorialQrCardOptions {
  url: string;
  title: string;
  subtitle?: string;
  badge?: string;
}

/**
 * Renders a high-resolution (900x1160) MICOLE LIBRARY branded editorial QR card as PNG Data URL,
 * ready for slides, syllabi, WhatsApp, or print.
 */
export async function renderEditorialQrCardPng({
  url,
  title,
  subtitle,
  badge,
}: EditorialQrCardOptions): Promise<string> {
  const width = 900;
  const height = 1160;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  // Warm ivory outer card background
  ctx.fillStyle = '#F6F5F1';
  ctx.fillRect(0, 0, width, height);

  // Inner white editorial card
  const pad = 36;
  drawRoundedRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E5E3DD';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top navy header band clipped inside card
  ctx.save();
  drawRoundedRect(ctx, pad, pad, width - pad * 2, 168, 36);
  ctx.clip();
  ctx.fillStyle = '#111E32';
  ctx.fillRect(pad, pad, width - pad * 2, 168);
  ctx.restore();

  // Square off bottom of navy header band
  ctx.fillStyle = '#111E32';
  ctx.fillRect(pad, pad + 128, width - pad * 2, 40);

  // Gold accent hairline below navy band
  ctx.fillStyle = '#C5AA70';
  ctx.fillRect(pad, pad + 168, width - pad * 2, 4);

  // Brand title in header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 32px Inter, system-ui, sans-serif';
  ctx.fillText('MICOLE LIBRARY', width / 2, pad + 78);

  ctx.fillStyle = '#E5C784';
  ctx.font = '600 15px Inter, system-ui, sans-serif';
  ctx.fillText('BIBLIOTECA JURÍDICA VIRTUAL', width / 2, pad + 114);

  if (badge) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '500 15px Inter, system-ui, sans-serif';
    ctx.fillText(badge.toUpperCase(), width / 2, pad + 146);
  }

  // QR code container frame
  const qrSize = 510;
  const qrX = (width - qrSize) / 2;
  const qrY = pad + 212;

  drawRoundedRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 28);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E5E3DD';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Render QR onto temporary canvas and copy
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: qrSize,
    color: {
      dark: QR_DARK,
      light: QR_LIGHT,
    },
  });
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Center gold/navy monogram seal (safe with level H error correction)
  const sealSize = 78;
  const sealX = width / 2 - sealSize / 2;
  const sealY = qrY + qrSize / 2 - sealSize / 2;
  drawRoundedRect(ctx, sealX - 6, sealY - 6, sealSize + 12, sealSize + 12, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  drawRoundedRect(ctx, sealX, sealY, sealSize, sealSize, 16);
  ctx.fillStyle = '#111E32';
  ctx.fill();
  ctx.strokeStyle = '#C5AA70';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#E5C784';
  ctx.font = '700 32px Georgia, serif';
  ctx.fillText('M', width / 2, sealY + 51);

  // Document Title & Subtitle below QR
  const textStartY = qrY + qrSize + 78;
  ctx.fillStyle = '#111E32';
  ctx.font = '700 30px Georgia, "Playfair Display", serif';
  const titleLines = wrapCanvasText(ctx, title, width - 160, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, textStartY + idx * 40);
  });

  if (subtitle) {
    ctx.fillStyle = '#667085';
    ctx.font = '500 20px Inter, system-ui, sans-serif';
    const subLines = wrapCanvasText(ctx, subtitle, width - 180, 1);
    ctx.fillText(subLines[0] ?? '', width / 2, textStartY + titleLines.length * 40 + 18);
  }

  // Footer instruction
  ctx.fillStyle = '#9A7D43';
  ctx.font = '600 16px Inter, system-ui, sans-serif';
  ctx.fillText('Escanea con la cámara de tu teléfono para abrir', width / 2, height - pad - 44);

  return canvas.toDataURL('image/png');
}

export function triggerFileDownload(href: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function sanitizeQrFilename(raw: string): string {
  return (
    raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 54) || 'micole-qr'
  );
}
