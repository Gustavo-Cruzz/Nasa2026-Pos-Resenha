import { z } from 'zod';
import demoDocument from '@/data/future-farm-demo-scenarios.json';
import type { Locale } from '@/lib/i18n';
import { cropLabel } from '@/lib/future-farm/adapter';
import type { FarmScenarioView } from '@/lib/future-farm/types';

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
      climate: null,
      measuredFieldCondition: null,
    })),
  }));
}
