import type { PDFPageProxy } from 'pdfjs-dist';

export interface AudiobookChunk {
  /** Clean text displayed in the live transcript */
  displayText: string;
  /** Legal-diction normalized text sent to the speech engine */
  spokenText: string;
  /** Natural breathing pause after this chunk finishes (milliseconds) */
  pauseAfterMs: number;
}

const ROMAN_ORDINALS_MASC: Record<string, string> = {
  I: 'primero',
  II: 'segundo',
  III: 'tercero',
  IV: 'cuarto',
  V: 'quinto',
  VI: 'sexto',
  VII: 'séptimo',
  VIII: 'octavo',
  IX: 'noveno',
  X: 'décimo',
  XI: 'undécimo',
  XII: 'duodécimo',
  XIII: 'decimotercero',
  XIV: 'decimocuarto',
  XV: 'decimoquinto',
  XVI: 'decimosexto',
  XVII: 'decimoséptimo',
  XVIII: 'decimoctavo',
  XIX: 'decimonoveno',
  XX: 'vigésimo',
};

const ROMAN_ORDINALS_FEM: Record<string, string> = {
  I: 'primera',
  II: 'segunda',
  III: 'tercera',
  IV: 'cuarta',
  V: 'quinta',
  VI: 'sexta',
  VII: 'séptima',
  VIII: 'octava',
  IX: 'novena',
  X: 'décima',
  XI: 'undécima',
  XII: 'duodécima',
  XIII: 'decimotercera',
  XIV: 'decimocuarta',
  XV: 'decimoquinta',
  XVI: 'decimosexta',
  XVII: 'decimoséptima',
  XVIII: 'decimoctava',
  XIX: 'decimonovena',
  XX: 'vigésima',
};

/**
 * Normalizes exotic Unicode spacing/zero-width characters often found in legal PDFs.
 */
function sanitizePdfString(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
}

/**
 * Converts a legal text chunk into natural spoken Spanish without altering
 * what the user sees on screen. Expands legal abbreviations, softens ALL-CAPS
 * headings, converts structural Roman numerals, and cleans PDF artifacts.
 */
