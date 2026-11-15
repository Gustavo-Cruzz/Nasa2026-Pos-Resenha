import { z } from 'zod';
import type { AnalysisResult } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';

export const explanationSectionIds = ['overview', 'climate', 'water', 'soil', 'rotation', 'terrain'] as const;
export type ExplanationSectionId = (typeof explanationSectionIds)[number];

const nullableNumber = z.number().finite().nullable();
export const farmExplanationContextSchema = z.object({
  location: z.object({ municipality: z.string().max(100).nullable(), uf: z.string().max(2).nullable(), latitude: z.number(), longitude: z.number() }),
  plantingMonth: z.number().int().min(1).max(12),
  history: z.array(z.object({ crop: z.string().max(100), period: z.string().max(30) })).max(3),
  climate: z.object({ status: z.enum(['available', 'unavailable']), period: z.string().max(30).nullable(), monthly: z.array(z.object({ month: z.number().int(), rainMm: nullableNumber, temperatureC: nullableNumber })).length(12), rainySeasonMonths: z.array(z.number().int()).max(12), waterBalanceMm: z.array(nullableNumber).length(12) }),
  soil: z.object({ status: z.enum(['available', 'partial', 'unavailable']), ph: nullableNumber, organicCarbonGKg: nullableNumber, sandPct: nullableNumber, siltPct: nullableNumber, clayPct: nullableNumber, farmerObservations: z.array(z.string().max(40)).max(7) }),
  terrain: z.object({ status: z.enum(['available', 'unavailable']), meanSlopePct: nullableNumber, maxSlopePct: nullableNumber, steepSlopeSharePct: nullableNumber }),
  strategies: z.array(z.object({ id: z.enum(['A', 'B', 'C']), title: z.string().max(160), crop: z.string().max(100).nullable(), baseline: z.boolean(), baselineAssumed: z.boolean(), indicators: z.array(z.object({ label: z.string().max(120), state: z.string().max(30), detail: z.string().max(500) })).max(12), missingData: z.array(z.string().max(100)).max(20) })).length(3),
  warnings: z.array(z.string().max(500)).max(30),
});
export type FarmExplanationContext = z.infer<typeof farmExplanationContextSchema>;

const misleadingLanguage = /d[eé]ficit h[ií]drico|foco de calor|precisa irrigar|deve irrigar|recomenda-se|water deficit|water shortage|hot ?spot|needs? (?:to )?irrigat|must irrigate|should irrigate|irrigation is needed|(?:is|are) recommended/iu;

