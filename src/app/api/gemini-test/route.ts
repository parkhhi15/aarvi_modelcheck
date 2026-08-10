import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      {
        success: false,
        error: 'GEMINI_API_KEY is missing in .env.local',
      },
      { status: 200 }
    );
  }

  const modelName = 'gemini-1.5-flash';
  let detailedError = '';

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Reply with exactly: AARVI_GEMINI_OK');
    const text = result.response.text().trim();

    return NextResponse.json({
      success: true,
      response: text,
      modelUsed: modelName,
    });
  } catch (err: any) {
    detailedError = err?.message || String(err);
    console.error('Detailed Gemini API error:', detailedError);

    return NextResponse.json({
      success: false,
      error: detailedError,
      status: err?.status || 'API_KEY_OR_MODEL_INVALID',
      diagnosis:
        'Google AI Studio API keys start with "AIzaSy...". The current GEMINI_API_KEY starts with "AQ.Ab...", which Google Generative Language API rejects.',
    });
  }
}
