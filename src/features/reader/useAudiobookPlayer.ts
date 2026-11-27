import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  extractAudiobookChunksFromPage,
  type AudiobookChunk,
} from './audiobookText';
import {
  fetchCloudAudiobookVoices,
  isCloudVoiceURI,
  synthesizeCloudAudiobookChunk,
  type CloudVoiceItem,
} from '../../services/audiobookTtsService';

export type SleepTimerOption = 0 | 5 | 15 | 30 | 45 | -1; // -1 = end of current page

export interface AudiobookVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isSpanish: boolean;
  isNatural: boolean;
  source: 'cloud' | 'browser';
  provider?: 'azure' | 'google';
  qualityLabel: 'Neural IA' | 'Natural' | 'Sistema';
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
const SAMPLE_LEGAL_PHRASE =
  'Artículo primero. La dignidad humana es sagrada, innata e inviolable.';

export const PLAYBACK_RATES = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2] as const;

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

function isBrowserVoiceNatural(v: SpeechSynthesisVoice): boolean {
  const name = v.name.toLowerCase();
  if (
    name.includes('natural') ||
    name.includes('neural') ||
    name.includes('online') ||
    name.includes('google') ||
    name.includes('enhanced') ||
    name.includes('premium') ||
    name.includes('siri') ||
    name.includes('wavenet')
  ) {
    return true;
  }
  // Cloud-backed browser voices (!localService) are generally much smoother than local SAPI5
  return !v.localService;
}

function rankBrowserVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  const name = v.name.toLowerCase();
  const natural = isBrowserVoiceNatural(v);
  let score = 0;

  const isSpanish = lang.startsWith('es');
  if (isSpanish) {
    if (
      lang.startsWith('es-do') ||
      lang.startsWith('es-419') ||
      lang.startsWith('es-mx') ||
      lang.startsWith('es-us') ||
      lang.startsWith('es-co') ||
      lang.startsWith('es-ar')
    ) {
      score += 130;
    } else {
      score += 110;
    }
  }

  // Strongly prioritize Natural / Neural / Online / Google voices over robotic local SAPI5 voices
  if (natural) {
    score += 300;
    if (name.includes('natural') || name.includes('neural') || name.includes('online')) {
      score += 80;
    }
    if (name.includes('ramona') || name.includes('emilio')) {
      // Dominican Spanish Neural voices in Microsoft Edge
      score += 35;
    } else if (name.includes('dalia') || name.includes('jorge') || name.includes('google')) {
      score += 25;
    }
  } else {
    // Classic local voices: gently prefer Apple's Paulina/Mónica over robotic Windows SAPI5
    if (name.includes('paulina') || name.includes('monica') || name.includes('mónica')) {
      score += 30;
    }
    if (
      name.includes('sabina') ||
      name.includes('helena') ||
      name.includes('pablo') ||
      name.includes('raul') ||
      name.includes('laura')
    ) {
      score -= 15;
    }
  }

  if (v.default && isSpanish && natural) {
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
  const hasWebSpeech =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isBufferingAudio, setIsBufferingAudio] = useState(false);
  const [pageStatusMessage, setPageStatusMessage] = useState<string | null>(null);

  const [chunkItems, setChunkItems] = useState<AudiobookChunk[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [extractedPage, setExtractedPage] = useState<number>(0);

  const [rate, setRateState] = useState<number>(readSavedRate);
  const [autoAdvance, setAutoAdvanceState] = useState<boolean>(readSavedAutoAdvance);
  const [rawBrowserVoices, setRawBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [cloudVoices, setCloudVoices] = useState<CloudVoiceItem[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string>(readSavedVoiceURI);
  const [previewingVoiceURI, setPreviewingVoiceURI] = useState<string | null>(null);

  const [sleepTimerOption, setSleepTimerOption] = useState<SleepTimerOption>(0);
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number>(0);

  // Refs to keep event callbacks fresh and cancel ghost playback cleanly
  const pageCacheRef = useRef<Map<number, AudiobookChunk[]>>(new Map());
  const sessionTokenRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const chunkItemsRef = useRef<AudiobookChunk[]>([]);
  const activeChunkRef = useRef<number>(0);
  const rateRef = useRef<number>(rate);
  const autoAdvanceRef = useRef<boolean>(autoAdvance);
  const currentPageRef = useRef<number>(currentPage);
  const numPagesRef = useRef<number>(numPages);
  const sleepOptionRef = useRef<SleepTimerOption>(sleepTimerOption);
  const pendingAutoPlayOnPageRef = useRef<boolean>(false);
  const consecutiveEmptyPagesRef = useRef<number>(0);
  const activeVoiceURIRef = useRef<string>('');
  const bestBrowserVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const rawBrowserVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const cloudVoicesLoadedRef = useRef<boolean>(false);

  const isSupported = hasWebSpeech || cloudVoices.length > 0;

  useEffect(() => {
    chunkItemsRef.current = chunkItems;
  }, [chunkItems]);

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

  useEffect(() => {
    rawBrowserVoicesRef.current = rawBrowserVoices;
  }, [rawBrowserVoices]);

  // Clear cached page text when PDF document changes
  useEffect(() => {
    pageCacheRef.current.clear();
  }, [pdfDoc]);

  // Load and monitor Web Speech voices
  useEffect(() => {
    if (!hasWebSpeech) return;
    const loadVoices = () => {
      const list = window.speechSynthesis.getVoices();
      if (list.length > 0) {
        setRawBrowserVoices(list);
      }
    };
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, [hasWebSpeech]);

  // Discover optional Cloud Neural voices (Azure RD / Google Neural2) when player opens
  useEffect(() => {
    if (!isOpen || cloudVoicesLoadedRef.current) return;
    cloudVoicesLoadedRef.current = true;
    let cancelled = false;
    void fetchCloudAudiobookVoices().then((res) => {
      if (!cancelled && res.voices.length > 0) {
        setCloudVoices(res.voices);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const sortedBrowserVoices = useMemo(
    () => [...rawBrowserVoices].sort((a, b) => rankBrowserVoice(b) - rankBrowserVoice(a)),
    [rawBrowserVoices]
  );

  const voiceOptions = useMemo<AudiobookVoiceOption[]>(() => {
    const cloudOpts: AudiobookVoiceOption[] = cloudVoices.map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      isSpanish: v.lang.toLowerCase().startsWith('es'),
      isNatural: true,
      source: 'cloud',
      provider: v.provider,
      qualityLabel: 'Neural IA',
    }));

    const browserOpts: AudiobookVoiceOption[] = sortedBrowserVoices.map((v) => {
      const natural = isBrowserVoiceNatural(v);
      return {
        voiceURI: v.voiceURI,
        name: v.name,
        lang: v.lang,
        isSpanish: v.lang.toLowerCase().startsWith('es'),
        isNatural: natural,
        source: 'browser',
        qualityLabel: natural ? 'Natural' : 'Sistema',
      };
    });

    return [...cloudOpts, ...browserOpts];
  }, [cloudVoices, sortedBrowserVoices]);

  // Resolve the active voiceURI cleanly (prefers saved valid choice -> Cloud Neural -> Best Natural Browser)
  const resolvedVoiceURI = useMemo(() => {
    if (selectedVoiceURI) {
      const exists = voiceOptions.some((v) => v.voiceURI === selectedVoiceURI);
      if (exists) return selectedVoiceURI;
    }
    return voiceOptions[0]?.voiceURI ?? '';
  }, [selectedVoiceURI, voiceOptions]);

  useEffect(() => {
    activeVoiceURIRef.current = resolvedVoiceURI;
    bestBrowserVoiceRef.current = sortedBrowserVoices[0] ?? null;
  }, [resolvedVoiceURI, sortedBrowserVoices]);

  const clearScheduledPause = useCallback(() => {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  const stopAudioElement = useCallback(() => {
    const audio = activeAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      activeAudioRef.current = null;
    }
  }, []);

  const stopSpeechEngine = useCallback(() => {
    sessionTokenRef.current += 1;
    clearScheduledPause();
    stopAudioElement();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsBufferingAudio(false);
    setPreviewingVoiceURI(null);
    if (hasWebSpeech) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancel errors
      }
    }
  }, [clearScheduledPause, hasWebSpeech, stopAudioElement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeechEngine();
    };
  }, [stopSpeechEngine]);

  const extractPageChunks = useCallback(
    async (pageNumber: number): Promise<AudiobookChunk[]> => {
      if (!pdfDoc || pageNumber < 1 || pageNumber > pdfDoc.numPages) return [];
      const cached = pageCacheRef.current.get(pageNumber);
      if (cached) return cached;

      const page = await pdfDoc.getPage(pageNumber);
      const segmented = await extractAudiobookChunksFromPage(page);
      pageCacheRef.current.set(pageNumber, segmented);
      return segmented;
    },
    [pdfDoc]
  );

  const speakChunkAt = useCallback(
    (index: number, listOverride?: AudiobookChunk[]) => {
      const speakFrom = (targetIndex: number, list: AudiobookChunk[]) => {
        if (list.length === 0) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setIsBufferingAudio(false);
          return;
        }

        const safeIdx = Math.min(list.length - 1, Math.max(0, targetIndex));
        const chunk = list[safeIdx];
        const token = sessionTokenRef.current + 1;
        sessionTokenRef.current = token;

        clearScheduledPause();
        stopAudioElement();
        if (hasWebSpeech) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            // ignore
          }
        }

        setActiveChunkIndex(safeIdx);
        activeChunkRef.current = safeIdx;
        isPlayingRef.current = true;
        setIsPlaying(true);
        setPreviewingVoiceURI(null);

        const advanceAfterChunk = () => {
          if (sessionTokenRef.current !== token || !isPlayingRef.current) return;

          const nextIdx = safeIdx + 1;
          if (nextIdx < list.length) {
            const scaledPause = Math.max(
              55,
              Math.min(380, Math.round(chunk.pauseAfterMs / Math.max(0.85, rateRef.current)))
            );
            pauseTimerRef.current = window.setTimeout(() => {
              pauseTimerRef.current = null;
              if (sessionTokenRef.current !== token || !isPlayingRef.current) return;
              speakFrom(nextIdx, list);
            }, scaledPause);
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

        const speakWithBrowser = () => {
          if (!hasWebSpeech) {
            isPlayingRef.current = false;
            setIsPlaying(false);
            setPageStatusMessage('Tu navegador no admite síntesis de voz local.');
            return;
          }

          const utterance = new SpeechSynthesisUtterance(chunk.spokenText);
          utterance.rate = rateRef.current;
          utterance.volume = 1;

          const chosenBrowserVoice =
            rawBrowserVoicesRef.current.find((v) => v.voiceURI === activeVoiceURIRef.current) ??
            bestBrowserVoiceRef.current;

          if (chosenBrowserVoice) {
            utterance.voice = chosenBrowserVoice;
            utterance.lang = chosenBrowserVoice.lang;
            // Slightly warmer pitch softens robotic SAPI5 voices while preserving natural voices
            utterance.pitch = isBrowserVoiceNatural(chosenBrowserVoice) ? 1 : 0.96;
          } else {
            utterance.lang = 'es-ES';
            utterance.pitch = 0.98;
          }

          utterance.onend = () => {
            advanceAfterChunk();
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

        const activeUri = activeVoiceURIRef.current;
        if (isCloudVoiceURI(activeUri)) {
          setIsBufferingAudio(true);

          // Prefetch the very next sentence while fetching/playing the current one for gapless playback
          const nextChunk = list[safeIdx + 1];
          if (nextChunk) {
            void synthesizeCloudAudiobookChunk({
              text: nextChunk.spokenText,
              voiceURI: activeUri,
              rate: rateRef.current,
            });
          }

          void synthesizeCloudAudiobookChunk({
            text: chunk.spokenText,
            voiceURI: activeUri,
            rate: rateRef.current,
          }).then((blobUrl) => {
            if (sessionTokenRef.current !== token || !isPlayingRef.current) return;
            setIsBufferingAudio(false);

            if (!blobUrl) {
              // Graceful fallback to upgraded browser voice if offline, unauthenticated, or quota reached
              speakWithBrowser();
              return;
            }

            const audio = new Audio(blobUrl);
            activeAudioRef.current = audio;

            audio.onended = () => {
              if (activeAudioRef.current === audio) {
                activeAudioRef.current = null;
              }
              advanceAfterChunk();
            };

            audio.onerror = () => {
              if (sessionTokenRef.current !== token) return;
              if (activeAudioRef.current === audio) {
                activeAudioRef.current = null;
              }
              speakWithBrowser();
            };

            void audio.play().catch(() => {
              if (sessionTokenRef.current !== token) return;
              speakWithBrowser();
            });
          });
          return;
        }

        speakWithBrowser();
      };

      speakFrom(index, listOverride ?? chunkItemsRef.current);
    },
    [clearScheduledPause, hasWebSpeech, onGoToPage, stopAudioElement]
  );

  // Quick 3-second voice sample inside the Voice Picker
  const previewVoice = useCallback(
    (voiceURI: string) => {
      stopSpeechEngine();
      const token = sessionTokenRef.current + 1;
      sessionTokenRef.current = token;
      setPreviewingVoiceURI(voiceURI);

      if (isCloudVoiceURI(voiceURI)) {
        void synthesizeCloudAudiobookChunk({
          text: SAMPLE_LEGAL_PHRASE,
          voiceURI,
          rate: rateRef.current,
        }).then((blobUrl) => {
          if (sessionTokenRef.current !== token) return;
          if (!blobUrl) {
            setPreviewingVoiceURI(null);
            return;
          }
          const audio = new Audio(blobUrl);
          activeAudioRef.current = audio;
          audio.onended = () => {
            if (sessionTokenRef.current === token) setPreviewingVoiceURI(null);
          };
          audio.onerror = () => {
            if (sessionTokenRef.current === token) setPreviewingVoiceURI(null);
          };
          void audio.play().catch(() => {
            if (sessionTokenRef.current === token) setPreviewingVoiceURI(null);
          });
        });
        return;
      }

      if (!hasWebSpeech) {
        setPreviewingVoiceURI(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(SAMPLE_LEGAL_PHRASE);
      utterance.rate = rateRef.current;
      const found = rawBrowserVoicesRef.current.find((v) => v.voiceURI === voiceURI);
      if (found) {
        utterance.voice = found;
        utterance.lang = found.lang;
        utterance.pitch = isBrowserVoiceNatural(found) ? 1 : 0.96;
      } else {
        utterance.lang = 'es-ES';
      }
      utterance.onend = () => {
        if (sessionTokenRef.current === token) setPreviewingVoiceURI(null);
      };
      utterance.onerror = () => {
        if (sessionTokenRef.current === token) setPreviewingVoiceURI(null);
      };
      window.speechSynthesis.speak(utterance);
    },
    [hasWebSpeech, stopSpeechEngine]
  );

  // Extract text whenever the audiobook player is open and currentPage changes
  useEffect(() => {
    if (!isOpen || !pdfDoc || currentPage < 1) return;

    let cancelled = false;
    const shouldAutoPlay = pendingAutoPlayOnPageRef.current || isPlayingRef.current;
    pendingAutoPlayOnPageRef.current = false;

    if (isPlayingRef.current) {
      sessionTokenRef.current += 1;
      clearScheduledPause();
      stopAudioElement();
      if (hasWebSpeech) {
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

        setChunkItems(extracted);
        chunkItemsRef.current = extracted;
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
  }, [
    clearScheduledPause,
    currentPage,
    extractPageChunks,
    hasWebSpeech,
    isOpen,
    onGoToPage,
    pdfDoc,
    speakChunkAt,
    stopAudioElement,
  ]);

  // Countdown sleep timer
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

    if (extractedPage !== currentPage || chunkItemsRef.current.length === 0) {
      if (!pdfDoc) return;
      setIsLoadingPage(true);
      const extracted = await extractPageChunks(currentPage);
      setChunkItems(extracted);
      chunkItemsRef.current = extracted;
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
      const list = chunkItemsRef.current;
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
    if (activeChunkRef.current < chunkItemsRef.current.length - 1) {
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
      activeVoiceURIRef.current = uri;
      try {
        localStorage.setItem(PREF_VOICE_KEY, uri);
      } catch {
        // ignore
      }
      if (isPlayingRef.current) {
        speakChunkAt(activeChunkRef.current);
      }
    },
    [speakChunkAt]
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

  const displayChunks = useMemo(
    () => chunkItems.map((c) => c.displayText),
    [chunkItems]
  );

  const estimatedPageSecondsLeft = useMemo(() => {
    if (displayChunks.length === 0) return 0;
    const remainingText = displayChunks.slice(activeChunkIndex).join(' ');
    const words = remainingText.split(/\s+/).filter(Boolean).length;
    const wordsPerSec = (155 * rate) / 60;
    return Math.max(1, Math.round(words / wordsPerSec));
  }, [activeChunkIndex, displayChunks, rate]);

  return {
    isSupported,
    isOpen,
    isExpanded,
    setIsExpanded,
    isPlaying,
    isLoadingPage: isLoadingPage || isBufferingAudio,
    pageStatusMessage,
    chunks: displayChunks,
    activeChunkIndex,
    activeSentence: displayChunks[activeChunkIndex] ?? '',
    rate,
    setRate,
    cycleRate,
    autoAdvance,
    setAutoAdvance,
    voiceOptions,
    selectedVoiceURI: resolvedVoiceURI,
    setSelectedVoiceURI,
    previewVoice,
    previewingVoiceURI,
    hasCloudNeuralVoices: cloudVoices.length > 0,
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
