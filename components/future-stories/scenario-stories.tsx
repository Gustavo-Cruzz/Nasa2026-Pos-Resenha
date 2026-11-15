'use client';

import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FarmScene, usePrefersReducedMotion } from '@/components/future-stories/farm-scene';
import { futureFarmCopy } from '@/lib/future-farm/copy';
import { demoScenes } from '@/lib/future-farm/demo';
import { FARM_SCENE_DISCLAIMER, type FarmCycleView, type FarmScenarioView, type ScenarioId } from '@/lib/future-farm/types';
import type { Locale } from '@/lib/i18n';

interface ScenarioStoriesProps { scenarios: FarmScenarioView[]; locale: Locale; demo: boolean; initialScenario?: ScenarioId }

/** Moves focus with arrow/Home/End keys among sibling buttons (roving focus). */
function useArrowKeys(count: number, current: number, select: (index: number) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent) => {
    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? Math.min(count - 1, current + 1) : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? Math.max(0, current - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
    if (next === null) return;
    event.preventDefault(); select(next); refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

export function ScenarioStories({ scenarios, locale, demo, initialScenario }: ScenarioStoriesProps) {
  const en = locale === 'en';
  const [scenarioId, setScenarioId] = useState<ScenarioId>(initialScenario && scenarios.some((item) => item.id === initialScenario) ? initialScenario : scenarios[0]?.id ?? 'A');
  const [cycleByScenario, setCycleByScenario] = useState<Record<string, number>>({});
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const cyclePosition = Math.min(cycleByScenario[scenario?.id ?? 'A'] ?? 0, Math.max(0, (scenario?.cycles.length ?? 1) - 1));
  const cycle = scenario?.cycles[cyclePosition];
  const setCycle = (position: number) => setCycleByScenario((current) => ({ ...current, [scenario.id]: position }));
  if (!scenario) return null;
  return <div className="mt-6">
    <ScenarioSelector en={en} scenarios={scenarios} selected={scenario.id} onSelect={setScenarioId} />
    <section aria-labelledby="ffs-scenario-heading" className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5" id={`ffs-panel-${scenario.id}`} role="tabpanel">
      <h2 className="text-xl font-bold" id="ffs-scenario-heading">{en ? 'Scenario' : 'Cenário'} {scenario.id}. {scenario.title}</h2>
      {cycle ? <>
        <p aria-live="polite" className="sr-only">{cycleName(cycle, en)}: {cycle.crops.map((crop) => crop.label).join(' + ')}</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <div className="lg:sticky lg:top-4 lg:col-span-2 lg:self-start">
            <FarmScene cycle={cycle} demoScene={demo ? demoScenes.get(`${scenario.id}-${cycle.index}`) : undefined} en={en} paused={paused} reducedMotion={reducedMotion} scenarioId={scenario.id} />
            <p className="mt-3 rounded-lg border border-amber-300/60 bg-amber-950/40 p-3 text-sm text-amber-50" data-testid="farm-scene-disclaimer">{FARM_SCENE_DISCLAIMER[locale]}</p>
            <CycleStepper cycles={scenario.cycles} en={en} position={cyclePosition} scenarioId={scenario.id} onSelect={setCycle} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button aria-pressed={paused || reducedMotion} className="gap-2" disabled={reducedMotion} type="button" variant="secondary" onClick={() => setPaused((value) => !value)}>{paused || reducedMotion ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}{paused || reducedMotion ? (en ? 'Play animation' : 'Retomar animação') : (en ? 'Pause animation' : 'Pausar animação')}</Button>
              {reducedMotion ? <span className="text-sm text-slate-300">{en ? 'Reduced motion is on: static scene.' : 'Movimento reduzido ativo: cena estática.'}</span> : null}
            </div>
          </div>
          <CycleEvidencePanel cycle={cycle} en={en} locale={locale} scenario={scenario} />
        </div>
      </> : <p className="mt-4 rounded-lg border border-slate-700 p-4 text-slate-200" role="status">{en ? 'This scenario has no crop defined in any stage yet. No scene is drawn and no crop is invented to fill it.' : 'Este cenário ainda não tem cultura definida em nenhuma etapa. Nenhuma cena é desenhada e nenhuma cultura é inventada para preenchê-la.'}</p>}
      <ScenarioComparisonActions demo={demo} en={en} />
    </section>
  </div>;
}

export function ScenarioSelector({ scenarios, selected, onSelect, en }: { scenarios: FarmScenarioView[]; selected: ScenarioId; onSelect: (id: ScenarioId) => void; en: boolean }) {
  const current = Math.max(0, scenarios.findIndex((item) => item.id === selected));
  const { refs, onKeyDown } = useArrowKeys(scenarios.length, current, (index) => onSelect(scenarios[index].id));
  return <div aria-label={en ? 'Choose a scenario' : 'Escolha um cenário'} className="grid grid-cols-3 gap-2" role="tablist" onKeyDown={onKeyDown}>
    {scenarios.map((scenario, index) => { const active = scenario.id === selected; return <button aria-controls={`ffs-panel-${scenario.id}`} aria-selected={active} className={`rounded-xl border p-2 text-left sm:p-3 ${active ? 'border-lime-300 bg-lime-300/15' : 'border-slate-600 bg-slate-900 hover:border-lime-300/60'}`} key={scenario.id} ref={(node) => { refs.current[index] = node; }} role="tab" tabIndex={active ? 0 : -1} type="button" onClick={() => onSelect(scenario.id)}>
      <span className="block text-sm font-semibold text-lime-200">{en ? 'Scenario' : 'Cenário'} {scenario.id}</span>
      <span className="block text-sm font-bold sm:text-base">{scenario.title}</span>
      <span className="block text-xs text-slate-300 max-sm:hidden">{scenario.cycles.length} {en ? (scenario.cycles.length === 1 ? 'stage with a crop' : 'stages with a crop') : (scenario.cycles.length === 1 ? 'etapa com cultura' : 'etapas com cultura')}</span>
    </button>; })}
  </div>;
}

function cycleName(cycle: FarmCycleView, en: boolean) {
  const period = cycle.period ? ` · ${en ? 'Year' : 'Ano'} ${cycle.period.year} ${cycle.period.season}` : '';
  return `${en ? 'Cycle' : 'Ciclo'} ${cycle.index + 1}${period}`;
}

export function CycleStepper({ cycles, position, onSelect, en, scenarioId }: { cycles: FarmCycleView[]; position: number; onSelect: (position: number) => void; en: boolean; scenarioId: ScenarioId }) {
  const { refs, onKeyDown } = useArrowKeys(cycles.length, position, onSelect);
  return <nav aria-label={en ? `Scenario ${scenarioId} cycles` : `Ciclos do cenário ${scenarioId}`} className="mt-4">
    <div className="flex items-stretch gap-2">
      <Button aria-label={en ? 'Previous cycle' : 'Ciclo anterior'} className="gap-1" disabled={position === 0} type="button" variant="secondary" onClick={() => onSelect(position - 1)}><ChevronLeft aria-hidden="true" size={18} /><span className="max-sm:sr-only">{en ? 'Previous' : 'Anterior'}</span></Button>
      <ol className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4" onKeyDown={onKeyDown}>
        {cycles.map((cycle, index) => <li key={cycle.id}><button aria-current={index === position ? 'step' : undefined} className={`h-full w-full rounded-lg border px-2 py-2 text-left text-sm ${index === position ? 'border-lime-300 bg-lime-300 font-bold text-slate-950' : 'border-slate-600 hover:border-lime-300/60'}`} ref={(node) => { refs.current[index] = node; }} type="button" onClick={() => onSelect(index)}>
          <span className="block">{cycleName(cycle, en)}</span>
          <span className="block text-xs">{cycle.crops.map((crop) => crop.label).join(' + ')}</span>
        </button></li>)}
      </ol>
      <Button aria-label={en ? 'Next cycle' : 'Próximo ciclo'} className="gap-1" disabled={position >= cycles.length - 1} type="button" variant="secondary" onClick={() => onSelect(position + 1)}><span className="max-sm:sr-only">{en ? 'Next' : 'Próximo'}</span><ChevronRight aria-hidden="true" size={18} /></Button>
    </div>
    {cycles.length < 4 ? <p className="mt-2 text-xs text-slate-300">{en ? 'Only stages with a crop chosen in the laboratory are shown; empty stages are not filled in.' : 'Só aparecem as etapas com cultura escolhida no laboratório; etapas vazias não são preenchidas.'}</p> : null}
  </nav>;
}

function List({ items, empty }: { items: string[]; empty: string }) {
  return items.length ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-200">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-1 text-sm text-slate-300">{empty}</p>;
}

export function CycleEvidencePanel({ scenario, cycle, en, locale }: { scenario: FarmScenarioView; cycle: FarmCycleView; en: boolean; locale: Locale }) {
  const copy = futureFarmCopy(locale);
  const noneComputed = en ? 'None computed; missing evidence stays unknown.' : 'Nenhum item calculado; evidência ausente permanece desconhecida.';
  return <aside aria-labelledby="ffs-cycle-heading" className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
    <p className="text-sm font-semibold text-lime-200">{cycleName(cycle, en)}</p>
    <h3 className="mt-1 text-lg font-bold" id="ffs-cycle-heading">{cycle.crops.map((crop) => crop.label).join(' + ')}</h3>
    {cycle.evidenceStale ? <p className="mt-3 rounded-lg border border-amber-300 bg-amber-950/50 p-3 text-sm" role="status">{copy.staleEvidence}</p> : null}
    {scenario.demoOnly ? <p className="mt-3 rounded-lg border border-cyan-300/60 bg-cyan-500/10 p-3 text-sm">{en ? 'Fictional demonstration: values and sequence are not about your farm.' : 'Demonstração fictícia: valores e sequência não se referem à sua fazenda.'}</p> : null}
    <div className="mt-4 space-y-4">
      {cycle.functions.length ? <section><h4 className="font-semibold">{en ? 'Documented role (catalog)' : 'Função documentada (catálogo)'}</h4><ul className="mt-1 space-y-1 text-sm text-slate-200">{cycle.functions.map((item) => { const label = cycle.crops.find((crop) => crop.cropId === item.cropId)?.label ?? item.cropId; return <li key={item.cropId}><b>{label}</b>: {item.purposes.length ? item.purposes.join(', ') : (en ? 'purpose not cataloged' : 'finalidade não catalogada')}{item.family ? ` · ${en ? 'family' : 'família'} ${item.family}` : ''}</li>; })}</ul></section> : null}
      {cycle.sequenceNote ? <section><h4 className="font-semibold">{en ? 'Why this sequence' : 'Justificativa da sequência'}</h4><p className="mt-1 text-sm text-slate-200">{cycle.sequenceNote}</p></section> : null}
      {cycle.intercropNotes.length ? <section><h4 className="font-semibold">{en ? 'Declared intercrop' : 'Consórcio declarado'}</h4><List empty="" items={cycle.intercropNotes} /></section> : null}
      <section><h4 className="font-semibold">{en ? 'Potential benefits' : 'Benefícios potenciais'}</h4><List empty={noneComputed} items={cycle.potentialBenefits} /></section>
      <section><h4 className="font-semibold">{en ? 'Risks and unknowns' : 'Riscos e incertezas'}</h4><List empty={noneComputed} items={cycle.risksAndUnknowns} /></section>
      <section><h4 className="font-semibold">{en ? 'Missing data' : 'Dados ausentes'}</h4><List empty={cycle.evidenceStale || scenario.demoOnly ? noneComputed : (en ? 'No cataloged gap for this stage.' : 'Nenhuma lacuna catalogada para esta etapa.')} items={[...cycle.missingData, ...scenario.scenarioMissingData.filter((item) => !cycle.missingData.includes(item))]} /></section>
      <section><h4 className="font-semibold">{en ? 'Scientific evidence' : 'Evidências científicas'}</h4><p className="mt-1 text-sm"><b>{en ? 'Evidence level' : 'Nível de evidência'}:</b> {cycle.evidenceLevel ? copy.evidenceLevel[cycle.evidenceLevel] : 'N/D'}</p>
        {cycle.evidenceLinks.length ? <ul className="mt-1 space-y-1 text-sm">{cycle.evidenceLinks.map((item) => <li key={item.url}><a className="break-all underline" href={item.url} rel="noreferrer" target="_blank">{item.title}</a></li>)}</ul> : <p className="mt-1 text-sm text-slate-300">{en ? 'No linked source.' : 'Nenhuma fonte vinculada.'}</p>}
      </section>
      {scenario.scenarioNotes.length ? <details><summary className="cursor-pointer font-semibold">{en ? 'Scenario notes from the comparison' : 'Notas do cenário na comparação'}</summary><List empty="" items={scenario.scenarioNotes} /></details> : null}
      <p className="text-xs text-slate-400">{en ? 'Indicators come from the comparison engine and are independent of the illustration.' : 'Os indicadores vêm do motor de comparação e independem da ilustração.'}</p>
    </div>
  </aside>;
}

export function ScenarioComparisonActions({ demo, en }: { demo: boolean; en: boolean }) {
  return <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-700 pt-4">
    {demo ? <Button asChild><Link href="/future-stories">{en ? 'Leave demonstration' : 'Sair da demonstração'}</Link></Button> : <>
      <Button asChild><Link href="/results#comparison-heading">{en ? 'Compare' : 'Comparar'}</Link></Button>
      <Button asChild variant="secondary"><Link href="/lab">{en ? 'Edit rotation' : 'Editar rotação'}</Link></Button>
    </>}
  </div>;
}
