/**
 * Server-side helper to post request to Rime API
 * Endpoint: POST https://users.rime.ai/v1/rime-tts
 */

export interface RimeTTSPayload {
  text: string;
  speaker?: string;
  modelId?: string;
  lang?: string;
  speedAlpha?: number;
  audioFormat?: string;
}

export async function generateRimeAudioStream(
  text: string,
  language: string = 'en',
  speaker: string = 'astra'
): Promise<Response> {
  const RIME_API_KEY = process.env.RIME_API_KEY || '';

  if (!RIME_API_KEY) {
    console.error('RIME_API_KEY is missing in environment variables');
    throw new Error('RIME_API_KEY_MISSING');
  }

  const isHindi = language === 'hi' || language === 'hin';
  const speedAlpha = isHindi ? 1.1 : 1.0;
  const lang = isHindi ? 'hin' : 'eng';

  const payload: RimeTTSPayload = {
    text,
    speaker: speaker || 'astra',
    modelId: 'arcana',
    lang,
    speedAlpha,
    audioFormat: 'wav',
  };

  console.log(`[RIME API] Sending request to Rime API... (lang: ${lang}, speedAlpha: ${speedAlpha})`);

  const response = await fetch('https://users.rime.ai/v1/rime-tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RIME_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'audio/wav',
    },
    body: JSON.stringify(payload),
  });

  return response;
}