export const farmExplanationSchema = z.object({
  sections: z.array(z.object({
    id: z.enum(explanationSectionIds),
    summary: z.string().trim().min(1).max(360),
    points: z.array(z.string().trim().min(1).max(180)).max(2),
    limitation: z.string().trim().min(1).max(220),
  })).length(explanationSectionIds.length).superRefine((sections, ctx) => {
    const ids = new Set(sections.map((item) => item.id));
    explanationSectionIds.forEach((id) => { if (!ids.has(id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Missing section ${id}` }); });
  }),
}).superRefine((result, ctx) => {
  result.sections.forEach((section, index) => {
    const text = [section.summary, ...section.points, section.limitation].join(' ');
    if (misleadingLanguage.test(text)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', index], message: 'Explicação contém linguagem absoluta ou que confunde indicador climático com condição do talhão.' });
    if (section.id === 'water' && !/(?:ET0|ET₀|evapotranspira[cç][aã]o de refer[eê]ncia)/iu.test(text)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', index], message: 'A seção de água precisa explicar ET0.' });
    if (section.id === 'water' && /\bsaldo\b|\bnet water balance\b/iu.test(text)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', index], message: 'A seção de água deve comparar chuva e ET0 diretamente, sem usar saldo.' });
    if (section.id === 'overview' && /(?:cultura|cultivo) planejad[oa]|planned crop|future plan/iu.test(text)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', index], message: 'O histórico não pode ser apresentado como plano futuro.' });
  });
});
export type FarmExplanation = z.infer<typeof farmExplanationSchema>;

const cropLabel = (cropId?: string, otherLabel?: string) => otherLabel ?? cropId ?? 'N/D';
const monthValue = (items: Array<{ month: number; medianTotalMm: number | null }>, month: number) => items.find((item) => item.month === month)?.medianTotalMm ?? null;

export function buildFarmExplanationContext(data: AnalysisResult): FarmExplanationContext {
  const staticSoil = data.soilContext?.staticProfile.status === 'available' ? data.soilContext.staticProfile.attributes : null;
  const period = data.climate.provenance?.period;
  const context: FarmExplanationContext = {
    location: { municipality: data.regionalContext.municipality?.name ?? null, uf: data.regionalContext.municipality?.uf ?? null, ...data.input.location },
    plantingMonth: data.input.plantingMonth,
    history: data.input.history.map((item) => ({ crop: cropLabel(item.cropId, item.otherLabel), period: `${item.startYearMonth}–${item.endYearMonth}` })),
    climate: {
      status: data.climate.status,
      period: period ? `${period.start}–${period.end}` : null,
      monthly: Array.from({ length: 12 }, (_, index) => { const month = index + 1; return { month, rainMm: monthValue(data.climate.historicalPrecipitationByMonth, month), temperatureC: data.climate.monthly.find((item) => item.month === month)?.tmeanMedianC ?? null }; }),
      rainySeasonMonths: data.climate.seasonality?.rainySeason?.months ?? [],
      waterBalanceMm: Array.from({ length: 12 }, (_, index) => data.climate.waterBalanceByMonth?.find((item) => item.month === index + 1)?.balanceMedianMm ?? null),
    },
    soil: {
      status: data.soilContext?.status ?? 'unavailable',
      ph: data.input.soil?.ph ?? staticSoil?.phh2o.value ?? null,
      organicCarbonGKg: data.input.soil?.organicCarbonGKg ?? staticSoil?.soc.value ?? null,
      sandPct: data.input.soil?.sandPct ?? staticSoil?.sand.value ?? null,
      siltPct: data.input.soil?.siltPct ?? staticSoil?.silt.value ?? null,
      clayPct: data.input.soil?.clayPct ?? staticSoil?.clay.value ?? null,
      farmerObservations: data.input.soilObservation?.kinds ?? [],
    },
    terrain: { status: data.terrain?.status ?? 'unavailable', meanSlopePct: data.terrain?.slopePct?.mean ?? null, maxSlopePct: data.terrain?.slopePct?.max ?? null, steepSlopeSharePct: data.terrain?.status === 'available' ? data.terrain.hotspots.sharePct : null },
    strategies: data.strategies.map((item) => ({ id: item.id, title: item.title, crop: item.proposedCrop?.name ?? item.proposedCrop?.cropId ?? null, baseline: item.baseline, baselineAssumed: item.baselineAssumed, indicators: item.indicators.map(({ label, state, detail }) => ({ label, state, detail })), missingData: item.missingData })),
    warnings: data.warnings,
  };
  return farmExplanationContextSchema.parse(context);
}

export const FARM_EXPLANATION_SYSTEM_PROMPT = `Você é João, um guia que explica resultados de uma fazenda para quem não tem costume de ler gráficos. Clareza vem primeiro.

Use somente o JSON recebido. Fale em português brasileiro, com palavras comuns, frases curtas e tom acolhedor. A lista history mostra cultivos passados; nunca a chame de cultura planejada ou plano futuro. Converta números de mês em nomes: 1 é janeiro e 12 é dezembro; nunca escreva "mês 10". Quando usar ET0, explique na mesma frase: "evapotranspiração de referência (ET0), uma estimativa da água que o clima pode retirar do solo e da vegetação". Diga diretamente "a chuva histórica ficou abaixo/acima da ET0"; não use a palavra saldo e nunca chame isso de déficit hídrico, falta de água na lavoura ou necessidade de irrigação.

Chuva, temperatura e ET0 são histórico de uma grade regional, não medição da fazenda e não previsão. Solo regional é estimativa, não análise do talhão. Cenários A/B/C são opções para comparar; o título de um cenário não prova que a cultura melhora solo, água ou produtividade. Em terrain, steepSlopeSharePct significa porcentagem das amostras com inclinação de 8% ou mais. Se um valor for null, diga apenas que esse dado não está disponível. Se vários valores da seção forem null, diga isso uma vez só, sem repetir pontos iguais. Não deduza consequência do dado ausente.

Não invente medidas, causas, diagnóstico, recomendação, previsão, produtividade, irrigação, benefício ou risco. Evite palavras absolutas como "garante", "impede", "melhor" e "deve". Cada resumo deve ter no máximo 2 frases curtas; cada seção pode ter no máximo 2 pontos; sempre inclua uma limitação concreta. Não repita o título.`;

export const FARM_EXPLANATION_SYSTEM_PROMPT_EN = `You are João, a guide who explains farm results to people who are not used to reading charts. Clarity comes first.

Use only the JSON you receive. Write in plain English with everyday words, short sentences and a warm tone. The history list shows past crops; never call it a planned crop or a future plan. Turn month numbers into names: 1 is January and 12 is December; never write "month 10". When you use ET0, explain it in the same sentence: "reference evapotranspiration (ET0), an estimate of the water the climate can pull from soil and vegetation". Say it directly: "historical rain was below/above ET0"; never call this a water deficit, a lack of water in the field or a need for irrigation.

Rain, temperature and ET0 are history from a regional grid, not a measurement on the farm and not a forecast. Regional soil is an estimate, not a soil test of the field. Scenarios A/B/C are options to compare; a scenario title does not prove that the crop improves soil, water or yield. In terrain, steepSlopeSharePct is the percentage of samples with a slope of 8% or more. If a value is null, say only that the data is not available. If several values in a section are null, say so once, without repeating the same points. Do not infer any consequence from missing data.

Do not invent measurements, causes, diagnosis, recommendation, forecast, yield, irrigation, benefit or risk. Avoid absolute words such as "guarantees", "prevents", "best" and "must". Each summary has at most 2 short sentences; each section has at most 2 points; always include a concrete limitation. Do not repeat the title.`;

export const farmExplanationSystemPrompt = (locale: Locale = 'en') => locale === 'en' ? FARM_EXPLANATION_SYSTEM_PROMPT_EN : FARM_EXPLANATION_SYSTEM_PROMPT;

const monthNamesByLocale = { 'pt-BR': ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] } as const;

export function fallbackFarmExplanation(context: FarmExplanationContext, locale: Locale = 'en'): FarmExplanation {
  const en = locale === 'en';
  const monthNames = monthNamesByLocale[locale];
  const nd = 'N/D';
  const place = context.location.municipality ? `${context.location.municipality}${context.location.uf ? ` (${context.location.uf})` : ''}` : en ? 'the point you entered' : 'ponto informado';
  const availableMonths = context.climate.monthly.filter((item) => item.rainMm !== null || item.temperatureC !== null).length;
  const knownBalance = context.climate.waterBalanceMm.filter((value) => value !== null);
  const negative = knownBalance.filter((value) => value !== null && value < 0).length;
  const crops = context.strategies.map((item) => `${item.id}: ${item.crop ?? (en ? 'no crop defined' : 'sem cultura definida')}`).join('; ');
  const soilKnown = [context.soil.ph, context.soil.organicCarbonGKg, context.soil.sandPct].some((value) => value !== null);
  const assumed = context.strategies.some((item) => item.baselineAssumed);
  return farmExplanationSchema.parse({ sections: en ? [
    { id: 'overview', summary: `The analysis uses the history you entered and compares three scenarios for ${place}.`, points: [`Scenarios: ${crops}.`], limitation: 'They are hypotheses to compare, not a planting recommendation.' },
    { id: 'climate', summary: context.climate.status === 'available' ? `There is historical data for ${availableMonths} months of the year; bars show rain and the line shows temperature.` : 'Historical climate was not available for this analysis.', points: context.climate.rainySeasonMonths.length ? [`Rainy season found: ${context.climate.rainySeasonMonths.map((month) => monthNames[month - 1]).join(', ')}.`] : [], limitation: 'Climate history shows what happened on the regional grid; it does not predict the next season.' },
    { id: 'water', summary: knownBalance.length ? `In ${negative} of ${knownBalance.length} calculated months, historical rain was below reference evapotranspiration (ET₀), an estimate of the water the climate can pull from soil and plants.` : 'There is not enough data to show the monthly rain minus reference evapotranspiration (ET₀) balance.', points: [], limitation: 'This is a climate indicator; it does not calculate crop water use or irrigation need.' },
    { id: 'soil', summary: soilKnown ? 'The panel gathers regional values or data you entered; check the origin in the details.' : 'There are not enough values to summarize the soil.', points: context.soil.farmerObservations.length ? [`Producer observations: ${context.soil.farmerObservations.join(', ')}.`] : [], limitation: 'A regional estimate and a report do not replace a soil test of the field.' },
    { id: 'rotation', summary: 'Scenarios A, B and C use the same climate base and highlight different crops or priorities.', points: assumed ? ['The continuation was assumed and needs to be confirmed.'] : [], limitation: 'The comparison does not estimate yield, profit or chance of success.' },
    { id: 'terrain', summary: context.terrain.status === 'available' ? `The sampled mean slope is ${context.terrain.meanSlopePct ?? nd}% and the maximum is ${context.terrain.maxSlopePct ?? nd}%.` : 'Terrain was not available for this analysis.', points: [], limitation: 'Terrain sampling does not measure real soil loss and does not replace a visit to the field.' },
  ] : [
    { id: 'overview', summary: `A análise usa o histórico informado e compara três cenários para ${place}.`, points: [`Cenários: ${crops}.`], limitation: 'São hipóteses para comparação, não uma recomendação de plantio.' },
    { id: 'climate', summary: context.climate.status === 'available' ? `Há dados históricos em ${availableMonths} meses do ano; barras mostram chuva e a linha mostra temperatura.` : 'O clima histórico não ficou disponível para esta análise.', points: context.climate.rainySeasonMonths.length ? [`Estação chuvosa identificada: ${context.climate.rainySeasonMonths.map((month) => monthNames[month - 1]).join(', ')}.`] : [], limitation: 'Histórico climático mostra o que ocorreu na grade regional; não prevê a próxima safra.' },
    { id: 'water', summary: knownBalance.length ? `Em ${negative} de ${knownBalance.length} meses calculados, a chuva histórica ficou abaixo da ET₀.` : 'Não há dados suficientes para mostrar o balanço mensal de chuva menos ET₀.', points: [], limitation: 'Esse balanço é indicador climático; não calcula consumo da cultura nem necessidade de irrigação.' },
    { id: 'soil', summary: soilKnown ? 'O quadro reúne valores regionais ou dados informados pelo produtor; a origem deve ser conferida nos detalhes.' : 'Não há valores suficientes para resumir o solo.', points: context.soil.farmerObservations.length ? [`Observações do produtor: ${context.soil.farmerObservations.join(', ')}.`] : [], limitation: 'Estimativa regional e relato não substituem análise de solo do talhão.' },
    { id: 'rotation', summary: 'Os cenários A, B e C usam a mesma base de clima e destacam culturas ou prioridades diferentes.', points: assumed ? ['A continuação foi presumida e precisa ser confirmada.'] : [], limitation: 'A comparação não estima rendimento, lucro ou chance de sucesso.' },
    { id: 'terrain', summary: context.terrain.status === 'available' ? `A inclinação média amostrada é ${context.terrain.meanSlopePct ?? nd}% e a máxima é ${context.terrain.maxSlopePct ?? nd}%.` : 'O relevo não ficou disponível para esta análise.', points: [], limitation: 'A amostragem de relevo não mede perda real de solo nem substitui vistoria local.' },
  ] });
}
