import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FARM_EXPLANATION_SYSTEM_PROMPT, fallbackFarmExplanation, farmExplanationContextSchema, farmExplanationSchema } from '@/lib/gemini/farm-explanation';

const MODEL = 'gemini-3.5-flash-lite';
const requestSchema = z.object({ context: farmExplanationContextSchema });
const responseJsonSchema = {
  type: 'object', additionalProperties: false, required: ['sections'], properties: { sections: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['id', 'summary', 'points', 'limitation'], properties: { id: { type: 'string', enum: ['overview', 'climate', 'water', 'soil', 'rotation', 'terrain'] }, summary: { type: 'string' }, points: { type: 'array', maxItems: 2, items: { type: 'string' } }, limitation: { type: 'string' } } } } },
};

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: 'INVALID_EXPLANATION_INPUT', message: 'Dados de resultado inválidos.' }, { status: 422 });
  const fallback = fallbackFarmExplanation(parsed.data.context);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ ...fallback, origin: 'fallback', warning: 'GEMINI_API_KEY não configurada.' });
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: FARM_EXPLANATION_SYSTEM_PROMPT }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(parsed.data.context) }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema, maxOutputTokens: 1400 } }),
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
    if (!text) throw new Error('Gemini retornou resposta vazia.');
    const explanation = farmExplanationSchema.parse(JSON.parse(text));
    return NextResponse.json({ ...explanation, origin: 'gemini', model: MODEL });
  } catch (error) {
    console.error('Farm explanation unavailable:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ ...fallback, origin: 'fallback', warning: 'A explicação automática está temporariamente indisponível.' });
  }
}
