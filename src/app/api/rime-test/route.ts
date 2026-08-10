import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return handleRimeTest('Hello Riya. I am Aarvi, your AI reception assistant.', 'eng');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = body.text || 'Hello Riya. I am Aarvi, your AI reception assistant.';
    const lang = body.lang || 'eng';
    return handleRimeTest(text, lang);
  } catch (e) {
    return handleRimeTest('Hello Riya. I am Aarvi, your AI reception assistant.', 'eng');
  }
}

async function handleRimeTest(text: string, lang: string = 'eng') {
  const RIME_API_KEY = process.env.RIME_API_KEY || '';

  if (!RIME_API_KEY) {
    console.error('[RIME TEST] RIME_API_KEY missing in environment variables');
    return NextResponse.json({ error: 'RIME_API_KEY missing' }, { status: 500 });
  }

  console.log('[RIME TEST] Rime request started. Text:', text, 'Lang:', lang);

  try {
    const rimeRes = await fetch('https://users.rime.ai/v1/rime-tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RIME_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav',
      },
      body: JSON.stringify({
        text,
        speaker: 'astra',
        modelId: 'arcana',
        lang: lang === 'hi' || lang === 'hin' ? 'hin' : 'eng',
        audioFormat: 'wav',
        speedAlpha: lang === 'hi' || lang === 'hin' ? 1.1 : 1.0,
      }),
    });

    console.log('[RIME TEST] Rime response status:', rimeRes.status);
    const contentType = rimeRes.headers.get('content-type') || '';
    console.log('[RIME TEST] audio content-type:', contentType);

    if (!rimeRes.ok) {
      const errText = await rimeRes.text();
      console.error('[RIME TEST] Rime Error:', errText);
      return NextResponse.json({ error: errText, status: rimeRes.status }, { status: rimeRes.status });
    }

    const audioBuffer = await rimeRes.arrayBuffer();
    console.log('[RIME TEST] audio byte size:', audioBuffer.byteLength);

    if (audioBuffer.byteLength === 0) {
      console.error('[RIME TEST] Rime returned empty audio');
      return NextResponse.json({ error: 'Rime returned empty audio' }, { status: 500 });
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('[RIME TEST] Fetch error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Rime fetch failed' }, { status: 500 });
  }
}
