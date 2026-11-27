export interface EditorialCoverColor {
  hex: string;
  name: string;
}

export const DEFAULT_COVER_COLOR = '#101D35';

export const EDITORIAL_COVER_COLORS: EditorialCoverColor[] = [
  { hex: '#101D35', name: 'Azul marino' },
  { hex: '#1C3152', name: 'Azul cobalto' },
  { hex: '#2F4D44', name: 'Verde bosque' },
  { hex: '#5C3A41', name: 'Borgoña clásico' },
  { hex: '#4E3B31', name: 'Caoba cuero' },
  { hex: '#3B4259', name: 'Pizarra índigo' },
  { hex: '#25394D', name: 'Azul petróleo' },
  { hex: '#5B4B2A', name: 'Bronce antiguo' },
  { hex: '#3E2F4D', name: 'Ciruela editorial' },
  { hex: '#1F4B43', name: 'Esmeralda oscuro' },
];

export const EDITORIAL_COVER_HEXES: string[] = EDITORIAL_COVER_COLORS.map((c) => c.hex);

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function sanitizeCoverPalette(colors?: string[] | null): string[] {
  if (!Array.isArray(colors)) return EDITORIAL_COVER_HEXES;
  const cleaned = Array.from(
    new Set(
      colors
        .map((c) => (typeof c === 'string' ? c.trim().toUpperCase() : ''))
        .filter((c) => HEX_COLOR_RE.test(c))
    )
  );
  return cleaned.length > 0 ? cleaned : EDITORIAL_COVER_HEXES;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Picks a cohesive editorial book cover color from `palette`.
 * When `batchIndex` is provided, cycles cleanly across the palette starting from
 * a seed-derived offset so consecutive books in an import batch never repeat
 * the same color until all selected colors have been used.
 */
export function pickEditorialCoverColor(
  seed: string,
  palette: string[] = EDITORIAL_COVER_HEXES,
  batchIndex?: number,
  batchOffset = 0
): string {
  const safePalette = sanitizeCoverPalette(palette);
  if (safePalette.length === 1) return safePalette[0];

  if (typeof batchIndex === 'number' && Number.isFinite(batchIndex)) {
    const idx = Math.abs(batchOffset + batchIndex) % safePalette.length;
    return safePalette[idx];
  }

  return safePalette[hashSeed(seed) % safePalette.length];
}
