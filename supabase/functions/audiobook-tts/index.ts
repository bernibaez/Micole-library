import { handleCors, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient, resolveCaller } from '../_shared/supabaseAdmin.ts';

interface CloudVoiceCatalogItem {
  voiceURI: string;
  provider: 'azure' | 'google';
  providerVoiceName: string;
  name: string;
  lang: string;
  regionLabel: string;
  gender: 'F' | 'M';
}

const AZURE_VOICES: CloudVoiceCatalogItem[] = [
  {
    voiceURI: 'cloud:azure:es-DO-RamonaNeural',
    provider: 'azure',
    providerVoiceName: 'es-DO-RamonaNeural',
    name: 'Ramona (Rep. Dominicana)',
    lang: 'es-DO',
    regionLabel: 'República Dominicana',
    gender: 'F',
  },
  {
    voiceURI: 'cloud:azure:es-DO-EmilioNeural',
    provider: 'azure',
    providerVoiceName: 'es-DO-EmilioNeural',
    name: 'Emilio (Rep. Dominicana)',
    lang: 'es-DO',
    regionLabel: 'República Dominicana',
    gender: 'M',
  },
  {
    voiceURI: 'cloud:azure:es-MX-DaliaNeural',
    provider: 'azure',
    providerVoiceName: 'es-MX-DaliaNeural',
    name: 'Dalia (Latinoamérica)',
    lang: 'es-MX',
    regionLabel: 'Latinoamérica',
    gender: 'F',
  },
  {
    voiceURI: 'cloud:azure:es-MX-JorgeNeural',
    provider: 'azure',
    providerVoiceName: 'es-MX-JorgeNeural',
    name: 'Jorge (Latinoamérica)',
    lang: 'es-MX',
    regionLabel: 'Latinoamérica',
    gender: 'M',
  },
  {
    voiceURI: 'cloud:azure:es-ES-ElviraNeural',
    provider: 'azure',
    providerVoiceName: 'es-ES-ElviraNeural',
    name: 'Elvira (España)',
    lang: 'es-ES',
    regionLabel: 'España',
    gender: 'F',
  },
];

const GOOGLE_VOICES: CloudVoiceCatalogItem[] = [
  {
    voiceURI: 'cloud:google:es-US-Neural2-A',
    provider: 'google',
    providerVoiceName: 'es-US-Neural2-A',
    name: 'Sofía (Google Neural2)',
    lang: 'es-US',
    regionLabel: 'Latinoamérica',
    gender: 'F',
  },
  {
    voiceURI: 'cloud:google:es-US-Neural2-B',
    provider: 'google',
    providerVoiceName: 'es-US-Neural2-B',
    name: 'Mateo (Google Neural2)',
    lang: 'es-US',
    regionLabel: 'Latinoamérica',
    gender: 'M',
  },
  {
    voiceURI: 'cloud:google:es-US-Neural2-C',
    provider: 'google',
    providerVoiceName: 'es-US-Neural2-C',
    name: 'Carlos (Google Neural2)',
    lang: 'es-US',
    regionLabel: 'Latinoamérica',
    gender: 'M',
  },
  {
    voiceURI: 'cloud:google:es-ES-Neural2-A',
    provider: 'google',
    providerVoiceName: 'es-ES-Neural2-A',
    name: 'Lucía (Google Neural2)',
    lang: 'es-ES',
    regionLabel: 'España',
    gender: 'F',
  },
];