export function normalizeLegalTextForSpeech(input: string): string {
  let text = sanitizePdfString(input)
    // Strip table-of-contents dot leaders (e.g. "Capítulo I ......... 14")
    .replace(/\.{4,}/g, ', ')
    .replace(/_{3,}/g, ' ')
    // Soften legal article separators like "Art. 42.-" or "Artículo 12.-"
    .replace(/\.\s*[-–—]\s*/g, ': ')
    .replace(/\s*[—–]\s*/g, ', ')
    // Remove raw URLs that sound terrible when read aloud
    .replace(/https?:\/\/\S+/gi, 'enlace web')
    .trim();

  // If the entire chunk is ALL-CAPS (common in legal titles/headings), lowercase
  // so TTS engines don't spell out words letter by letter.
  const letters = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
  if (letters.length >= 6 && letters === letters.toUpperCase()) {
    text = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  // Expand Dominican & Hispanic legal abbreviations
  text = text
    .replace(/\bArts\.\s*/gi, 'Artículos ')
    .replace(/\bArt\.\s*/gi, 'Artículo ')
    .replace(/\bPárrs\.\s*/gi, 'Párrafos ')
    .replace(/\bParrs\.\s*/gi, 'Párrafos ')
    .replace(/\bPárr\.\s*/gi, 'Párrafo ')
    .replace(/\bParr\.\s*/gi, 'Párrafo ')
    .replace(/\bIncs\.\s*/gi, 'Incisos ')
    .replace(/\bInc\.\s*/gi, 'Inciso ')
    .replace(/\bNúms\.\s*/gi, 'Números ')
    .replace(/\bNums\.\s*/gi, 'Números ')
    .replace(/\bNúm\.\s*/gi, 'Número ')
    .replace(/\bNum\.\s*/gi, 'Número ')
    .replace(/\bNo\.\s*(?=\d)/gi, 'Número ')
    .replace(/\bN[º°]\s*(?=\d)/gi, 'Número ')
    .replace(/\bCap\.\s*/gi, 'Capítulo ')
    .replace(/\bCaps\.\s*/gi, 'Capítulos ')
    .replace(/\bTít\.\s*/gi, 'Título ')
    .replace(/\bTit\.\s*/gi, 'Título ')
    .replace(/\bSec\.\s*/gi, 'Sección ')
    .replace(/\bSecs\.\s*/gi, 'Secciones ')
    .replace(/\bOrd\.\s*/gi, 'Ordinal ')
    .replace(/\bLit\.\s*/gi, 'Literal ')
    .replace(/\bPágs\.\s*/gi, 'Páginas ')
    .replace(/\bPags\.\s*/gi, 'Páginas ')
    .replace(/\bPág\.\s*/gi, 'Página ')
    .replace(/\bPag\.\s*/gi, 'Página ')
    .replace(/\bVol\.\s*/gi, 'Volumen ')
    .replace(/\bEd\.\s*/gi, 'Edición ')
    .replace(/\bDra\.\s*/gi, 'Doctora ')
    .replace(/\bDr\.\s*/gi, 'Doctor ')
    .replace(/\bLicda\.\s*/gi, 'Licenciada ')
    .replace(/\bLic\.\s*/gi, 'Licenciado ')
    .replace(/\bSra\.\s*/gi, 'Señora ')
    .replace(/\bSr\.\s*/gi, 'Señor ')
    .replace(/\bRep\.\s*Dom\./gi, 'República Dominicana')
    .replace(/\bR\.\s*D\./g, 'República Dominicana')
    .replace(/\bvs\.\s*/gi, 'versus ')
    .replace(/\betc\./gi, 'etcétera')
    .replace(/\bCfr\.\s*/gi, 'confróntese ')
    .replace(/\bVid\.\s*/gi, 'véase ')
    .replace(/\bConst\.\s*/gi, 'Constitución ');

  // Convert structural Roman numerals (e.g., "Capítulo IV" -> "Capítulo cuarto")
  text = text.replace(
    /\b(Capítulo|Título|Libro|Párrafo|Artículo|Tomo|Volumen|Anexo)\s+([IVX]{1,5})\b/gi,
    (match, noun: string, roman: string) => {
      const ord = ROMAN_ORDINALS_MASC[roman.toUpperCase()];
      return ord ? `${noun} ${ord}` : match;
    }
  );
  text = text.replace(
    /\b(Sección|Parte|Disposición)\s+([IVX]{1,5})\b/gi,
    (match, noun: string, roman: string) => {
      const ord = ROMAN_ORDINALS_FEM[roman.toUpperCase()];
      return ord ? `${noun} ${ord}` : match;
    }
  );

  // Clean extra spaces / awkward punctuation doubles
  return text
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRunningHeaderOrPageNumber(lineText: string, normalizedY: number): boolean {
  const trimmed = lineText.trim();
  if (!trimmed) return true;

  // Top 7.5% or bottom 7.5% of the page
  const inMarginZone = normalizedY > 0.925 || normalizedY < 0.075;
  if (!inMarginZone) return false;

  // Standalone page numbers like "12", "- 12 -", "— 12 —", "Página 12", "Pág. 12 de 40"
  if (/^[-–—\s]*\d{1,4}[-–—\s]*$/.test(trimmed)) return true;
  if (/^(página|pág\.?|page)\s*\d{1,4}(\s*(de|\/)\s*\d{1,4})?$/i.test(trimmed)) return true;

  return false;
}

interface RawGlyphItem {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  str: string;
}

interface PositionedLine {
  y: number;
  height: number;
  text: string;
}

/**
 * Reconstructs a single visual line of text from PDF.js TextItems using exact
 * X-coordinate geometry. Handles all PDF styles cleanly:
 * - Normal PDFs with explicit space characters
 * - Per-character / kerning-split PDFs (does NOT inject spaces between adjacent letters)
 * - Justified / word-positioned PDFs without space chars (DOES inject space on real X gaps)
 */
function buildLineTextFromItems(items: RawGlyphItem[]): string {
  if (items.length === 0) return '';

  // Sort strictly left-to-right on this visual line
  const sorted = [...items].sort((a, b) => a.x - b.x);

  // Estimate average character width from non-space items on this line
  let totalWidth = 0;
  let totalChars = 0;
  for (const item of sorted) {
    const clean = item.str.trim();
    if (clean.length > 0 && item.width > 0) {
      totalWidth += item.width;
      totalChars += clean.length;
    }
  }
  const lineAvgCharWidth = totalChars > 0 ? totalWidth / totalChars : 0;

  let text = '';
  let lastEndX: number | null = null;
  let lastFontSize = 11;
  let pendingSpace = false;

  for (const item of sorted) {
    const str = sanitizePdfString(item.str);
    if (str.length === 0) {
      // Empty item with positive width acts as a spacer in some PDFs
      if (item.width > item.fontSize * 0.18 && text.length > 0) {
        pendingSpace = true;
      }
      continue;
    }

    // Pure whitespace item: mark pending space, do not lose previous glyph end position
    if (str.trim().length === 0) {
      if (text.length > 0) pendingSpace = true;
      if (lastEndX !== null && item.width > 0) {
        lastEndX = Math.max(lastEndX, item.x + item.width);
      }
      continue;
    }

    const startsWithSpace = str.startsWith(' ');
    const endsWithSpace = str.endsWith(' ');
    const trimmedStart = str.trimStart();

    if (text.length > 0) {
      const refFontSize = Math.max(6, (lastFontSize + item.fontSize) / 2);
      const refCharWidth =
        lineAvgCharWidth > 0
          ? Math.max(refFontSize * 0.34, Math.min(refFontSize * 0.72, lineAvgCharWidth))
          : refFontSize * 0.48;

      // Real word space in PDF typography is ~0.22-0.35em; letter kerning/tracking is < 0.14em
      const gap = lastEndX !== null ? item.x - lastEndX : 0;
      const spaceThreshold = Math.max(refFontSize * 0.18, refCharWidth * 0.38);
      const isLargeGeometricGap = lastEndX !== null && gap > spaceThreshold;

      const shouldInsertSpace =
        !text.endsWith(' ') &&
        (pendingSpace || startsWithSpace || isLargeGeometricGap) &&
        !/^[,.;:!?)\]]/.test(trimmedStart);

      if (shouldInsertSpace) {
        text += ' ';
      }
    }

    text += trimmedStart;
    pendingSpace = endsWithSpace;
    lastFontSize = item.fontSize;
    const estimatedWidth =
      item.width > 0
        ? item.width
        : trimmedStart.length * (lineAvgCharWidth > 0 ? lineAvgCharWidth : item.fontSize * 0.52);
    lastEndX = item.x + estimatedWidth;
  }

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Protects periods that do NOT end a sentence (legal abbreviations, ordinals like 6o./10a.,
 * initials like Tesis I.6o.T.122, and anything inside parentheses).
 */
function protectNonTerminalPeriods(text: string): string {
  // 1. Protect periods inside parenthetical citations like "(10a.)" or "(cfr. Art. 4)"
  let result = '';
  let parenDepth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(') parenDepth += 1;
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1;

    if (ch === '.' && parenDepth > 0) {
      result += '<DOT>';
    } else {
      result += ch;
    }
  }

  // 2. Protect known Spanish legal abbreviations
  result = result.replace(
    /\b(Art|Arts|Inc|Incs|Núm|Num|Núms|Nums|No|Dr|Dra|Lic|Licda|Cap|Caps|Tít|Tit|Sec|Secs|Ord|Lit|Párr|Parr|Párrs|Parrs|Vol|Pág|Pag|Págs|Pags|Ed|Cfr|Vid|etc|vs|Sr|Sra|Rep|Dom|Const|Frac|Fracc|Ap|Tesis|Semanario)\./gi,
    '$1<DOT>'
  );

  // 3. Protect ordinal abbreviations like "1o.", "6o.", "10a.", "2da.", "3ro."
  result = result.replace(/\b(\d{1,3}(?:o|a|ro|ra|do|da|to|ta))\./gi, '$1<DOT>');

  // 4. Protect single-letter initials like "I.", "T.", "L." when followed by space + another token
  result = result.replace(/\b([A-ZÁÉÍÓÚÑ])\.(?=\s+[A-ZÁÉÍÓÚÑ0-9])/g, '$1<DOT>');

  return result;
}

function segmentParagraph(paragraph: string, isLastParagraph: boolean): AudiobookChunk[] {
  const cleaned = sanitizePdfString(paragraph)
    // Rejoin words broken across lines with soft or hard hyphens
    .replace(/([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])[-\u00AD]\s+([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])/g, '$1$2')
    .replace(/\u00AD/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  const protectedText = protectNonTerminalPeriods(cleaned);

  const rawSentences = protectedText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/<DOT>/g, '.').trim())
    .filter((s) => s.length > 0);

  // Merge tiny stray fragments (e.g., short citation prefixes or stray closing punctuation)
  const mergedSentences: string[] = [];
  for (const s of rawSentences) {
    const prev = mergedSentences[mergedSentences.length - 1];
    if (
      prev &&
      (s.length < 18 || /^[\])},.;:]/.test(s) || prev.length < 18) &&
      prev.length + s.length + 1 <= 280
    ) {
      const glue = /^[\])},.;:]/.test(s) ? '' : ' ';
      mergedSentences[mergedSentences.length - 1] = `${prev}${glue}${s}`;
    } else {
      mergedSentences.push(s);
    }
  }

  const chunks: AudiobookChunk[] = [];

  for (let sIdx = 0; sIdx < mergedSentences.length; sIdx += 1) {
    const sentence = mergedSentences[sIdx];
    const isEndOfParagraph = sIdx === mergedSentences.length - 1;
    const endPause = isEndOfParagraph ? (isLastParagraph ? 200 : 340) : 165;

    if (sentence.length <= 270) {
      const spoken = normalizeLegalTextForSpeech(sentence);
      if (spoken) {
        chunks.push({
          displayText: sentence,
          spokenText: spoken,
          pauseAfterMs: endPause,
        });
      }
      continue;
    }

    // Split long legal sentences at semicolons, colons, or commas cleanly
    const clauses = sentence.split(/(?<=[,;:])\s+/);
    let buffer = '';
    const subPieces: string[] = [];

    for (const clause of clauses) {
      if (buffer && buffer.length + clause.length + 1 > 240) {
        subPieces.push(buffer.trim());
        buffer = clause;
      } else {
        buffer = buffer ? `${buffer} ${clause}` : clause;
      }
    }

    if (buffer.trim()) {
      if (buffer.length > 290) {
        const words = buffer.split(' ');
        let piece = '';
        for (const w of words) {
          if (piece && piece.length + w.length + 1 > 220) {
            subPieces.push(piece.trim());
            piece = w;
          } else {
            piece = piece ? `${piece} ${w}` : w;
          }
        }
        if (piece.trim()) subPieces.push(piece.trim());
      } else {
        subPieces.push(buffer.trim());
      }
    }

    for (let pIdx = 0; pIdx < subPieces.length; pIdx += 1) {
      const display = subPieces[pIdx];
      const spoken = normalizeLegalTextForSpeech(display);
      if (!spoken) continue;
      const isLastPiece = pIdx === subPieces.length - 1;
      chunks.push({
        displayText: display,
        spokenText: spoken,
        pauseAfterMs: isLastPiece ? endPause : 65,
      });
    }
  }

  return chunks;
}

