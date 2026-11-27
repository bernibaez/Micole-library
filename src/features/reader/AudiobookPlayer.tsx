import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Headphones,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { BookCover } from '../books/BookCover';
import {
  PLAYBACK_RATES,
  type AudiobookVoiceOption,
  type SleepTimerOption,
} from './useAudiobookPlayer';
import type { Book, ReaderTheme } from '../../types';
import { cn } from '../../utils/cn';
import { EASE_EDITORIAL, TRANSITION_MICRO } from '../../utils/motion';

interface AudiobookPlayerProps {
  book: Book;
  theme: ReaderTheme;
  isMobile: boolean;
  currentPage: number;
  numPages: number;
  onGoToPage: (page: number) => void;
  isOpen: boolean;
  isExpanded: boolean;
  onSetExpanded: (expanded: boolean) => void;
  onClose: () => void;
  isSupported: boolean;
  isPlaying: boolean;
  isLoadingPage: boolean;
  pageStatusMessage: string | null;
  chunks: string[];
  activeChunkIndex: number;
  activeSentence: string;
  rate: number;
  onSetRate: (rate: number) => void;
  onCycleRate: () => void;
  autoAdvance: boolean;
  onSetAutoAdvance: (value: boolean) => void;
  voiceOptions: AudiobookVoiceOption[];
  selectedVoiceURI: string;
  onSetSelectedVoiceURI: (uri: string) => void;
  onPreviewVoice: (uri: string) => void;
  previewingVoiceURI: string | null;
  hasCloudNeuralVoices: boolean;
  sleepTimerOption: SleepTimerOption;
  sleepRemainingSec: number;
  onSetSleepTimer: (opt: SleepTimerOption) => void;
  estimatedPageSecondsLeft: number;
  onTogglePlay: () => void;
  onJumpToChunk: (index: number) => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
}