function getConfiguredCatalog() {
  const azureKey = Deno.env.get('AZURE_SPEECH_KEY')?.trim() ?? '';
  const azureRegion = Deno.env.get('AZURE_SPEECH_REGION')?.trim() || 'eastus';
  const googleKey = Deno.env.get('GOOGLE_TTS_API_KEY')?.trim() ?? '';

  const providers: Array<'azure' | 'google'> = [];
  const voices: CloudVoiceCatalogItem[] = [];

  if (azureKey) {
    providers.push('azure');
    voices.push(...AZURE_VOICES);
  }
  if (googleKey) {
    providers.push('google');
    voices.push(...GOOGLE_VOICES);
  }

  return { azureKey, azureRegion, googleKey, providers, voices };
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function synthesizeWithAzure(
  text: string,
  voice: CloudVoiceCatalogItem,
  rate: number,
  apiKey: string,
  region: string
): Promise<{ audioBase64: string; contentType: string }> {
  const rateDeltaPct = Math.round((rate - 1) * 100);
  const rateAttr = `${rateDeltaPct >= 0 ? '+' : ''}${rateDeltaPct}%`;
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.lang}"><voice name="${voice.providerVoiceName}"><prosody rate="${rateAttr}">${escapeXml(
    text
  )}</prosody></voice></speak>`;

  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'User-Agent': 'MicoleLibraryAudiobook/1.0',
    },
    body: ssml,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Azure Speech HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  const buffer = new Uint8Array(await res.arrayBuffer());
  if (buffer.byteLength < 100) {
    throw new Error('Azure Speech devolvió audio vacío.');
  }
  return {
    audioBase64: bytesToBase64(buffer),
    contentType: 'audio/mpeg',
  };
}

async function synthesizeWithGoogle(
  text: string,
  voice: CloudVoiceCatalogItem,
  rate: number,
  apiKey: string
): Promise<{ audioBase64: string; contentType: string }> {
  const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(
    apiKey
  )}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: voice.lang,
        name: voice.providerVoiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: rate,
        pitch: -0.4,
        effectsProfileId: ['headphone-class-device'],
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google TTS HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  const data = (await res.json()) as { audioContent?: string };
  if (!data.audioContent) {
    throw new Error('Google Cloud TTS no devolvió contenido de audio.');
  }

  return {
    audioBase64: data.audioContent,
    contentType: 'audio/mpeg',
  };
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const catalog = getConfiguredCatalog();

    if (req.method === 'GET') {
      return jsonResponse(req, {
        configured: catalog.voices.length > 0,
        providers: catalog.providers,
        voices: catalog.voices.map((v) => ({
          voiceURI: v.voiceURI,
          provider: v.provider,
          name: v.name,
          lang: v.lang,
          regionLabel: v.regionLabel,
          gender: v.gender,
        })),
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      text?: string;
      voiceURI?: string;
      rate?: number;
    };

    const action = body.action ?? 'voices';

    if (action === 'voices') {
      return jsonResponse(req, {
        configured: catalog.voices.length > 0,
        providers: catalog.providers,
        voices: catalog.voices.map((v) => ({
          voiceURI: v.voiceURI,
          provider: v.provider,
          name: v.name,
          lang: v.lang,
          regionLabel: v.regionLabel,
          gender: v.gender,
        })),
      });
    }

    if (action === 'synthesize') {
      if (catalog.voices.length === 0) {
        return jsonResponse(
          req,
          { error: 'No hay un proveedor de voz neural configurado todavía.' },
          503
        );
      }

      // Require authenticated user to protect cloud TTS quota from anonymous abuse
      const adminClient = createServiceClient();
      const caller = await resolveCaller(req, adminClient);
      if (!caller.userId) {
        return jsonResponse(
          req,
          { error: 'Inicia sesión para usar las voces neuronales de estudio.' },
          401
        );
      }

      const rawText = (body.text ?? '').trim();
      if (!rawText) {
        return jsonResponse(req, { error: 'Texto vacío para síntesis.' }, 400);
      }
      const text = rawText.slice(0, 1200);
      const rate = Math.min(2, Math.max(0.65, Number(body.rate) || 1));

      const voice =
        catalog.voices.find((v) => v.voiceURI === body.voiceURI) ?? catalog.voices[0];

      const result =
        voice.provider === 'azure'
          ? await synthesizeWithAzure(text, voice, rate, catalog.azureKey, catalog.azureRegion)
          : await synthesizeWithGoogle(text, voice, rate, catalog.googleKey);

      return jsonResponse(req, {
        voiceURI: voice.voiceURI,
        provider: voice.provider,
        audioBase64: result.audioBase64,
        contentType: result.contentType,
      });
    }

    return jsonResponse(req, { error: 'Acción no reconocida.' }, 400);
  } catch (err) {
    return jsonResponse(
      req,
      {
        error: err instanceof Error ? err.message : 'Error generando audio neural.',
      },
      500
    );
  }
});
