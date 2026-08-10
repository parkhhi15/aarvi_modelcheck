/**
 * Centralized Voice Playback Controller for Rime TTS
 * Single Audio instance, responseId deduplication, and clean Object URL management.
 */

let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let lastSpokenResponseId: string | null = null;

export function stopCurrentVoicePlayback() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio.src = '';
    } catch (e) {}
    activeAudio = null;
  }

  if (activeAudioUrl) {
    try {
      URL.revokeObjectURL(activeAudioUrl);
    } catch (e) {}
    activeAudioUrl = null;
  }
}

export async function testRimeSoundDirectly(): Promise<{ success: boolean; bytes?: number; error?: string }> {
  stopCurrentVoicePlayback();

  try {
    console.log('[RIME TEST BUTTON] Fetching /api/rime-test...');
    const res = await fetch('/api/rime-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello Riya. I am Aarvi, your AI reception assistant.',
        lang: 'eng',
      }),
    });

    console.log('[RIME TEST BUTTON] HTTP status:', res.status);
    const contentType = res.headers.get('content-type') || '';
    console.log('[RIME TEST BUTTON] Content-Type:', contentType);

    if (!res.ok || !contentType.includes('audio/wav')) {
      const errText = await res.text().catch(() => 'Unknown error');
      console.error('[RIME TEST BUTTON] Rime API Error:', errText);
      return { success: false, error: errText };
    }

    const blob = await res.blob();
    console.log('[RIME TEST BUTTON] Audio blob size:', blob.size);

    if (blob.size === 0) {
      console.error('[RIME TEST BUTTON] Rime returned empty audio');
      return { success: false, error: 'Rime returned empty audio' };
    }

    const url = URL.createObjectURL(blob);
    activeAudioUrl = url;
    const audio = new Audio(url);
    activeAudio = audio;
    audio.volume = 1;

    audio.onended = () => {
      console.log('[RIME TEST BUTTON] Playback finished cleanly');
      stopCurrentVoicePlayback();
    };

    audio.onerror = (err) => {
      console.error('[RIME TEST BUTTON] Audio playback error:', err);
      stopCurrentVoicePlayback();
    };

    console.log('[RIME TEST BUTTON] Audio play started ✓');
    await audio.play();
    return { success: true, bytes: blob.size };
  } catch (err: any) {
    console.error('[RIME TEST BUTTON] Playback exception:', err?.message || err);
    return { success: false, error: err?.message || 'Playback failed' };
  }
}

export async function speakWithAarvi(
  text: string,
  language: string = 'en',
  onStart?: () => void,
  onEnd?: () => void,
  responseId?: string
): Promise<{ success: boolean; audioUrl?: string; fallback?: boolean }> {
  // Deduplication check: Never play the exact same responseId twice
  if (responseId && responseId === lastSpokenResponseId) {
    console.log(`Voice deduplication: Response ID "${responseId}" already spoken. Skipping playback.`);
    if (onEnd) onEnd();
    return { success: true, fallback: false };
  }

  // Stop any currently playing audio instance
  stopCurrentVoicePlayback();

  if (responseId) {
    lastSpokenResponseId = responseId;
  }

  try {
    console.log(`[RIME SYNTHESIS] Text: "${text.slice(0, 40)}..." (lang: ${language})`);
    const res = await fetch('/api/rime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, speaker: 'astra' }),
    });

    const contentType = res.headers.get('content-type') || '';
    console.log(`[RIME SYNTHESIS] Status: ${res.status}, Content-Type: ${contentType}`);

    if (res.ok && contentType.includes('audio/wav')) {
      const blob = await res.blob();
      console.log(`[RIME SYNTHESIS] Received WAV audio blob size: ${blob.size} bytes`);

      if (blob.size === 0) {
        throw new Error('Empty Rime audio blob received');
      }

      const url = URL.createObjectURL(blob);
      activeAudioUrl = url;

      const audio = new Audio(url);
      activeAudio = audio;
      audio.volume = 1;

      audio.onplay = () => {
        console.log('[RIME SYNTHESIS] Audio playback started');
        if (onStart) onStart();
      };

      audio.onended = () => {
        console.log('[RIME SYNTHESIS] Audio playback finished');
        stopCurrentVoicePlayback();
        if (onEnd) onEnd();
      };

      audio.onerror = (err) => {
        console.warn('[RIME SYNTHESIS] Audio element playback error:', err);
        stopCurrentVoicePlayback();
        if (onEnd) onEnd();
      };

      await audio.play();
      return { success: true, audioUrl: url, fallback: false };
    }

    // Fallback if returned JSON
    const data = await res.json().catch(() => null);
    console.warn('Rime TTS API notice:', data?.message || 'Using silent fallback');
    if (onEnd) onEnd();
    return { success: false, fallback: true };
  } catch (err: any) {
    console.warn('Voice synthesis fetch error:', err?.message || err);
    if (onEnd) onEnd();
    return { success: false, fallback: true };
  }
}
