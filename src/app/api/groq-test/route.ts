import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function GET(req: NextRequest) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

  if (!GROQ_API_KEY || GROQ_API_KEY.includes('placeholder')) {
    console.error('Groq test failed: GROQ_API_KEY is missing or unconfigured in .env.local');
    return NextResponse.json(
      {
        success: false,
        error: 'GROQ_API_KEY is missing or unconfigured in .env.local',
        diagnosis: 'Please set GROQ_API_KEY in .env.local with a valid key starting with "gsk_".',
      },
      { status: 200 }
    );
  }

  const modelName = 'llama-3.1-8b-instant';

  try {
    console.log('Groq request started');
    console.log(`Groq model: ${modelName}`);

    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: 'Reply exactly with: AARVI_GROQ_OK',
        },
      ],
      temperature: 0,
      max_tokens: 30,
    });

    console.log('Groq response received');

    const reply = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      success: true,
      response: reply,
      modelUsed: modelName,
    });
  } catch (err: any) {
    const detailedError = err?.message || String(err);
    console.error('Groq API Error in /api/groq-test:', detailedError);

    return NextResponse.json({
      success: false,
      error: detailedError,
      status: err?.status || 'GROQ_API_ERROR',
    });
  }
}
