'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { evidenceCoverageAssessment, type CropCoverage } from '@/lib/evidence-coverage';
import { crops as p0Crops } from '@/lib/catalog';
import { changeLabSlot, createDefaultLabPlan, type LabCropId, type LabPlan } from '@/lib/lab';
import { loadDraft, saveLabPlan, upgradeLegacyLabPlan } from '@/lib/storage';
import { CropSprite } from '@/components/crops/crop-sprite';
import { PixelAnimation } from '@/components/pixel/pixel-animation';
import { ScenarioArtwork } from '@/components/pixel/scenario-artwork';
import { Button } from '@/components/ui/button';
import { analyze, generateCandidates } from '@/lib/engine';
import { BrazilContextNote } from '@/components/brazil-context-note';
import type { AnalysisResult } from '@/lib/engine/types';
import { diffLabSlot, type LabChangeDelta } from '@/lib/lab/diff';
import { LabChangeFeedback } from '@/components/lab/lab-change-feedback';
import { EvidenceCenterDrawer, EvidenceTriggerButton } from '@/components/evidence/evidence-center';
import type { EvidenceFilter } from '@/lib/evidence/types';
import { useLocale } from '@/components/locale-provider';
import { permittedCatalogCrops } from '@/lib/farmer-profile';

type Target = { scenario: 'A' | 'B' | 'C'; slot: number };
const season = (slot: { year: number; season: string }, en: boolean) => { const label = slot.season === 'A' ? en ? 'main season (summer)' : 'safra (verão)' : en ? 'off-season / 2nd crop' : 'safrinha / 2ª safra'; return en ? `Year ${slot.year} · ${label}` : `Ano ${slot.year} · ${label}`; };
const scenarioTitleEn = (id: string, title: string) => title.startsWith('Plano atual') ? 'Current plan (detected from history)' : title.startsWith('Continuidade') ? 'Presumed continuity — confirm' : title === 'Saúde do solo' ? 'Soil health' : title === 'Diversificação' ? 'Diversification' : title.startsWith('Menor exposição') ? 'Lower documented water exposure' : id === 'C' && title === 'Contexto hídrico' ? 'Water context' : title;

