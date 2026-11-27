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
 * Converts a legal text chunk into natural spoken Spanish without altering
 * what the user sees on screen. Expands legal abbreviations, softens ALL-CAPS
 * headings, converts structural Roman numerals, and cleans PDF artifacts.
 */
export function normalizeLegalTextForSpeech(input: string): string {
  let text = input
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

interface PositionedLine {
  y: number;
  height: number;
  text: string;
}

function segmentParagraph(paragraph: string, isLastParagraph: boolean): AudiobookChunk[] {
  const cleaned = paragraph
    // Rejoin words broken across lines with hyphens
    .replace(/([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])-\s+([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])/g, '$1$2')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  // Protect legal abbreviations from splitting sentences prematurely
  const protectedText = cleaned.replace(
    /\b(Art|Arts|Inc|Incs|Núm|Num|Núms|Nums|No|Dr|Dra|Lic|Licda|Cap|Caps|Tít|Tit|Sec|Secs|Ord|Lit|Párr|Parr|Párrs|Parrs|Vol|Pág|Pag|Págs|Pags|Ed|Cfr|Vid|etc|vs|Sr|Sra|Rep|Dom|Const)\./gi,
    '$1<DOT>'
  );

  const rawSentences = protectedText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/<DOT>/g, '.').trim())
    .filter((s) => s.length > 0);

  const chunks: AudiobookChunk[] = [];

  for (let sIdx = 0; sIdx < rawSentences.length; sIdx += 1) {
    const sentence = rawSentences[sIdx];
    const isEndOfParagraph = sIdx === rawSentences.length - 1;
    const endPause = isEndOfParagraph ? (isLastParagraph ? 200 : 340) : 165;

    // Comfortable chunk length (~260 chars) gives smoother phrasing & fewer awkward stops
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
 * Extracts text from a PDF page while filtering standalone page numbers/margins,
 * preserving paragraph boundaries for natural pauses, and normalizing legal diction.
 */
export async function extractAudiobookChunksFromPage(
  page: PDFPageProxy
): Promise<AudiobookChunk[]> {
  const viewport = page.getViewport({ scale: 1 });
  const pageHeight = Math.max(1, viewport.height);
  const textContent = await page.getTextContent();

  // Group PDF text items into horizontal visual lines by Y coordinate
  const lines: PositionedLine[] = [];
  for (const item of textContent.items) {
    if (!('str' in item)) continue;
    const str = item.str;
    if (!str) continue;

    const transform = Array.isArray(item.transform) ? item.transform : null;
    const y = transform ? Number(transform[5]) : 0;
    const fontHeight = transform ? Math.max(8, Math.abs(Number(transform[3])) || 12) : 12;

    const lastLine = lines[lines.length - 1];
    if (lastLine && Math.abs(lastLine.y - y) <= Math.max(4, fontHeight * 0.45)) {
      // Join items on the same line carefully
      const needsSpace =
        lastLine.text.length > 0 &&
        !lastLine.text.endsWith(' ') &&
        !lastLine.text.endsWith('-') &&
        !str.startsWith(' ') &&
        !/^[,.;:!?)]/.test(str);
      lastLine.text += needsSpace ? ` ${str}` : str;
      lastLine.height = Math.max(lastLine.height, fontHeight);
    } else {
      lines.push({ y, height: fontHeight, text: str });
    }
  }

  // Filter out margin page numbers and group lines into paragraphs
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
      if (currentParagraph.endsWith('-')) {
        currentParagraph = `${currentParagraph.slice(0, -1)}${trimmed}`;
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
