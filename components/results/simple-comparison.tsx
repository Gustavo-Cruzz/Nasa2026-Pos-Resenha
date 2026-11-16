'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RotationSummaryCard } from '@/components/results/rotation-summary-card';
import { ScenarioStories } from '@/components/future-stories/scenario-stories';
import { useLocale } from '@/components/locale-provider';
import { buildFarmScenarioViews } from '@/lib/future-farm/adapter';
import type { AnalysisResult } from '@/lib/engine/types';
import type { LabPlan } from '@/lib/lab';
import type { CroppingSystem } from '@/lib/intercrops';

type Props = { data: AnalysisResult; plan?: LabPlan; croppingSystems?: CroppingSystem[]; onAdvanced: () => void };

/** A farmer-facing reading of the existing result. It does not evaluate or rank strategies. */
export function SimpleComparison({ data, plan, croppingSystems, onAdvanced }: Props) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const scenarios = buildFarmScenarioViews({ analysis: data, currentPlan: plan, croppingSystems }, locale);
  return <section className="mt-6" aria-labelledby="simple-comparison-heading">
    <header className="max-w-3xl"><p className="text-sm font-semibold text-lime-200">{en ? 'Simple comparison' : 'Comparação simples'}</p><h2 className="mt-1 text-3xl font-bold" id="simple-comparison-heading">{en ? 'Explore your possibilities' : 'Explore suas possibilidades'}</h2><p className="mt-2 text-slate-300">{en ? 'Compare three planting strategies, follow the four stages of each farm and discover what the data shows about your choices.' : 'Compare três estratégias de plantio, acompanhe as quatro etapas de cada fazenda e descubra o que os dados revelam sobre suas escolhas.'}</p></header>
    <ScenarioStories demo={false} locale={locale} scenarios={scenarios} simple />
    <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{en ? 'Compare before deciding' : 'Compare antes de decidir'}</h2><p className="mt-2 text-sm text-slate-300">{en ? 'A keeps your declared plan; B and C are exploratory alternatives. Differences shown above come from the same available indicators and may remain unknown.' : 'A preserva seu plano declarado; B e C são alternativas exploratórias. As diferenças acima vêm dos mesmos indicadores disponíveis e podem continuar desconhecidas.'}</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" onClick={onAdvanced}>{en ? 'Explore full analysis' : 'Explorar análise completa'}</Button><Button asChild variant="secondary"><Link href="/lab">{en ? 'Edit my rotations' : 'Editar minhas rotações'}</Link></Button></div></section>
    <RotationSummaryCard data={data} onAdvanced={onAdvanced} />
  </section>;
}
