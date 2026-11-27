import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'micole:v2:pwa-dismissed-at';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = Boolean((window.navigator as { standalone?: boolean }).standalone);
  return Boolean(mq || iosStandalone);
}

function detectIsIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isWebKit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isWebKit;
}

function readIsDismissed(): boolean {
  try {
    const raw = Number(localStorage.getItem(DISMISS_KEY));
    if (!Number.isFinite(raw) || raw <= 0) return false;
    return Date.now() - raw < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

// Module-level shared store so all components receive the captured install event
let sharedPrompt: BeforeInstallPromptEvent | null = null;
let sharedInstalled = isRunningStandalone();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    sharedPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    sharedInstalled = true;
    sharedPrompt = null;
    notifyListeners();
  });
}

export function usePwaInstall() {
  const [, setTick] = useState(0);
  const [dismissed, setDismissed] = useState<boolean>(readIsDismissed);
  const [installing, setInstalling] = useState(false);

  const isIosSafari = detectIsIosSafari();

  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!sharedPrompt) return false;
    setInstalling(true);
    try {
      await sharedPrompt.prompt();
      const choice = await sharedPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        sharedInstalled = true;
      }
      sharedPrompt = null;
      notifyListeners();
      return choice.outcome === 'accepted';
    } finally {
      setInstalling(false);
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore storage errors
    }
  }, []);

  const isInstalled = sharedInstalled;
  const canPromptNative = Boolean(sharedPrompt && !isInstalled);
  const showBanner = !isInstalled && !dismissed && (canPromptNative || isIosSafari);

  return {
    isInstalled,
    isIosSafari,
    canPromptNative,
    showBanner,
    installing,
    promptInstall,
    dismissBanner,
  };
}