function formatDuration(totalSec: number): string {
  if (!totalSec || totalSec <= 0) return '0:00';
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function EqualizerBars({ playing }: { playing: boolean }) {
  return (
    <span aria-hidden="true" className="inline-flex items-end gap-[2.5px] h-3.5 shrink-0">
      {[0, 1, 2].map((bar) => (
        <m.span
          key={bar}
          className="w-[2.5px] rounded-full bg-[#C5AA70]"
          animate={
            playing
              ? {
                  height:
                    bar === 0
                      ? ['4px', '13px', '6px', '11px', '4px']
                      : bar === 1
                        ? ['12px', '5px', '14px', '7px', '12px']
                        : ['6px', '11px', '4px', '13px', '6px'],
                }
              : { height: bar === 1 ? '8px' : '5px' }
          }
          transition={
            playing
              ? {
                  duration: 0.9 + bar * 0.14,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : { duration: 0.2 }
          }
        />
      ))}
    </span>
  );
}

const SLEEP_OPTIONS: Array<{ value: SleepTimerOption; label: string }> = [
  { value: 0, label: 'Desactivado' },
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: -1, label: 'Al terminar la página' },
];

export function AudiobookPlayer({
  book,
  theme,
  isMobile,
  currentPage,
  numPages,
  onGoToPage,
  isOpen,
  isExpanded,
  onSetExpanded,
  onClose,
  isSupported,
  isPlaying,
  isLoadingPage,
  pageStatusMessage,
  chunks,
  activeChunkIndex,
  activeSentence,
  rate,
  onSetRate,
  onCycleRate,
  autoAdvance,
  onSetAutoAdvance,
  voiceOptions,
  selectedVoiceURI,
  onSetSelectedVoiceURI,
  onPreviewVoice,
  previewingVoiceURI,
  hasCloudNeuralVoices,
  sleepTimerOption,
  sleepRemainingSec,
  onSetSleepTimer,
  estimatedPageSecondsLeft,
  onTogglePlay,
  onJumpToChunk,
  onSkipBackward,
  onSkipForward,
}: AudiobookPlayerProps) {
  const [activePopover, setActivePopover] = useState<'voice' | 'speed' | 'sleep' | null>(null);
  const activeSentenceRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isExpanded || !activeSentenceRef.current) return;
    activeSentenceRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeChunkIndex, isExpanded, currentPage]);

  const visiblePopover = isOpen && isExpanded ? activePopover : null;

  const progressRatio =
    chunks.length > 0 ? Math.min(100, Math.round(((activeChunkIndex + 1) / chunks.length) * 100)) : 0;

  const cloudVoices = voiceOptions.filter((v) => v.source === 'cloud');
  const spanishVoices = voiceOptions.filter((v) => v.source === 'browser' && v.isSpanish);
  const otherVoices = voiceOptions.filter((v) => v.source === 'browser' && !v.isSpanish);
  const currentVoice = voiceOptions.find((v) => v.voiceURI === selectedVoiceURI);

  const dockSurface =
    theme === 'dark'
      ? 'bg-[#15233B]/95 border-white/15 text-slate-100'
      : theme === 'sepia'
        ? 'bg-[#FAF3E6]/96 border-[#DACAB0] text-[#3B3124]'
        : 'bg-white/96 border-[#E2E5EB] text-[#111E32]';

  return (
    <AnimatePresence>
      {isOpen && !isExpanded && (
        <m.aside
          key="audiobook-mini-dock"
          aria-label="Reproductor de audiolibro"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.97 }}
          transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[600px] rounded-2xl border backdrop-blur-md shadow-[0_18px_42px_-12px_rgba(17,30,50,0.34)] overflow-hidden',
            isMobile ? 'bottom-[116px]' : 'bottom-[82px]',
            dockSurface
          )}
        >
          {/* Thin gold progress bar along top edge */}
          <div className="h-[3px] w-full bg-current/10">
            <div
              className="h-full bg-gradient-to-r from-[#C5AA70] to-[#E5C784] transition-[width] duration-300"
              style={{ width: `${progressRatio}%` }}
            />
          </div>

          <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
            {/* Play / Pause primary button */}
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!isSupported || isLoadingPage}
              aria-label={isPlaying ? 'Pausar audiolibro' : 'Reproducir audiolibro'}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#111E32] hover:bg-[#192B45] text-[#E5C784] inline-flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
            >
              {isLoadingPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Live caption & status */}
            <button
              type="button"
              onClick={() => onSetExpanded(true)}
              className="flex-1 min-w-0 text-left group"
              title="Abrir estudio de audiolibro"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <EqualizerBars playing={isPlaying} />
                <span className="uppercase tracking-[0.12em] text-[#A48646] dark:text-[#E5C784]">
                  Audiolibro · Pág. {currentPage}
                </span>
                {sleepTimerOption !== 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#C5AA70]/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                    <Clock className="h-2.5 w-2.5" />
                    {sleepTimerOption === -1 ? 'Fin pág.' : formatDuration(sleepRemainingSec)}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-[13px] opacity-85 truncate mt-0.5 group-hover:opacity-100">
                {pageStatusMessage
                  ? pageStatusMessage
                  : isLoadingPage
                    ? 'Preparando narración de la página…'
                    : activeSentence || 'Pulsa reproducir para escuchar esta página'}
              </p>
            </button>

            {/* Compact Transport + Expand + Close */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onSkipBackward}
                aria-label="Frase anterior"
                title="Frase anterior"
                className="h-8 w-8 rounded-full inline-flex items-center justify-center hover:bg-current/10 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onSkipForward}
                aria-label="Siguiente frase"
                title="Siguiente frase"
                className="h-8 w-8 rounded-full inline-flex items-center justify-center hover:bg-current/10 transition-colors"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onCycleRate}
                aria-label={`Velocidad de narración: ${rate}x`}
                title="Cambiar velocidad"
                className="hidden sm:inline-flex h-8 px-2 rounded-full text-[11px] font-bold tabular-nums hover:bg-current/10 items-center justify-center transition-colors"
              >
                {rate}x
              </button>
              <button
                type="button"
                onClick={() => onSetExpanded(true)}
                aria-label="Expandir vista de audiolibro"
                title="Abrir estudio de audiolibro"
                className="h-8 w-8 rounded-full inline-flex items-center justify-center hover:bg-current/10 transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar reproductor de audiolibro"
                title="Cerrar audiolibro"
                className="h-8 w-8 rounded-full inline-flex items-center justify-center hover:bg-current/10 transition-colors opacity-75 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </m.aside>
      )}

      {/* ============================================================
          EXPANDED AUDIOBOOK STUDIO (Full-Screen Editorial Experience)
         ============================================================ */}
      {isOpen && isExpanded && (
        <m.div
          key="audiobook-studio"
          role="dialog"
          aria-modal="true"
          aria-label={`Modo audiolibro: ${book.title}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.28, ease: EASE_EDITORIAL }}
          className="fixed inset-0 z-50 bg-gradient-to-br from-[#0F1A2C] via-[#111E32] to-[#192B45] text-white flex flex-col h-dvh overflow-hidden"
        >
          {/* Ambient radial glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-[#C5AA70]/[0.09] blur-3xl"
          />

          {/* Top Bar */}
          <header className="relative z-10 h-14 sm:h-16 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-8 w-8 rounded-full bg-[#C5AA70]/15 border border-[#C5AA70]/40 text-[#E5C784] inline-flex items-center justify-center shrink-0">
                <Headphones className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E5C784]">
                  MICOLE LIBRARY · Audiolibro
                </p>
                <p className="text-xs text-white/70 truncate">
                  Página {currentPage} de {numPages || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSetExpanded(false)}
                className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5 text-[#E5C784]" />
                <span>Ver PDF</span>
                <Minimize2 className="h-3 w-3 opacity-70" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modo audiolibro"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Main Split: Cover & Meta (Left) + Live Synchronized Transcript (Right) */}
          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
            <div className="max-w-5xl mx-auto h-full px-5 sm:px-8 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)] gap-7 lg:gap-10 items-stretch">
              {/* Left Column: 3D Cover + Book Info */}
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left justify-center space-y-5">
                <div className="relative w-40 sm:w-48 lg:w-56">
                  {/* Subtle pulsing gold aura while narrating */}
                  <m.div
                    aria-hidden="true"
                    animate={
                      isPlaying
                        ? { opacity: [0.35, 0.65, 0.35], scale: [0.98, 1.04, 0.98] }
                        : { opacity: 0.2, scale: 1 }
                    }
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="pointer-events-none absolute -inset-3 rounded-3xl bg-[#C5AA70]/30 blur-2xl"
                  />
                  <div className="relative">
                    <BookCover
                      book={book}
                      size="lg"
                      progressPercent={numPages > 0 ? (currentPage / numPages) * 100 : undefined}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-xs">
                  <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-white leading-snug line-clamp-3">
                    {book.title}
                  </h2>
                  <p className="text-sm text-white/70 truncate">{book.author}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-white/85">
                    <EqualizerBars playing={isPlaying} />
                    {isPlaying ? 'Narrando ahora' : 'En pausa'}
                  </span>
                  {sleepTimerOption !== 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#C5AA70]/20 border border-[#C5AA70]/40 px-3 py-1 text-[#E5C784] font-semibold tabular-nums">
                      <Clock className="h-3 w-3" />
                      {sleepTimerOption === -1
                        ? 'Fin de página'
                        : `${formatDuration(sleepRemainingSec)} restantes`}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Synchronized Live Legal Transcript */}
              <div className="flex flex-col min-h-[260px] lg:min-h-0 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#E5C784]">
                    Lectura sincronizada · Página {currentPage}
                  </span>
                  <span className="text-[11px] text-white/60 tabular-nums">
                    {chunks.length > 0
                      ? `Fragmento ${activeChunkIndex + 1} de ${chunks.length} · ~${formatDuration(estimatedPageSecondsLeft)}`
                      : isLoadingPage
                        ? 'Extrayendo texto…'
                        : 'Sin texto'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
                  {isLoadingPage ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 py-12 text-white/65 text-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-[#E5C784]" />
                      <p>Extrayendo texto jurídico de la página {currentPage}…</p>
                    </div>
                  ) : pageStatusMessage && chunks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-10 px-4">
                      <p className="text-sm text-white/75 max-w-md leading-relaxed">
                        {pageStatusMessage}
                      </p>
                      {numPages > currentPage && (
                        <button
                          type="button"
                          onClick={() => onGoToPage(currentPage + 1)}
                          className="h-10 px-5 rounded-full bg-[#E5C784] text-[#111E32] text-xs font-semibold hover:bg-[#edd39b] transition-colors inline-flex items-center gap-1.5"
                        >
                          Ir a página {currentPage + 1}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    chunks.map((sentence, idx) => {
                      const isActive = idx === activeChunkIndex;
                      const isPast = idx < activeChunkIndex;
                      return (
                        <button
                          key={`${currentPage}-${idx}`}
                          ref={isActive ? activeSentenceRef : undefined}
                          type="button"
                          onClick={() => onJumpToChunk(idx)}
                          className={cn(
                            'w-full text-left rounded-xl px-3.5 py-2.5 text-sm sm:text-[15px] leading-relaxed transition-all duration-200 border-l-2',
                            isActive
                              ? 'bg-[#C5AA70]/20 border-[#E5C784] text-white font-medium shadow-sm'
                              : isPast
                                ? 'border-transparent text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
                                : 'border-transparent text-white/75 hover:text-white hover:bg-white/[0.06]'
                          )}
                        >
                          {sentence}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Audiobook Transport Console */}
          <footer className="relative z-20 border-t border-white/10 bg-[#0D1727]/95 backdrop-blur-md px-4 sm:px-6 pt-3.5 pb-4 safe-bottom shrink-0">
            <div className="max-w-3xl mx-auto space-y-3.5">
              {/* Scrub Bar across current page sentences */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, chunks.length - 1)}
                  value={Math.min(activeChunkIndex, Math.max(0, chunks.length - 1))}
                  disabled={chunks.length <= 1}
                  onChange={(e) => onJumpToChunk(Number(e.target.value))}
                  aria-label="Posición de narración en la página"
                  className="w-full h-1.5 accent-[#E5C784] cursor-pointer disabled:opacity-40"
                />
                <div className="flex items-center justify-between text-[11px] text-white/60 tabular-nums">
                  <span>{progressRatio}% de la página</span>
                  <span>
                    {chunks.length > 0
                      ? `~${formatDuration(estimatedPageSecondsLeft)} restantes`
                      : '—'}
                  </span>
                </div>
              </div>

              {/* Primary Transport Controls */}
              <div className="flex items-center justify-center gap-3 sm:gap-5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => onGoToPage(currentPage - 1)}
                  aria-label="Página anterior"
                  title="Página anterior"
                  className="h-10 px-3 rounded-full hover:bg-white/10 disabled:opacity-30 inline-flex items-center gap-1 text-xs text-white/80 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Pág. ant.</span>
                </button>

                <button
                  type="button"
                  onClick={onSkipBackward}
                  aria-label="Frase anterior"
                  title="Retroceder una frase"
                  className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/15 inline-flex items-center justify-center transition-colors"
                >
                  <RotateCcw className="h-4.5 w-4.5" />
                </button>

                <button
                  type="button"
                  onClick={onTogglePlay}
                  disabled={!isSupported || isLoadingPage}
                  aria-label={isPlaying ? 'Pausar audiolibro' : 'Reproducir audiolibro'}
                  className="h-14 w-14 rounded-full bg-[#E5C784] hover:bg-[#edd39b] text-[#111E32] inline-flex items-center justify-center shadow-[0_10px_28px_rgba(229,199,132,0.32)] transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isLoadingPage ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-6 w-6 fill-current" />
                  ) : (
                    <Play className="h-6 w-6 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={onSkipForward}
                  aria-label="Siguiente frase"
                  title="Avanzar una frase"
                  className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/15 inline-flex items-center justify-center transition-colors"
                >
                  <RotateCw className="h-4.5 w-4.5" />
                </button>

                <button
                  type="button"
                  disabled={numPages > 0 && currentPage >= numPages}
                  onClick={() => onGoToPage(currentPage + 1)}
                  aria-label="Página siguiente"
                  title="Página siguiente"
                  className="h-10 px-3 rounded-full hover:bg-white/10 disabled:opacity-30 inline-flex items-center gap-1 text-xs text-white/80 transition-colors"
                >
                  <span className="hidden sm:inline">Pág. sig.</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Utility Strip: Speed, Voice, Sleep Timer, Auto Page Advance */}
              <div className="relative flex flex-wrap items-center justify-center gap-2 pt-1">
                {/* Speed Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover((p) => (p === 'speed' ? null : 'speed'))}
                    className={cn(
                      'h-9 px-3 rounded-full border text-xs font-semibold tabular-nums inline-flex items-center gap-1.5 transition-colors',
                      visiblePopover === 'speed'
                        ? 'bg-[#C5AA70]/25 border-[#E5C784] text-[#E5C784]'
                        : 'bg-white/[0.06] border-white/12 text-white/85 hover:bg-white/10'
                    )}
                  >
                    <span>{rate}x</span>
                    <span className="hidden sm:inline opacity-70 font-normal">Velocidad</span>
                  </button>

                  <AnimatePresence>
                    {visiblePopover === 'speed' && (
                      <m.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={TRANSITION_MICRO}
                        className="absolute bottom-11 left-0 w-52 rounded-2xl bg-[#182842] border border-white/15 shadow-2xl p-2 grid grid-cols-3 gap-1 z-30"
                      >
                        {PLAYBACK_RATES.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              onSetRate(opt);
                              setActivePopover(null);
                            }}
                            className={cn(
                              'h-8 rounded-xl text-xs font-semibold tabular-nums transition-colors',
                              Math.abs(rate - opt) < 0.01
                                ? 'bg-[#E5C784] text-[#111E32]'
                                : 'text-white/80 hover:bg-white/10'
                            )}
                          >
                            {opt}x
                          </button>
                        ))}
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Voice Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover((p) => (p === 'voice' ? null : 'voice'))}
                    className={cn(
                      'h-9 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 max-w-[205px] transition-colors',
                      visiblePopover === 'voice' || currentVoice?.source === 'cloud'
                        ? 'bg-[#C5AA70]/22 border-[#E5C784]/75 text-[#E5C784]'
                        : 'bg-white/[0.06] border-white/12 text-white/85 hover:bg-white/10'
                    )}
                  >
                    {currentVoice?.source === 'cloud' ? (
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#E5C784]" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#E5C784]" />
                    )}
                    <span className="truncate">
                      {currentVoice ? currentVoice.name.replace(/^Microsoft |^Google /i, '') : 'Voz'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {visiblePopover === 'voice' && (
                      <m.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={TRANSITION_MICRO}
                        className="absolute bottom-11 left-1/2 -translate-x-1/2 w-80 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto rounded-2xl bg-[#182842] border border-white/15 shadow-2xl p-2 space-y-1 z-30"
                      >
                        {voiceOptions.length === 0 ? (
                          <p className="text-xs text-white/65 p-2">
                            Usando voz predeterminada del navegador.
                          </p>
                        ) : (
                          <>
                            {cloudVoices.length > 0 && (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E5C784] px-2 pt-1 flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3" />
                                  Voces Neural IA (Estudio)
                                </p>
                                {cloudVoices.map((v) => {
                                  const selected = v.voiceURI === selectedVoiceURI;
                                  const sampling = previewingVoiceURI === v.voiceURI;
                                  return (
                                    <div
                                      key={v.voiceURI}
                                      className={cn(
                                        'flex items-center gap-1 rounded-xl pr-1 transition-colors',
                                        selected
                                          ? 'bg-[#E5C784] text-[#111E32]'
                                          : 'text-white/90 hover:bg-white/10'
                                      )}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onSetSelectedVoiceURI(v.voiceURI);
                                          setActivePopover(null);
                                        }}
                                        className="flex-1 min-w-0 text-left px-2.5 py-2 text-xs flex items-center justify-between gap-2"
                                      >
                                        <span className={cn('truncate', selected && 'font-semibold')}>
                                          {v.name}
                                        </span>
                                        <span
                                          className={cn(
                                            'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0',
                                            selected
                                              ? 'bg-[#111E32]/15 text-[#111E32]'
                                              : 'bg-[#C5AA70]/25 text-[#E5C784]'
                                          )}
                                        >
                                          {v.qualityLabel}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onPreviewVoice(v.voiceURI)}
                                        title="Escuchar muestra de voz"
                                        aria-label={`Probar voz ${v.name}`}
                                        className={cn(
                                          'h-7 w-7 rounded-lg inline-flex items-center justify-center shrink-0 transition-colors',
                                          selected
                                            ? 'hover:bg-[#111E32]/15 text-[#111E32]'
                                            : 'hover:bg-white/15 text-white/75'
                                        )}
                                      >
                                        {sampling ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Volume2 className="h-3.5 w-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </>
                            )}

                            {spanishVoices.length > 0 && (
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E5C784]/90 px-2 pt-2">
                                Voces en español ({hasCloudNeuralVoices ? 'navegador' : 'disponibles'})
                              </p>
                            )}
                            {spanishVoices.map((v) => {
                              const selected = v.voiceURI === selectedVoiceURI;
                              const sampling = previewingVoiceURI === v.voiceURI;
                              return (
                                <div
                                  key={v.voiceURI}
                                  className={cn(
                                    'flex items-center gap-1 rounded-xl pr-1 transition-colors',
                                    selected
                                      ? 'bg-[#E5C784] text-[#111E32]'
                                      : 'text-white/85 hover:bg-white/10'
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSetSelectedVoiceURI(v.voiceURI);
                                      setActivePopover(null);
                                    }}
                                    className="flex-1 min-w-0 text-left px-2.5 py-2 text-xs flex items-center justify-between gap-2"
                                  >
                                    <span className={cn('truncate', selected && 'font-semibold')}>
                                      {v.name.replace(/^Microsoft /i, '')}
                                    </span>
                                    <span
                                      className={cn(
                                        'text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                                        selected
                                          ? 'bg-[#111E32]/15 text-[#111E32]'
                                          : v.isNatural
                                            ? 'bg-emerald-400/20 text-emerald-200'
                                            : 'bg-white/10 text-white/60'
                                      )}
                                    >
                                      {v.qualityLabel}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onPreviewVoice(v.voiceURI)}
                                    title="Escuchar muestra de voz"
                                    aria-label={`Probar voz ${v.name}`}
                                    className={cn(
                                      'h-7 w-7 rounded-lg inline-flex items-center justify-center shrink-0 transition-colors',
                                      selected
                                        ? 'hover:bg-[#111E32]/15 text-[#111E32]'
                                        : 'hover:bg-white/15 text-white/70'
                                    )}
                                  >
                                    {sampling ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Volume2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}

                            {otherVoices.length > 0 && (
                              <>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 px-2 pt-2">
                                  Otras voces
                                </p>
                                {otherVoices.slice(0, 10).map((v) => {
                                  const selected = v.voiceURI === selectedVoiceURI;
                                  return (
                                    <button
                                      key={v.voiceURI}
                                      type="button"
                                      onClick={() => {
                                        onSetSelectedVoiceURI(v.voiceURI);
                                        setActivePopover(null);
                                      }}
                                      className={cn(
                                        'w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors',
                                        selected
                                          ? 'bg-[#E5C784] text-[#111E32] font-semibold'
                                          : 'text-white/75 hover:bg-white/10'
                                      )}
                                    >
                                      <span className="truncate">{v.name}</span>
                                      <span className="text-[10px] opacity-65 shrink-0">{v.lang}</span>
                                    </button>
                                  );
                                })}
                              </>
                            )}
                          </>
                        )}
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sleep Timer */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setActivePopover((p) => (p === 'sleep' ? null : 'sleep'))}
                    className={cn(
                      'h-9 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 transition-colors',
                      sleepTimerOption !== 0 || visiblePopover === 'sleep'
                        ? 'bg-[#C5AA70]/25 border-[#E5C784] text-[#E5C784]'
                        : 'bg-white/[0.06] border-white/12 text-white/85 hover:bg-white/10'
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {sleepTimerOption === 0
                        ? 'Temporizador'
                        : sleepTimerOption === -1
                          ? 'Fin de pág.'
                          : formatDuration(sleepRemainingSec)}
                    </span>
                  </button>

                  <AnimatePresence>
                    {visiblePopover === 'sleep' && (
                      <m.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={TRANSITION_MICRO}
                        className="absolute bottom-11 right-0 w-48 rounded-2xl bg-[#182842] border border-white/15 shadow-2xl p-1.5 space-y-0.5 z-30"
                      >
                        {SLEEP_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              onSetSleepTimer(opt.value);
                              setActivePopover(null);
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-xl text-xs transition-colors',
                              sleepTimerOption === opt.value
                                ? 'bg-[#E5C784] text-[#111E32] font-semibold'
                                : 'text-white/85 hover:bg-white/10'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Auto Page Turn */}
                <button
                  type="button"
                  onClick={() => onSetAutoAdvance(!autoAdvance)}
                  aria-pressed={autoAdvance}
                  title="Avanzar automáticamente a la siguiente página al terminar"
                  className={cn(
                    'h-9 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 transition-colors',
                    autoAdvance
                      ? 'bg-[#C5AA70]/20 border-[#C5AA70]/60 text-[#E5C784]'
                      : 'bg-white/[0.06] border-white/12 text-white/60 hover:bg-white/10'
                  )}
                >
                  <Repeat className="h-3.5 w-3.5" />
                  <span>Auto-página</span>
                </button>
              </div>
            </div>
          </footer>
        </m.div>
      )}
    </AnimatePresence>
  );
}
