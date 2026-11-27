import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export type SleepTimerOption = 0 | 5 | 15 | 30 | 45 | -1; // -1 = end of current page

export interface AudiobookVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isSpanish: boolean;
  isNatural: boolean;
}

interface UseAudiobookPlayerArgs {
  pdfDoc: PDFDocumentProxy | null;
  currentPage: number;
  numPages: number;
  bookTitle: string;
  bookAuthor: string;
  onGoToPage: (page: number) => void;
}

const PREF_RATE_KEY = 'micole:audio:rate';
const PREF_VOICE_KEY = 'micole:audio:voiceURI';
const PREF_AUTO_ADVANCE_KEY = 'micole:audio:autoAdvance';

export const PLAYBACK_RATES = [0.75, 1, 1.15, 1.25, 1.5, 1.75, 2] as const;

function readSavedRate(): number {
  try {
    const raw = Number(localStorage.getItem(PREF_RATE_KEY));
    if (Number.isFinite(raw) && raw >= 0.5 && raw <= 2.5) return raw;
  } catch {
    // ignore storage errors
  }
  return 1;
}

function readSavedVoiceURI(): string {
  try {
    return localStorage.getItem(PREF_VOICE_KEY) || '';
  } catch {
    return '';
  }
}

function readSavedAutoAdvance(): boolean {
  try {
    const raw = localStorage.getItem(PREF_AUTO_ADVANCE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

/**
 * Cleans raw PDF text items into readable paragraphs & sentences
 * suitable for natural Spanish legal narration.
 */
function segmentPageText(rawText: string): string[] {
  const cleaned = rawText
    // Rejoin words broken across lines with hyphens
    .replace(/([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])-\s+([a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])/g, '$1$2')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return [];

  // Split by sentence boundaries while avoiding splits on common legal abbreviations (Art., Inc., Núm., No., Dr., Lic., Cap., Párr.)
  const protectedText = cleaned.replace(
    /\b(Art|Arts|Inc|Núm|Num|No|Dr|Dra|Lic|Cap|Sec|Párr|Parr|Vol|Pág|Pag|Ed|Cfr|Vid|etc|Sr|Sra|Rep|Dom)\./gi,
    '$1<DOT>'
  );

  const rawSentences = protectedText
    .split(/(?<=[.!?;:])\s+/)
    .map((s) => s.replace(/<DOT>/g, '.').trim())
    .filter((s) => s.length > 0);

  // Ensure chunks stay within a comfortable length (~210 chars) so Web Speech API never stalls
  const chunks: string[] = [];
  for (const sentence of rawSentences) {
    if (sentence.length <= 220) {
      chunks.push(sentence);
      continue;
    }

    const clauses = sentence.split(/(?<=,)\s+/);
    let buffer = '';
    for (const clause of clauses) {
      if (buffer && buffer.length + clause.length + 1 > 210) {
        chunks.push(buffer.trim());
        buffer = clause;
      } else {
        buffer = buffer ? `${buffer} ${clause}` : clause;
      }
    }
    if (buffer.trim()) {
      // Fallback hard split for extremely long punctuation-free blocks
      if (buffer.length > 260) {
        const words = buffer.split(' ');
        let piece = '';
        for (const w of words) {
          if (piece && piece.length + w.length + 1 > 200) {
            chunks.push(piece.trim());
            piece = w;
          } else {
            piece = piece ? `${piece} ${w}` : w;
          }
        }
        if (piece.trim()) chunks.push(piece.trim());
      } else {
        chunks.push(buffer.trim());
      }
    }
  }

  return chunks;
}

function rankVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  const name = v.name.toLowerCase();
  let score = 0;

  if (lang.startsWith('es-do') || lang.startsWith('es-419') || lang.startsWith('es-mx') || lang.startsWith('es-us')) {
    score += 120;
  } else if (lang.startsWith('es')) {
    score += 100;
  }

  if (
    name.includes('natural') ||
    name.includes('neural') ||
    name.includes('online') ||
    name.includes('google') ||
    name.includes('paulina') ||
    name.includes('monica') ||
    name.includes('mónica') ||
    name.includes('elena') ||
    name.includes('alvaro') ||
    name.includes('álvaro') ||
    name.includes('sabina')
  ) {
    score += 40;
  }

  if (v.default && lang.startsWith('es')) {
    score += 10;
  }

  return score;
}

export function useAudiobookPlayer({
  pdfDoc,
  currentPage,
  numPages,
  bookTitle,
  bookAuthor,
  onGoToPage,
}: UseAudiobookPlayerArgs) {
  const isSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageStatusMessage, setPageStatusMessage] = useState<string | null>(null);

  const [chunks, setChunks] = useState<string[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [extractedPage, setExtractedPage] = useState<number>(0);

  const [rate, setRateState] = useState<number>(readSavedRate);
  const [autoAdvance, setAutoAdvanceState] = useState<boolean>(readSavedAutoAdvance);
  const [rawVoices, setRawVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string>(readSavedVoiceURI);

  const [sleepTimerOption, setSleepTimerOption] = useState<SleepTimerOption>(0);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number>(0);

  // Refs to keep event callbacks completely fresh and prevent stale closures or ghost utterances
  const pageCacheRef = useRef<Map<number, string[]>>(new Map());
  const sessionTokenRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const chunksRef = useRef<string[]>([]);
  const activeChunkRef = useRef<number>(0);
  const rateRef = useRef<number>(rate);
  const autoAdvanceRef = useRef<boolean>(autoAdvance);
  const currentPageRef = useRef<number>(currentPage);
  const numPagesRef = useRef<number>(numPages);
  const sleepOptionRef = useRef<SleepTimerOption>(sleepTimerOption);
  const pendingAutoPlayOnPageRef = useRef<boolean>(false);
  const consecutiveEmptyPagesRef = useRef<number>(0);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    chunksRef.current = chunks;
  }, [chunks]);

  useEffect(() => {
    activeChunkRef.current = activeChunkIndex;
  }, [activeChunkIndex]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    numPagesRef.current = numPages;
  }, [numPages]);

  useEffect(() => {
    sleepOptionRef.current = sleepTimerOption;
  }, [sleepTimerOption]);

  // Clear cached page text when PDF document changes
  useEffect(() => {
    pageCacheRef.current.clear();
  }, [pdfDoc]);

  // Load and monitor Web Speech voices
  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) {
        setRawVoices(list);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  const voiceOptions = useMemo<AudiobookVoiceOption[]>(() => {
    const sorted = [...rawVoices].sort((a, b) => rankVoice(b) - rankVoice(a));
    return sorted.map((v) => {
      const lower = v.name.toLowerCase();
      return {
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        isSpanish: v.lang.toLowerCase().startsWith('es'),
        isNatural:
          lower.includes('natural') ||
          lower.includes('neural') ||
          lower.includes('online') ||
          lower.includes('google'),
      };
    });
  }, [rawVoices]);

  const activeVoice = useMemo<SpeechSynthesisVoice | null>(() => {
    if (rawVoices.length === 0) return null;
    if (selectedVoiceURI) {
      const found = rawVoices.find((v) => v.voiceURI === selectedVoiceURI);
      if (found) return found;
    }
    const sorted = [...rawVoices].sort((a, b) => rankVoice(b) - rankVoice(a));
    return sorted[0] ?? null;
  }, [rawVoices, selectedVoiceURI]);

  useEffect(() => {
    selectedVoiceRef.current = activeVoice;
  }, [activeVoice]);

  const stopSpeechEngine = useCallback(() => {
    sessionTokenRef.current += 1;
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancel errors
      }
    }
  }, [isSupported]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeechEngine();
    };
  }, [stopSpeechEngine]);

  const extractPageChunks = useCallback(
    async (pageNumber: number): Promise<string[]> => {
      if (!pdfDoc || pageNumber < 1 || pageNumber > pdfDoc.numPages) return [];
      const cached = pageCacheRef.current.get(pageNumber);
      if (cached) return cached;

      const page = await pdfDoc.getPage(pageNumber);
      const textContent = await page.getTextContent();

      let joined = '';
      let lastY: number | null = null;
      for (const item of textContent.items) {
        if (!('str' in item)) continue;
        const text = item.str;
        const transform = Array.isArray(item.transform) ? item.transform : null;
        const y = transform ? Number(transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 8) {
          joined += ' ';
        }
        joined += text;
        if ('hasEOL' in item && item.hasEOL) {
          joined += ' ';
        }
        if (y !== null) lastY = y;
      }

      const segmented = segmentPageText(joined);
      pageCacheRef.current.set(pageNumber, segmented);
      return segmented;
    },
    [pdfDoc]
  );

  const speakChunkAt = useCallback(
    (index: number, listOverride?: string[]) => {
      if (!isSupported) return;

      const speakFrom = (targetIndex: number, list: string[]) => {
        if (list.length === 0) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          return;
        }

        const safeIdx = Math.min(list.length - 1, Math.max(0, targetIndex));
        const token = sessionTokenRef.current + 1;
        sessionTokenRef.current = token;

        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }

        setActiveChunkIndex(safeIdx);
        activeChunkRef.current = safeIdx;
        isPlayingRef.current = true;
        setIsPlaying(true);

        const utterance = new SpeechSynthesisUtterance(list[safeIdx]);
        utterance.rate = rateRef.current;
        utterance.pitch = 1;
        utterance.volume = 1;

        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
          utterance.lang = selectedVoiceRef.current.lang;
        } else {
          utterance.lang = 'es-ES';
        }

        utterance.onend = () => {
          if (sessionTokenRef.current !== token || !isPlayingRef.current) return;

          const nextIdx = safeIdx + 1;
          if (nextIdx < list.length) {
            speakFrom(nextIdx, list);
            return;
          }

          // Reached end of current page
          if (sleepOptionRef.current === -1) {
            setSleepTimerOption(0);
            setSleepRemainingSec(0);
            isPlayingRef.current = false;
            setIsPlaying(false);
            return;
          }

          if (autoAdvanceRef.current && currentPageRef.current < numPagesRef.current) {
            pendingAutoPlayOnPageRef.current = true;
            onGoToPage(currentPageRef.current + 1);
          } else {
            isPlayingRef.current = false;
            setIsPlaying(false);
          }
        };

        utterance.onerror = (event) => {
          if (sessionTokenRef.current !== token) return;
          if (event.error === 'canceled' || event.error === 'interrupted') return;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setPageStatusMessage(
            'El navegador pausó la narración de voz. Pulsa reproducir para continuar.'
          );
        };

        window.speechSynthesis.speak(utterance);
      };

      speakFrom(index, listOverride ?? chunksRef.current);
    },
    [isSupported, onGoToPage]
  );

  // Extract text whenever the audiobook player is open and currentPage changes
  useEffect(() => {
    if (!isOpen || !pdfDoc || currentPage < 1) return;

    let cancelled = false;
    const shouldAutoPlay = pendingAutoPlayOnPageRef.current || isPlayingRef.current;
    pendingAutoPlayOnPageRef.current = false;

    if (isPlayingRef.current) {
      // Cancel previous page's audio while loading the new page
      sessionTokenRef.current += 1;
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    }

    const load = async () => {
      setIsLoadingPage(true);
      setPageStatusMessage(null);
      try {
        const extracted = await extractPageChunks(currentPage);
        if (cancelled) return;

        setChunks(extracted);
        chunksRef.current = extracted;
        setActiveChunkIndex(0);
        activeChunkRef.current = 0;
        setExtractedPage(currentPage);
        setIsLoadingPage(false);

        if (extracted.length === 0) {
          if (
            shouldAutoPlay &&
            autoAdvanceRef.current &&
            currentPage < numPagesRef.current &&
            consecutiveEmptyPagesRef.current < 4
          ) {
            consecutiveEmptyPagesRef.current += 1;
            pendingAutoPlayOnPageRef.current = true;
            onGoToPage(currentPage + 1);
            return;
          }
          consecutiveEmptyPagesRef.current = 0;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setPageStatusMessage(
            'Esta página no contiene texto seleccionable (posible portada o imagen escaneada). Cambia de página para escuchar el contenido.'
          );
          return;
        }

        consecutiveEmptyPagesRef.current = 0;
        if (shouldAutoPlay) {
          speakChunkAt(0, extracted);
        }
      } catch {
        if (cancelled) return;
        setIsLoadingPage(false);
        isPlayingRef.current = false;
        setIsPlaying(false);
        setPageStatusMessage('No se pudo extraer el texto de esta página.');
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentPage, extractPageChunks, isOpen, isSupported, onGoToPage, pdfDoc, speakChunkAt]);

  // Countdown sleep timer (for minute-based timers)
  useEffect(() => {
    if (sleepTimerOption <= 0 || !isPlaying) return;
    const interval = window.setInterval(() => {
      setSleepRemainingSec((prev) => {
        if (prev <= 1) {
          stopSpeechEngine();
          setSleepTimerOption(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isPlaying, sleepTimerOption, stopSpeechEngine]);

  const setSleepTimer = useCallback((option: SleepTimerOption) => {
    setSleepTimerOption(option);
    setSleepRemainingSec(option > 0 ? option * 60 : 0);
  }, []);

  const play = useCallback(async () => {
    if (!isSupported) {
      setPageStatusMessage('Tu navegador no admite síntesis de voz para audiolibros.');
      return;
    }
    setIsOpen(true);
    setPageStatusMessage(null);

    if (extractedPage !== currentPage || chunksRef.current.length === 0) {
      if (!pdfDoc) return;
      setIsLoadingPage(true);
      const extracted = await extractPageChunks(currentPage);
      setChunks(extracted);
      chunksRef.current = extracted;
      setExtractedPage(currentPage);
      setIsLoadingPage(false);

      if (extracted.length === 0) {
        setPageStatusMessage(
          'Esta página no contiene texto narrable. Avanza a una página con texto.'
        );
        return;
      }
      speakChunkAt(0, extracted);
      return;
    }

    speakChunkAt(activeChunkRef.current);
  }, [currentPage, extractPageChunks, extractedPage, isSupported, pdfDoc, speakChunkAt]);

  const pause = useCallback(() => {
    stopSpeechEngine();
  }, [stopSpeechEngine]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      void play();
    }
  }, [pause, play]);

  const jumpToChunk = useCallback(
    (index: number) => {
      const list = chunksRef.current;
      if (list.length === 0) return;
      const clamped = Math.min(list.length - 1, Math.max(0, index));
      setActiveChunkIndex(clamped);
      activeChunkRef.current = clamped;
      if (isPlayingRef.current || isOpen) {
        speakChunkAt(clamped, list);
      }
    },
    [isOpen, speakChunkAt]
  );

  const skipBackward = useCallback(() => {
    if (activeChunkRef.current > 0) {
      jumpToChunk(activeChunkRef.current - 1);
    } else if (currentPageRef.current > 1) {
      if (isPlayingRef.current) pendingAutoPlayOnPageRef.current = true;
      onGoToPage(currentPageRef.current - 1);
    }
  }, [jumpToChunk, onGoToPage]);

  const skipForward = useCallback(() => {
    if (activeChunkRef.current < chunksRef.current.length - 1) {
      jumpToChunk(activeChunkRef.current + 1);
    } else if (currentPageRef.current < numPagesRef.current) {
      if (isPlayingRef.current) pendingAutoPlayOnPageRef.current = true;
      onGoToPage(currentPageRef.current + 1);
    }
  }, [jumpToChunk, onGoToPage]);

  const setRate = useCallback(
    (nextRate: number) => {
      setRateState(nextRate);
      rateRef.current = nextRate;
      try {
        localStorage.setItem(PREF_RATE_KEY, String(nextRate));
      } catch {
        // ignore
      }
      if (isPlayingRef.current) {
        speakChunkAt(activeChunkRef.current);
      }
    },
    [speakChunkAt]
  );

  const cycleRate = useCallback(() => {
    const idx = PLAYBACK_RATES.findIndex((r) => Math.abs(r - rateRef.current) < 0.01);
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    setRate(next);
  }, [setRate]);

  const setSelectedVoiceURI = useCallback(
    (uri: string) => {
      setSelectedVoiceURIState(uri);
      const found = rawVoices.find((v) => v.voiceURI === uri) ?? null;
      selectedVoiceRef.current = found;
      try {
        localStorage.setItem(PREF_VOICE_KEY, uri);
      } catch {
        // ignore
      }
      if (isPlayingRef.current) {
        speakChunkAt(activeChunkRef.current);
      }
    },
    [rawVoices, speakChunkAt]
  );

  const setAutoAdvance = useCallback((value: boolean) => {
    setAutoAdvanceState(value);
    autoAdvanceRef.current = value;
    try {
      localStorage.setItem(PREF_AUTO_ADVANCE_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  const openPlayer = useCallback((expanded = false) => {
    setIsOpen(true);
    setIsExpanded(expanded);
  }, []);

  const closePlayer = useCallback(() => {
    stopSpeechEngine();
    setIsExpanded(false);
    setIsOpen(false);
  }, [stopSpeechEngine]);

  // OS / Headphone Media Session controls
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${bookTitle} · Pág. ${currentPage}`,
        artist: bookAuthor || 'MICOLE LIBRARY',
        album: 'MICOLE LIBRARY — Audiolibro',
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', () => void play());
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('previoustrack', skipBackward);
      navigator.mediaSession.setActionHandler('nexttrack', skipForward);
    } catch {
      // ignore unsupported MediaSession environments
    }
  }, [bookAuthor, bookTitle, currentPage, isOpen, isPlaying, pause, play, skipBackward, skipForward]);

  // Estimated remaining seconds on current page (~150 wpm at 1.0x)
  const estimatedPageSecondsLeft = useMemo(() => {
    if (chunks.length === 0) return 0;
    const remainingText = chunks.slice(activeChunkIndex).join(' ');
    const words = remainingText.split(/\s+/).filter(Boolean).length;
    const wordsPerSec = (155 * rate) / 60;
    return Math.max(1, Math.round(words / wordsPerSec));
  }, [activeChunkIndex, chunks, rate]);

  return {
    isSupported,
    isOpen,
    isExpanded,
    setIsExpanded,
    isPlaying,
    isLoadingPage,
    pageStatusMessage,
    chunks,
    activeChunkIndex,
    activeSentence: chunks[activeChunkIndex] ?? '',
    rate,
    setRate,
    cycleRate,
    autoAdvance,
    setAutoAdvance,
    voiceOptions,
    selectedVoiceURI: activeVoice?.voiceURI ?? selectedVoiceURI,
    setSelectedVoiceURI,
    sleepTimerOption,
    sleepRemainingSec,
    setSleepTimer,
    estimatedPageSecondsLeft,
    openPlayer,
    closePlayer,
    play,
    pause,
    togglePlay,
    jumpToChunk,
    skipBackward,
    skipForward,
  };
}
