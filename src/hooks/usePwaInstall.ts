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

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(isRunningStandalone);
  const [dismissed, setDismissed] = useState<boolean>(readIsDismissed);
  const [installing, setInstalling] = useState(false);

  const isIosSafari = detectIsIosSafari();

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      return choice.outcome === 'accepted';
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore storage errors
    }
  }, []);

  const canPromptNative = Boolean(deferredPrompt && !isInstalled);
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
