'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { AnalysisResult } from '@/lib/engine/types';
import { demoScenarios, type DemoPlaceId } from '@/lib/demo-scenarios';
import { deriveDecisionHero } from '@/lib/engine/decision-hero';
import { saveDraft } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { BoundarySummary } from '@/components/boundary/boundary-summary';
import { DecisionHero } from '@/components/results/decision-hero';
import { SourceHealthList } from '@/components/evidence/source-health-list';
import { StatusCharacter } from '@/components/pixel/status-character';
import { useLocale } from '@/components/locale-provider';
import { cropDisplayName } from '@/lib/presentation';

const STEP_MS = 15_000;
const TICK_MS = 250;
type Load = { kind: 'ready'; data: AnalysisResult } | { kind: 'error' };

export function GuidedDemo() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter();
  const [place, setPlace] = useState<DemoPlaceId>('brazil');
  const [loads, setLoads] = useState<Partial<Record<DemoPlaceId, Load>>>({});
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const scenario = demoScenarios.find((item) => item.id === place) ?? demoScenarios[0];
  const load = loads[place];
  const steps = en ? ['Location', 'Polygon', 'NASA decision', 'Hypothesis under attention', 'Evidence', 'Human next step'] : ['Localização', 'Polígono', 'Decisão NASA', 'Hipótese sob atenção', 'Evidência', 'Próximo passo humano'];
  const step = Math.min(steps.length - 1, Math.floor(elapsed / STEP_MS));

  useEffect(() => {
    if (loads[place]) return;
    let cancelled = false;
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: scenario.input }) })
      .then(async (response) => { if (!response.ok) throw new Error('analysis failed'); return response.json() as Promise<AnalysisResult>; })
      .then((data) => { if (!cancelled) setLoads((current) => ({ ...current, [place]: { kind: 'ready', data } })); })
      .catch(() => { if (!cancelled) setLoads((current) => ({ ...current, [place]: { kind: 'error' } })); });
    return () => { cancelled = true; };
  }, [place, loads, scenario]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setElapsed((current) => { const next = current + TICK_MS; if (next >= STEP_MS * steps.length) { setPlaying(false); return STEP_MS * steps.length - 1; } return next; }), TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing, steps.length]);

  const goTo = (target: number) => setElapsed(Math.max(0, Math.min(steps.length - 1, target)) * STEP_MS);
  const choose = (id: DemoPlaceId) => { setPlace(id); setElapsed(0); setPlaying(false); };
  const data = load?.kind === 'ready' ? load.data : undefined;
  const hero = useMemo(() => (data ? deriveDecisionHero(data) : undefined), [data]);
  const seconds = Math.min(90, Math.round(elapsed / 1000));
  const openFull = () => { saveDraft(scenario.input); router.push('/results'); };

  return <section className="mx-auto max-w-4xl">
    <h1 className="page-title font-bold">{en ? '90-second guided demo' : 'Demo guiada de 90 segundos'}</h1>
    <p className="mt-2 max-w-2xl text-slate-300">{en ? 'Six steps, 15 seconds each, using real NASA POWER history. The polygon is a demonstration outline, not a real field. Brazilian context applies only inside Brazil.' : 'Seis passos de 15 segundos com histórico real do NASA POWER. O polígono é um contorno de demonstração, não um talhão real. O contexto brasileiro só se aplica dentro do Brasil.'}</p>
    <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label={en ? 'Demo location' : 'Local da demo'}>{demoScenarios.map((item) => <button aria-checked={item.id === place} className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${item.id === place ? 'border-lime-300 bg-lime-300/15' : 'border-slate-600 hover:border-lime-300'}`} key={item.id} role="radio" type="button" onClick={() => choose(item.id)}>{item.label[locale]}</button>)}</div>
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <Button type="button" onClick={() => { if (!playing && elapsed >= STEP_MS * steps.length - 1) setElapsed(0); setPlaying((value) => !value); }}>{playing ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}{playing ? (en ? 'Pause' : 'Pausar') : elapsed > 0 ? (en ? 'Resume' : 'Continuar') : (en ? 'Start 90 s demo' : 'Iniciar demo de 90 s')}</Button>
      <Button aria-label={en ? 'Previous step' : 'Passo anterior'} disabled={step === 0} type="button" variant="secondary" onClick={() => goTo(step - 1)}><SkipBack aria-hidden="true" size={16} /></Button>
      <Button aria-label={en ? 'Next step' : 'Próximo passo'} disabled={step === steps.length - 1} type="button" variant="secondary" onClick={() => goTo(step + 1)}><SkipForward aria-hidden="true" size={16} /></Button>
      <span className="text-sm text-slate-300" role="timer">{seconds}s / 90s</span>
    </div>
    <ol aria-label={en ? 'Demo steps' : 'Passos da demo'} className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-6">{steps.map((label, index) => <li key={label}><button aria-current={index === step ? 'step' : undefined} className={`min-h-11 w-full rounded-lg border px-2 py-1 text-left ${index === step ? 'border-lime-300 bg-lime-300/15 font-bold' : 'border-slate-700'}`} type="button" onClick={() => goTo(index)}>{index + 1}. {label}</button></li>)}</ol>
    <div aria-live="polite" className="mt-5 min-h-64">
      {!load ? <p className="text-slate-300" role="status">{en ? 'Loading NASA POWER history…' : 'Carregando histórico NASA POWER…'}</p> : null}
      {load?.kind === 'error' ? <p className="rounded-xl border border-amber-300 bg-amber-950/40 p-4" role="alert">{en ? 'The analysis could not be loaded. Nothing is shown as fine; try again later.' : 'Não foi possível carregar a análise. Nada é mostrado como ok; tente novamente depois.'}</p> : null}
      {data && hero ? <>
        {step === 0 ? <article className="rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="text-xl font-bold">{steps[0]}</h2><p className="mt-2 font-mono text-lg">{data.input.location.latitude}, {data.input.location.longitude}</p>{data.regionalContext.municipality ? <p className="mt-2 text-sm">{en ? 'Brazilian municipality' : 'Município brasileiro'}: {data.regionalContext.municipality.name} ({data.regionalContext.municipality.uf}) · IBGE {data.regionalContext.municipality.code}</p> : <p className="mt-2 text-sm text-slate-300">{en ? 'Outside Brazil: IBGE, ZARC and PAM context does not apply here and is shown as N/D.' : 'Fora do Brasil: o contexto IBGE, ZARC e PAM não se aplica aqui e aparece como N/D.'}</p>}</article> : null}
        {step === 1 && data.input.fieldBoundary ? <article className="rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="mb-3 text-xl font-bold">{steps[1]}</h2><BoundarySummary boundary={data.input.fieldBoundary} /></article> : null}
        {step === 2 ? <DecisionHero data={data} /> : null}
        {step === 3 ? <article className="rounded-xl border border-slate-700 bg-slate-900 p-5"><div className="flex items-center gap-4"><StatusCharacter locale={locale} state={hero.state} /><h2 className="text-xl font-bold">{steps[3]}</h2></div>{hero.state === 'attention' ? <ul className="mt-3 space-y-2 text-sm">{hero.items.map((item) => <li className="rounded-lg border border-amber-300/60 bg-amber-950/30 p-3" key={item.scenarioId}><b>{en ? 'Hypothesis' : 'Hipótese'} {item.scenarioId} · {cropDisplayName(item.cropId, item.cropName, locale)}</b>: {hero.observedValue} {hero.unit} {en ? 'outside the documented' : 'fora da faixa documentada de'} {item.rangeC?.min}–{item.rangeC?.max} °C.</li>)}</ul> : <p className="mt-3 text-sm">{hero.state === 'compatible' ? (en ? 'No hypothesis is under attention for the planting month; every one has a documented range containing the NASA value.' : 'Nenhuma hipótese sob atenção no mês de plantio; todas têm faixa documentada que contém o valor NASA.') : (en ? 'No reading available: nothing is flagged and nothing is treated as fine (N/D).' : 'Sem leitura disponível: nada é sinalizado e nada é tratado como ok (N/D).')}</p>}</article> : null}
        {step === 4 ? <article className="rounded-xl border border-slate-700 bg-slate-900 p-5"><h2 className="text-xl font-bold">{steps[4]}</h2><SourceHealthList health={data.evidenceManifest.sourceHealth} /></article> : null}
        {step === 5 ? <article className="rounded-xl border border-lime-300/50 bg-slate-900 p-5"><h2 className="text-xl font-bold">{steps[5]}</h2><p className="mt-2 text-sm">{hero.state === 'unknown' ? (en ? 'Provide the missing data or retry later; nothing was assumed to be fine.' : 'Informe o dado que falta ou tente depois; nada foi assumido como ok.') : (en ? 'Take the hypotheses, ranges and sources to a local agronomist or technician. This is exploration, not a recommendation.' : 'Leve as hipóteses, faixas e fontes a um agrônomo ou técnico local. Isto é exploração, não recomendação.')}</p><Button className="mt-4" type="button" onClick={openFull}>{en ? 'Open the full analysis' : 'Abrir a análise completa'}</Button></article> : null}
      </> : null}
    </div>
  </section>;
}
