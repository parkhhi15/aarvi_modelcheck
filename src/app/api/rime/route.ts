import { NextRequest, NextResponse } from 'next/server';
import { generateRimeAudioStream } from '@/lib/rime';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language = 'en', speaker = 'astra' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text prompt is required for TTS' },
        { status: 400 }
      );
    }

    const rimeRes = await generateRimeAudioStream(text, language, speaker);

    if (!rimeRes.ok) {
      const errText = await rimeRes.text();
      console.warn(`Rime API HTTP Error (${rimeRes.status}):`, errText);
      return NextResponse.json(
        {
          success: false,
          message: 'Rime API voice synthesis currently unavailable',
          error: errText,
        },
        { status: 200 }
      );
    }

    const audioBuffer = await rimeRes.arrayBuffer();

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error in Rime API route:', error);

    if (error?.message === 'RIME_API_KEY_MISSING') {
      return NextResponse.json(
        {
          success: false,
          message: 'RIME_API_KEY is missing in .env.local',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Rime voice synthesis temporarily unavailable',
        error: error?.message,
      },
      { status: 200 }
    );
  }
}
