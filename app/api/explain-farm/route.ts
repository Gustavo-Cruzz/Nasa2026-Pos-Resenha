import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { farmExplanationSystemPrompt, fallbackFarmExplanation, farmExplanationContextSchema, farmExplanationSchema } from '@/lib/gemini/farm-explanation';

const MODEL = 'gemini-3.5-flash-lite';
const requestSchema = z.object({ context: farmExplanationContextSchema, locale: z.enum(['en', 'pt-BR']).default('en') });
const descriptions = {
  en: { summary: 'One or two short sentences, in everyday language, explaining what the person is looking at.', points: 'Up to two useful facts that appear literally in the data.', limitation: 'One simple sentence saying what this data does not allow us to conclude.' },
  'pt-BR': { summary: 'Uma ou duas frases curtas, em linguagem cotidiana, explicando o que a pessoa está vendo.', points: 'Até dois fatos úteis que aparecem literalmente nos dados.', limitation: 'Uma frase simples dizendo o que estes dados não permitem concluir.' },
} as const;
const responseJsonSchema = (locale: 'en' | 'pt-BR') => ({
  type: 'object', additionalProperties: false, required: ['sections'], properties: { sections: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['id', 'summary', 'points', 'limitation'], properties: { id: { type: 'string', enum: ['overview', 'climate', 'water', 'soil', 'rotation', 'terrain'] }, summary: { type: 'string', description: descriptions[locale].summary }, points: { type: 'array', maxItems: 2, items: { type: 'string' }, description: descriptions[locale].points }, limitation: { type: 'string', description: descriptions[locale].limitation } } } } },
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: 'INVALID_EXPLANATION_INPUT', message: 'Invalid result data.' }, { status: 422 });
  const { locale } = parsed.data;
  const en = locale === 'en';
  const fallback = fallbackFarmExplanation(parsed.data.context, locale);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ ...fallback, origin: 'fallback', warning: en ? 'GEMINI_API_KEY is not configured.' : 'GEMINI_API_KEY não configurada.' });
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: farmExplanationSystemPrompt(locale) }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(parsed.data.context) }] }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: responseJsonSchema(locale), maxOutputTokens: 1400 } }),
    });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
    if (!text) throw new Error('Gemini returned an empty response.');
    const explanation = farmExplanationSchema.parse(JSON.parse(text));
    return NextResponse.json({ ...explanation, origin: 'gemini', model: MODEL });
  } catch (error) {
    console.error('Farm explanation unavailable:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ ...fallback, origin: 'fallback', warning: en ? 'The automatic explanation is temporarily unavailable.' : 'A explicação automática está temporariamente indisponível.' });
  }
}
