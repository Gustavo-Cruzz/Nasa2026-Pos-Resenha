'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CropSprite } from '@/components/crops/crop-sprite';
import { ScenarioStories } from '@/components/future-stories/scenario-stories';
import { useLocale } from '@/components/locale-provider';
import { buildFarmScenarioViews } from '@/lib/future-farm/adapter';
import type { AnalysisResult } from '@/lib/engine/types';
import type { LabPlan } from '@/lib/lab';

type Props = { data: AnalysisResult; plan?: LabPlan; onAdvanced: () => void };
const label = (id: 'A' | 'B' | 'C', en: boolean) => id === 'A' ? (en ? 'A — My plan' : 'A — Meu plano') : id === 'B' ? (en ? 'B — Soil focus' : 'B — Foco no solo') : (en ? 'C — Water focus' : 'C — Foco na água');

/** A farmer-facing reading of the existing result. It does not evaluate or rank strategies. */
export function SimpleComparison({ data, plan, onAdvanced }: Props) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const scenarios = buildFarmScenarioViews({ analysis: data, currentPlan: plan, croppingSystems: data.input.croppingSystems }, locale);
  return <section className="mt-6" aria-labelledby="simple-comparison-heading">
    <header className="max-w-3xl"><p className="text-sm font-semibold text-lime-200">{en ? 'Simple comparison' : 'Comparação simples'}</p><h2 className="mt-1 text-3xl font-bold" id="simple-comparison-heading">{en ? 'Explore your possibilities' : 'Explore suas possibilidades'}</h2><p className="mt-2 text-slate-300">{en ? 'Compare three planting strategies, follow the four stages of each farm and discover what the data shows about your choices.' : 'Compare três estratégias de plantio, acompanhe as quatro etapas de cada fazenda e descubra o que os dados revelam sobre suas escolhas.'}</p></header>
    <ul className="mt-6 grid gap-3 lg:grid-cols-3">{scenarios.map((scenario) => {
      const strategy = data.strategies.find((item) => item.id === scenario.id);
      const crops = scenario.cycles.flatMap((cycle) => cycle.crops).filter((crop, index, items) => items.findIndex((item) => item.cropId === crop.cropId) === index);
      const benefit = scenario.tradeoffs.gains[0] ?? scenario.cycles.flatMap((cycle) => cycle.potentialBenefits)[0];
      const attention = scenario.tradeoffs.losses[0] ?? scenario.cycles.flatMap((cycle) => cycle.risksAndUnknowns)[0];
      const unknown = scenario.tradeoffs.unknowns[0] ?? scenario.scenarioMissingData[0];
      const planNote = scenario.id === 'A' && strategy?.baselineAssumed ? (en ? 'Continuation hypothesis — confirm it.' : 'Hipótese de continuidade — confirme-a.') : strategy?.explanations[0]?.message;
      return <li className="rounded-xl border border-slate-700 bg-slate-900/70 p-4" key={scenario.id}><h3 className="font-bold text-lime-100">{label(scenario.id, en)}</h3><div className="mt-3 flex min-h-14 items-center gap-2">{crops.length ? crops.map((crop) => <span className="inline-flex items-center gap-1 text-sm" key={crop.cropId}><CropSprite cropId={crop.cropId} name={crop.label} size={38} /><span className="max-w-28 truncate">{crop.label}</span></span>) : <span className="text-sm text-slate-300">{en ? 'No crop configured yet.' : 'Nenhuma cultura configurada ainda.'}</span>}</div><p className="mt-3 text-sm text-slate-200">{planNote ?? (en ? 'The configured stages are shown below.' : 'As etapas configuradas aparecem abaixo.')}</p><dl className="mt-4 grid gap-3 text-sm"><div><dt className="font-semibold text-lime-200">{en ? 'Potential documented point' : 'Ponto potencial documentado'}</dt><dd className="mt-1 text-slate-300">{benefit ?? (en ? 'No documented point is available.' : 'Não há ponto documentado disponível.')}</dd></div><div><dt className="font-semibold text-amber-200">{en ? 'Attention' : 'Atenção'}</dt><dd className="mt-1 text-slate-300">{attention ?? (en ? 'No specific attention point was computed.' : 'Nenhum ponto específico de atenção foi calculado.')}</dd></div><div><dt className="font-semibold text-slate-200">{en ? 'Still unknown' : 'Ainda precisamos confirmar'}</dt><dd className="mt-1 text-slate-300">{unknown ?? (en ? 'No cataloged gap for this scenario.' : 'Nenhuma lacuna catalogada para este cenário.')}</dd></div></dl></li>;
    })}</ul>
    <ScenarioStories demo={false} locale={locale} scenarios={scenarios} simple />
    <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{en ? 'Compare before deciding' : 'Compare antes de decidir'}</h2><p className="mt-2 text-sm text-slate-300">{en ? 'A keeps your declared plan; B and C are exploratory alternatives. Differences shown above come from the same available indicators and may remain unknown.' : 'A preserva seu plano declarado; B e C são alternativas exploratórias. As diferenças acima vêm dos mesmos indicadores disponíveis e podem continuar desconhecidas.'}</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" onClick={onAdvanced}>{en ? 'Explore full analysis' : 'Explorar análise completa'}</Button><Button asChild variant="secondary"><Link href="/lab">{en ? 'Edit my rotations' : 'Editar minhas rotações'}</Link></Button></div></section>
  </section>;
}