export function RotationLab({ savedFarm = false }: { savedFarm?: boolean }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [loaded] = useState(() => {
    const draft = loadDraft();
    if (!draft) return { draft, plan: undefined, fresh: undefined };
    const candidates = generateCandidates(draft.data);
    const fresh = createDefaultLabPlan(draft.data, candidates);
    const plan = draft.labPlan ? upgradeLegacyLabPlan(draft.labPlan, draft.data, candidates.map((scenario) => scenario.proposedCrop?.cropId), fresh) : fresh;
    return { draft, plan, fresh };
  });
  const { draft } = loaded;
  const [plan, setPlan] = useState<LabPlan | undefined>(loaded.plan);
  const [target, setTarget] = useState<Target>();
  const [updatedSlot, setUpdatedSlot] = useState<string>();
  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C'>('A');
  const [message, setMessage] = useState<string | undefined>(savedFarm ? en ? 'Farm draft saved. Now assemble or review the scenarios.' : 'Rascunho da fazenda salvo. Agora monte ou revise os cenários.' : undefined);
  const [analysis, setAnalysis] = useState<AnalysisResult>();
  const [analysisError, setAnalysisError] = useState<string>();
  const [changeFeedback, setChangeFeedback] = useState<{ delta: LabChangeDelta; cropName: string; previousPlan: LabPlan }>();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>();
  useEffect(() => {
    if (!loaded.draft || !loaded.plan) return;
    void fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: loaded.draft.data, labPlan: loaded.plan }) })
      .then(async (response) => { if (!response.ok) throw new Error(en ? 'Could not load the laboratory assessment.' : 'Não foi possível carregar a avaliação do laboratório.'); return response.json() as Promise<AnalysisResult>; })
      .then((result) => setAnalysis(result))
      .catch((error: unknown) => setAnalysisError(error instanceof Error ? error.message : en ? 'Could not load the laboratory assessment.' : 'Não foi possível carregar a avaliação do laboratório.'));
  }, [en, loaded]);
  const regionalContext = analysis?.regionalContext;
  const coverage = useMemo(() => draft ? permittedCatalogCrops(draft.data.farmerCrops).map((crop) => evidenceCoverageAssessment(draft.data.location, crop.id, regionalContext, locale)) : [], [draft, regionalContext, locale]);

  if (!draft || !plan) return <section className="mt-6 rounded-xl border border-slate-700 p-5"><h1 className="page-title font-bold">{en ? 'Rotation laboratory' : 'Laboratório de rotações'}</h1><p className="mt-3 text-slate-300">{en ? 'Save the farm before assembling scenario hypotheses.' : 'Registre a fazenda antes de montar hipóteses de cenários.'}</p><Button asChild className="mt-5"><Link href="/farm">{en ? 'Go to my farm' : 'Ir para minha fazenda'}</Link></Button></section>;

  const pick = (cropId: LabCropId | null) => {
    if (!target) return;
    const previousPlan = plan;
    const nextPlan = changeLabSlot(plan, target.scenario, target.slot, cropId);
    if (analysis) {
      const nextAnalysis = analyze(draft.data, analysis.climate, nextPlan, analysis.regionalContext);
      const before = analysis.strategies.find((strategy) => strategy.id === target.scenario)?.slots[target.slot];
      const after = nextAnalysis.strategies.find((strategy) => strategy.id === target.scenario)?.slots[target.slot];
      if (before && after) setChangeFeedback({ delta: diffLabSlot(before, after), cropName: after.cropName ?? (locale === 'en' ? 'Empty slot' : 'Slot vazio'), previousPlan });
      setAnalysis(nextAnalysis);
    } else setMessage(en ? 'Slot updated; climate assessment is still loading.' : 'Slot atualizado; avaliação climática ainda está carregando.');
    setPlan(nextPlan);
    setUpdatedSlot(`${target.scenario}-${target.slot}`);
    setTarget(undefined);
  };
  const undo = () => {
    if (!changeFeedback) return;
    setPlan(changeFeedback.previousPlan);
    if (analysis) setAnalysis(analyze(draft.data, analysis.climate, changeFeedback.previousPlan, analysis.regionalContext));
    setChangeFeedback(undefined);
    setUpdatedSlot(undefined);
    setMessage(en ? 'Last change undone.' : 'Última alteração desfeita.');
  };
  const restore = () => {
    if (!loaded.fresh) return;
    setPlan(loaded.fresh); setChangeFeedback(undefined); setUpdatedSlot(undefined);
    if (analysis) setAnalysis(analyze(draft.data, analysis.climate, loaded.fresh, analysis.regionalContext));
    setMessage(en ? 'Suggested sequences restored.' : 'Sugestão restaurada.');
  };
  const save = () => { saveLabPlan(draft, plan); setMessage(en ? 'Laboratory scenarios saved in this browser.' : 'Cenários do laboratório salvos neste navegador.'); };

  return <section className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-lime-200">{en ? 'Your area' : 'Sua área'}: {draft.data.location.latitude}, {draft.data.location.longitude}</p><h1 className="page-title font-bold">{en ? 'Rotation laboratory' : 'Laboratório de rotações'}</h1></div><Link className="text-sm underline" href="/farm/historico">{en ? 'Edit farm' : 'Editar fazenda'}</Link></div>
    <p className="mt-3 max-w-3xl text-slate-300">{en ? 'Compare first; edit the four slots only when needed. Season A is the main summer crop and B the off-season crop; per-season climate evaluation comes later.' : 'Compare primeiro; edite os quatro slots apenas quando precisar. Temporada A é a safra de verão e B a safrinha; a avaliação climática por temporada virá depois.'}</p>
    <div className="mt-5"><BrazilContextNote context={regionalContext} /></div>
    {analysis?.evidenceManifest ? <div className="mt-4"><EvidenceTriggerButton manifest={analysis.evidenceManifest} onClick={() => { setEvidenceFilter(undefined); setEvidenceOpen(true); }} /></div> : analysisError ? <p className="mt-4 rounded border border-amber-300/50 p-3 text-sm text-amber-100" role="status">{analysisError} {en ? 'The laboratory remains editable.' : 'O laboratório continua editável.'}</p> : <p className="mt-4 text-sm text-slate-300" role="status">{en ? 'Loading climate, rules, and evidence…' : 'Carregando clima, regras e evidências…'}</p>}
    <section className="mt-6 rounded-xl border border-slate-700 p-4" aria-labelledby="lab-deck"><h2 className="font-bold" id="lab-deck">{en ? 'Crops accepted for alternatives' : 'Culturas aceitas para alternativas'}</h2><p className="mt-2 text-xs text-lime-200 sm:hidden">{en ? 'Swipe to view all accepted crops →' : 'Deslize para ver todas as culturas aceitas →'}</p><div className="mt-3 flex gap-3 overflow-x-auto pb-2">{coverage.map((item) => <div className="flex min-w-44 items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3" key={item.crop.id}><CropSprite cropId={item.crop.id} name={item.crop.commonNames[locale]} size={48} /><p className="font-semibold">{item.crop.commonNames[locale]}</p></div>)}</div></section>
    <div className="mt-6 grid grid-cols-3 gap-2 lg:hidden" role="tablist" aria-label={en ? 'Choose laboratory scenario' : 'Escolher cenário do laboratório'}>{plan.scenarios.map((scenario) => <button aria-controls={`scenario-${scenario.id}`} aria-selected={activeScenario === scenario.id} className={activeScenario === scenario.id ? 'rounded-lg bg-lime-300 px-2 py-3 font-bold text-slate-950' : 'rounded-lg border border-slate-600 px-2 py-3 font-bold'} key={scenario.id} role="tab" type="button" onClick={() => setActiveScenario(scenario.id)}>{en ? 'Scenario' : 'Cenário'} {scenario.id}</button>)}</div>
    <section className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-3" aria-label={en ? 'Three laboratory scenarios' : 'Três cenários do laboratório'}>{plan.scenarios.map((scenario) => {
      const configured = scenario.slots.filter((slot) => slot.cropId).length;
      const primary = scenario.slots.find((slot) => slot.cropId);
      const primaryCrop = primary ? p0Crops.find((crop) => crop.id === primary.cropId) : undefined;
      return <article aria-labelledby={`scenario-title-${scenario.id}`} className={`${activeScenario === scenario.id ? 'block' : 'hidden'} rounded-xl border border-slate-700 bg-slate-900 p-4 lg:block`} id={`scenario-${scenario.id}`} key={scenario.id} role="tabpanel"><p className="text-sm font-semibold text-lime-300">{en ? 'Scenario' : 'Cenário'} {scenario.id}</p><h2 className="mt-1 text-xl font-bold" id={`scenario-title-${scenario.id}`}>{en ? scenarioTitleEn(scenario.id, scenario.title) : scenario.title}</h2><div className="mt-3"><ScenarioArtwork empty={!primaryCrop} scenario={scenario.id} /></div><div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-800/60 p-3">{primaryCrop ? <CropSprite cropId={primaryCrop.id} name={primaryCrop.commonNames[locale]} size={56} /> : <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-slate-500">N/D</span>}<div><p className="font-semibold">{primaryCrop?.commonNames[locale] ?? (en ? 'No crop selected' : 'Sem cultura escolhida')}</p><p className="mt-1 text-sm text-slate-300">{configured}/4 {en ? 'configured slots' : 'slots configurados'}</p></div></div><details className="mt-4 rounded-lg border border-slate-700 p-3"><summary className="cursor-pointer font-semibold">{en ? 'Edit 4-slot sequence' : 'Editar sequência de 4 slots'}</summary><div className="mt-3 grid gap-3">{scenario.slots.map((slot, index) => { const crop = slot.cropId ? p0Crops.find((item) => item.id === slot.cropId) : undefined; const feedback = changeFeedback?.delta.scenarioId === scenario.id && changeFeedback.delta.slotIndex === index ? changeFeedback : undefined; return <section className={`rounded border border-slate-700 p-3 ${updatedSlot === `${scenario.id}-${index}` ? 'field-slot-updated' : ''}`} key={`${slot.year}-${slot.season}`}><p className="text-xs text-slate-300">{season(slot, en)}</p><div className="mt-2 flex items-center gap-3">{updatedSlot === `${scenario.id}-${index}` ? <PixelAnimation fallback="/assets/interactions/slot-place-static.png" frames={6} sheet="/assets/interactions/slot-place-sheet.png" /> : null}{crop ? <CropSprite cropId={crop.id} name={crop.commonNames[locale]} size={44} /> : null}<div><p className="font-semibold">{crop ? crop.commonNames[locale] : en ? 'N/D — no crop selected' : 'N/D — sem cultura escolhida'}</p></div></div><button className="mt-3 min-h-10 text-sm underline" type="button" onClick={() => setTarget({ scenario: scenario.id, slot: index })}>{crop ? (en ? 'Change crop' : 'Trocar cultura') : (en ? 'Choose crop' : 'Escolher cultura')}</button>{feedback ? <LabChangeFeedback cropName={feedback.cropName} delta={feedback.delta} onEvidence={() => { setEvidenceFilter({ scenarioId: scenario.id, slotIndex: index }); setEvidenceOpen(true); }} onUndo={undo} /> : null}</section>; })}</div></details></article>;
    })}</section>
    {message ? <p className="mt-5 flex items-center gap-3 rounded border border-cyan-300/50 bg-cyan-500/10 p-3 text-cyan-100" role="status"><PixelAnimation fallback="/assets/interactions/draft-saved-static.png" frames={4} sheet="/assets/interactions/draft-saved-sheet.png" />{message}</p> : null}
    <div className="mt-8 flex flex-wrap gap-3"><Button type="button" onClick={save}>{en ? 'Save laboratory' : 'Salvar laboratório'}</Button><Button type="button" variant="secondary" onClick={restore}>{en ? 'Restore suggestion' : 'Restaurar sugestão'}</Button><Button asChild variant="secondary"><Link href="/results" onClick={save}>{en ? 'Review comparison' : 'Revisar comparação'}</Link></Button></div>
    {target ? <CropSelectionDialog coverage={coverage} locale={locale} onClose={() => setTarget(undefined)} onPick={pick} /> : null}
    {analysis?.evidenceManifest ? <EvidenceCenterDrawer filter={evidenceFilter} manifest={analysis.evidenceManifest} open={evidenceOpen} onClose={() => setEvidenceOpen(false)} /> : null}
  </section>;
}

function CropSelectionDialog({ coverage, locale, onClose, onPick }: { coverage: CropCoverage[]; locale: 'pt-BR' | 'en'; onClose: () => void; onPick: (cropId: LabCropId | null) => void }) {
  const en = locale === 'en';
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="presentation" onMouseDown={onClose}><section aria-label={en ? 'Choose crop for slot' : 'Escolher cultura para slot'} aria-modal="true" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 p-5" role="dialog" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{en ? 'Choose crop' : 'Escolher cultura'}</h2><button className="min-h-10 underline" type="button" onClick={onClose}>{en ? 'Close' : 'Fechar'}</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{coverage.map((item) => <button className="flex items-center gap-3 rounded border border-slate-700 p-3 text-left hover:border-lime-300 focus-visible:outline focus-visible:outline-lime-300" key={item.crop.id} type="button" onClick={() => onPick(item.crop.id as LabCropId)}><CropSprite cropId={item.crop.id} name={item.crop.commonNames[locale]} size={44} /><b>{item.crop.commonNames[locale]}</b></button>)}</div><button className="mt-4 min-h-10 text-sm underline" type="button" onClick={() => onPick(null)}>{en ? 'Leave as N/D' : 'Deixar como N/D'}</button></section></div>;
}
