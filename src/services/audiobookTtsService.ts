import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface CloudVoiceItem {
  voiceURI: string;
  provider: 'azure' | 'google';
  name: string;
  lang: string;
  regionLabel: string;
  gender: 'F' | 'M';
}

export interface CloudVoicesResponse {
  configured: boolean;
  providers: Array<'azure' | 'google'>;
  voices: CloudVoiceItem[];
}

const MAX_AUDIO_CACHE_ENTRIES = 45;
const audioBlobUrlCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string | null>>();

function makeCacheKey(voiceURI: string, rate: number, text: string): string {
  return `${voiceURI}|${rate.toFixed(2)}|${text}`;
}

function base64ToBlobUrl(base64: string, contentType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: contentType });
  return URL.createObjectURL(blob);
}

function rememberAudioUrl(key: string, url: string) {
  if (audioBlobUrlCache.size >= MAX_AUDIO_CACHE_ENTRIES) {
    const oldestKey = audioBlobUrlCache.keys().next().value;
    if (oldestKey) {
      const oldUrl = audioBlobUrlCache.get(oldestKey);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      audioBlobUrlCache.delete(oldestKey);
    }
  }
  audioBlobUrlCache.set(key, url);
}

export async function fetchCloudAudiobookVoices(): Promise<CloudVoicesResponse> {
  if (!isSupabaseConfigured || !supabase) {
    return { configured: false, providers: [], voices: [] };
  }

  try {
    const { data, error } = await supabase.functions.invoke('audiobook-tts', {
      body: { action: 'voices' },
    });
    if (error || !data || typeof data !== 'object') {
      return { configured: false, providers: [], voices: [] };
    }
    const payload = data as Partial<CloudVoicesResponse>;
    return {
      configured: Boolean(payload.configured),
      providers: Array.isArray(payload.providers) ? payload.providers : [],
      voices: Array.isArray(payload.voices) ? payload.voices : [],
    };
  } catch {
    return { configured: false, providers: [], voices: [] };
  }
}

export async function synthesizeCloudAudiobookChunk(params: {
  text: string;
  voiceURI: string;
  rate: number;
}): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const trimmed = params.text.trim();
  if (!trimmed) return null;

  const key = makeCacheKey(params.voiceURI, params.rate, trimmed);
  const cached = audioBlobUrlCache.get(key);
  if (cached) return cached;

  const existingFlight = inFlightRequests.get(key);
  if (existingFlight) return existingFlight;

  const client = supabase;
  const task = (async () => {
    try {
      const { data, error } = await client.functions.invoke('audiobook-tts', {
        body: {
          action: 'synthesize',
          text: trimmed,
          voiceURI: params.voiceURI,
          rate: params.rate,
        },
      });

      if (error || !data || typeof data !== 'object') return null;
      const payload = data as { audioBase64?: string; contentType?: string };
      if (!payload.audioBase64) return null;

      const blobUrl = base64ToBlobUrl(payload.audioBase64, payload.contentType || 'audio/mpeg');
      rememberAudioUrl(key, blobUrl);
      return blobUrl;
    } catch {
      return null;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, task);
  return task;
}

export function isCloudVoiceURI(voiceURI: string): boolean {
  return voiceURI.startsWith('cloud:');
}