/**
 * Extracts text from a PDF page using geometric X/Y coordinates so per-character
 * and word-positioned PDFs reconstruct clean words without broken spacing,
 * filters standalone page numbers/margins, preserves paragraph pauses, and
 * normalizes Spanish legal diction.
 */
export async function extractAudiobookChunksFromPage(
  page: PDFPageProxy
): Promise<AudiobookChunk[]> {
  const viewport = page.getViewport({ scale: 1 });
  const pageHeight = Math.max(1, viewport.height);
  const textContent = await page.getTextContent();

  // 1. Collect positioned glyph/text runs into horizontal visual lines by Y
  const lineBuckets: Array<{ y: number; height: number; items: RawGlyphItem[] }> = [];

  for (const item of textContent.items) {
    if (!('str' in item)) continue;
    const transform = Array.isArray(item.transform) ? item.transform : null;
    const x = transform ? Number(transform[4]) || 0 : 0;
    const y = transform ? Number(transform[5]) || 0 : 0;
    const scaleX = transform ? Math.hypot(Number(transform[0]) || 0, Number(transform[1]) || 0) : 12;
    const scaleY = transform ? Math.hypot(Number(transform[2]) || 0, Number(transform[3]) || 0) : 12;
    const fontSize = Math.max(6, scaleY || scaleX || 12);
    const width = 'width' in item && typeof item.width === 'number' ? item.width : 0;

    const glyph: RawGlyphItem = {
      x,
      y,
      width,
      fontSize,
      str: item.str,
    };

    // Match an existing visual line within 45% of font height (usually the last line,
    // but check recent buckets in case of out-of-order bold/superscript runs)
    let matchedBucket: (typeof lineBuckets)[number] | null = null;
    const searchStart = Math.max(0, lineBuckets.length - 6);
    for (let i = lineBuckets.length - 1; i >= searchStart; i -= 1) {
      const bucket = lineBuckets[i];
      const tolerance = Math.max(3.5, Math.min(bucket.height, fontSize) * 0.45);
      if (Math.abs(bucket.y - y) <= tolerance) {
        matchedBucket = bucket;
        break;
      }
    }

    if (matchedBucket) {
      matchedBucket.items.push(glyph);
      matchedBucket.height = Math.max(matchedBucket.height, fontSize);
    } else {
      lineBuckets.push({ y, height: fontSize, items: [glyph] });
    }
  }

  // Convert buckets into clean reconstructed text lines
  const lines: PositionedLine[] = [];
  for (const bucket of lineBuckets) {
    const reconstructed = buildLineTextFromItems(bucket.items);
    if (!reconstructed) continue;
    lines.push({
      y: bucket.y,
      height: bucket.height,
      text: reconstructed,
    });
  }

  // 2. Filter out margin page numbers and group lines into paragraphs
  const paragraphs: string[] = [];
  let currentParagraph = '';
  let prevLine: PositionedLine | null = null;

  for (const line of lines) {
    const normalizedY = line.y / pageHeight;
    if (isRunningHeaderOrPageNumber(line.text, normalizedY)) {
      continue;
    }

    const trimmed = line.text.trim();
    if (!trimmed) continue;

    const verticalGap = prevLine ? Math.abs(prevLine.y - line.y) : 0;
    const typicalStep = prevLine ? Math.max(12, prevLine.height * 1.65) : 20;
    const startsNewParagraph =
      prevLine !== null &&
      (verticalGap > typicalStep * 1.35 ||
        (/[.!?:]$/.test(prevLine.text.trim()) &&
          /^(Artículo|Art\.|Párrafo|Párr\.|Capítulo|Cap\.|Título|Sección|CONSIDERANDO|POR TANTO|RESULTA|VISTO)/i.test(
            trimmed
          )));

    if (startsNewParagraph && currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = trimmed;
    } else if (currentParagraph) {
      if (/[-–\u00AD]$/.test(currentParagraph)) {
        currentParagraph = `${currentParagraph.replace(/[-–\u00AD]$/, '')}${trimmed}`;
      } else {
        currentParagraph = `${currentParagraph} ${trimmed}`;
      }
    } else {
      currentParagraph = trimmed;
    }

    prevLine = line;
  }

  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }

  const allChunks: AudiobookChunk[] = [];
  for (let i = 0; i < paragraphs.length; i += 1) {
    const pieces = segmentParagraph(paragraphs[i], i === paragraphs.length - 1);
    allChunks.push(...pieces);
  }

  return allChunks;
}
