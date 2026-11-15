import { z } from 'zod';
import demoDocument from '@/data/future-farm-demo-scenarios.json';
import type { Locale } from '@/lib/i18n';
import { cropLabel } from '@/lib/future-farm/adapter';
import type { CycleClimate, CycleWeather, FarmScenarioView, MonthWeather } from '@/lib/future-farm/types';

const scenePath = z.string().regex(/^\/assets\/farm-stories\/scenes\/scenario-[abc]-cycle-[1-4]\.(png|gif)$/);
const demoSchema = z.object({
  demoOnly: z.literal(true),
  defaultForRealUsers: z.literal(false),
  fictionalFarm: z.literal(true),
  scenarios: z.array(z.object({ id: z.enum(['A', 'B', 'C']), name: z.string(), objective: z.string(), cycles: z.array(z.object({ cycle: z.number().int().min(1).max(4), cropId: z.string(), cropLabel: z.string(), png: scenePath, gif: scenePath, alt: z.string() })).min(1).max(4) })).length(3),
});

/** Supplied curated demo: fictional, never mixed with a real farm or the decision engine. */
export const futureFarmDemo = demoSchema.parse(demoDocument);

export interface DemoScene { png: string; gif: string; webp: string; cropId: string }

/** Curated scenes keyed by `A-0`… Only the demo route reads this map. */
export const demoScenes: ReadonlyMap<string, DemoScene> = new Map(futureFarmDemo.scenarios.flatMap((scenario) => scenario.cycles.map((cycle) => [`${scenario.id}-${cycle.cycle - 1}`, { png: cycle.png, gif: cycle.gif, webp: cycle.gif.replace(/\.gif$/, '.webp'), cropId: cycle.cropId }] as const)));

const enScenario: Record<'A' | 'B' | 'C', string> = { A: 'Continuity (fictional demo)', B: 'Soil health (fictional demo)', C: 'Water resilience (fictional demo)' };

/**
 * Fictional, illustrative monthly weather so every effect can be previewed in demo mode.
 * Values are invented presets per weather state, not NASA data and not tied to any location.
 */
const demoPreset: Record<Exclude<CycleWeather, 'neutral' | 'unknown'>, Omit<MonthWeather, 'month' | 'weather'>> = {
  storm: { balanceMm: 160, precipMm: 330, rainDays: 22, tmaxC: 29, tminC: 20, solarMjM2Day: 14, frostShare: 0 },
  rain: { balanceMm: 70, precipMm: 220, rainDays: 15, tmaxC: 30, tminC: 19, solarMjM2Day: 17, frostShare: 0 },
  cloudy: { balanceMm: 5, precipMm: 120, rainDays: 14, tmaxC: 27, tminC: 17, solarMjM2Day: 13, frostShare: 0 },
  sunny: { balanceMm: 0, precipMm: 90, rainDays: 6, tmaxC: 29, tminC: 16, solarMjM2Day: 21, frostShare: 0 },
  drought: { balanceMm: -85, precipMm: 8, rainDays: 1, tmaxC: 32, tminC: 14, solarMjM2Day: 22, frostShare: 0 },
  frost: { balanceMm: -30, precipMm: 25, rainDays: 3, tmaxC: 20, tminC: 1, solarMjM2Day: 15, frostShare: 0.4 },
  heat: { balanceMm: -60, precipMm: 30, rainDays: 3, tmaxC: 38, tminC: 23, solarMjM2Day: 24, frostShare: 0 },
};
type DemoState = keyof typeof demoPreset;
/** Four fictional months per cycle, rotating through all seven states across each scenario. */
const demoSequences: Record<'A' | 'B' | 'C', Array<{ start: number; states: DemoState[] }>> = {
  A: [{ start: 11, states: ['sunny', 'cloudy', 'rain', 'storm'] }, { start: 3, states: ['rain', 'cloudy', 'sunny', 'drought'] }, { start: 6, states: ['frost', 'frost', 'sunny', 'drought'] }, { start: 9, states: ['drought', 'heat', 'cloudy', 'storm'] }],
  B: [{ start: 10, states: ['heat', 'sunny', 'storm', 'rain'] }, { start: 2, states: ['cloudy', 'rain', 'storm', 'cloudy'] }, { start: 5, states: ['sunny', 'frost', 'frost', 'drought'] }, { start: 8, states: ['heat', 'drought', 'rain', 'sunny'] }],
  C: [{ start: 12, states: ['storm', 'rain', 'cloudy', 'sunny'] }, { start: 4, states: ['sunny', 'heat', 'drought', 'cloudy'] }, { start: 7, states: ['frost', 'sunny', 'drought', 'heat'] }, { start: 1, states: ['rain', 'storm', 'cloudy', 'sunny'] }],
};

function demoClimate(scenario: 'A' | 'B' | 'C', index: number, en: boolean): CycleClimate | null {
  const seq = demoSequences[scenario][index];
  if (!seq) return null;
  const months: MonthWeather[] = seq.states.map((weather, offset) => ({ month: ((seq.start - 1 + offset) % 12) + 1, weather, ...demoPreset[weather] }));
  const counts = new Map<DemoState, number>();
  seq.states.forEach((state) => counts.set(state, (counts.get(state) ?? 0) + 1));
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const note = en ? 'Fictional demo weather: invented to preview the scene effects; not NASA data and not a forecast.' : 'Clima fictício de demonstração: inventado para visualizar os efeitos da cena; não são dados da NASA nem previsão.';
  return { waterBalanceMm: null, weather: dominant, months, frost: 'unknown', waterDetail: note, frostDetail: null };
}

/** Builds story views for the curated demo. No evidence is fabricated: lists stay empty and say so. */
export function buildDemoScenarioViews(locale: Locale): FarmScenarioView[] {
  const en = locale === 'en';
  return futureFarmDemo.scenarios.map((scenario) => ({
    id: scenario.id,
    title: en ? enScenario[scenario.id] : `${scenario.name} (demonstração fictícia)`,
    scenarioNotes: [en ? 'Fictional farm for demonstration. These sequences were chosen for graphic variety and are not a validated rotation for any location.' : 'Fazenda fictícia de demonstração. As sequências foram escolhidas por variedade gráfica e não são rotação validada para nenhuma localidade.'],
    scenarioMissingData: [en ? 'real farm data (demo mode does not read your farm)' : 'dados reais da fazenda (o modo demonstração não lê sua propriedade)'],
    demoOnly: true,
    tradeoffs: { gains: [], losses: [], unknowns: [] },
    bareSoilNote: null,
    cycles: scenario.cycles.map((cycle) => ({
      id: `demo-${scenario.id}-${cycle.cycle - 1}`,
      index: cycle.cycle - 1,
      period: null,
      crops: [{ cropId: cycle.cropId, ...cropLabel(cycle.cropId, locale), role: 'primary' as const }],
      functions: [],
      sequenceNote: null,
      potentialBenefits: [],
      risksAndUnknowns: [en ? 'Demonstration only: no indicator, risk or evidence was computed for this fictional stage.' : 'Somente demonstração: nenhum indicador, risco ou evidência foi calculado para esta etapa fictícia.'],
      missingData: [],
      evidenceLevel: null,
      evidenceLinks: [],
      intercropNotes: [],
      evidenceStale: false,
      sceneMode: 'illustrative' as const,
      climate: demoClimate(scenario.id, cycle.cycle - 1, en),
      measuredFieldCondition: null,
    })),
  }));
}
