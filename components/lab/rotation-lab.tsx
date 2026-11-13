'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { p0Crops, evidenceCoverageAssessment, type CropCoverage } from '@/lib/evidence-coverage';
import { changeLabSlot, createLabPlan, type LabCropId, type LabPlan } from '@/lib/lab';
import { loadDraft, saveLabPlan } from '@/lib/storage';
import { CropSprite } from '@/components/crops/crop-sprite';
import { PixelAnimation } from '@/components/pixel/pixel-animation';
import { ScenarioArtwork } from '@/components/pixel/scenario-artwork';
import { Button } from '@/components/ui/button';
import { generateCandidates } from '@/lib/engine';
import { BrazilContextNote } from '@/components/brazil-context-note';
import { regionalContextApiResponseSchema } from '@/lib/atlas';
import type { BrazilRegionalContext } from '@/lib/brazil/types';

type Target = { scenario: 'A' | 'B' | 'C'; slot: number };
const season = (slot: { year: number; season: string }) => `Ano ${slot.year} · Temporada ${slot.season}`;

export function RotationLab({ savedFarm = false }: { savedFarm?: boolean }) {
  const [draft] = useState(() => loadDraft());
  const [plan, setPlan] = useState<LabPlan | undefined>(() => draft ? draft.labPlan ?? createLabPlan(draft.data, generateCandidates(draft.data).map((scenario) => scenario.proposedCrop?.cropId)) : undefined);
  const [target, setTarget] = useState<Target>();
  const [updatedSlot, setUpdatedSlot] = useState<string>();
  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C'>('A');
  const [message, setMessage] = useState<string | undefined>(savedFarm ? 'Rascunho da fazenda salvo. Agora monte ou revise os cenários.' : undefined);
  const [regionalContext, setRegionalContext] = useState<BrazilRegionalContext>();
  useEffect(() => {
    if (!draft) return;
    const query = `lat=${encodeURIComponent(draft.data.location.latitude)}&lon=${encodeURIComponent(draft.data.location.longitude)}`;
    void fetch(`/api/regional-context?${query}`).then((response) => response.json()).then((body: unknown) => {
      const parsed = regionalContextApiResponseSchema.safeParse(body);
      if (parsed.success && parsed.data.status === 'ok') setRegionalContext(parsed.data.context);
    });
  }, [draft]);
  const coverage = useMemo(() => draft ? p0Crops.map((crop) => evidenceCoverageAssessment(draft.data.location, crop.id, regionalContext)) : [], [draft, regionalContext]);

  if (!draft || !plan) return <section className="mt-6 rounded-xl border border-slate-700 p-5"><h1 className="text-3xl font-bold">Laboratório de rotações</h1><p className="mt-3 text-slate-300">Registre a fazenda antes de montar hipóteses de cenários.</p><Button asChild className="mt-5"><Link href="/farm">Ir para minha fazenda</Link></Button></section>;

  const pick = (cropId: LabCropId | null) => {
    if (!target) return;
    setPlan(changeLabSlot(plan, target.scenario, target.slot, cropId));
    setUpdatedSlot(`${target.scenario}-${target.slot}`);
    setTarget(undefined);
    setMessage('Slot atualizado.');
  };
  const save = () => { saveLabPlan(draft, plan); setMessage('Cenários do laboratório salvos neste navegador.'); };

  return <section className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-lime-200">Sua área: {draft.data.location.latitude}, {draft.data.location.longitude}</p><h1 className="text-3xl font-bold">Laboratório de rotações</h1></div><Link className="text-sm underline" href="/farm">Editar fazenda</Link></div>
    <p className="mt-3 max-w-3xl text-slate-300">Compare primeiro; edite os quatro slots apenas quando precisar. Temporadas A/B são rótulos neutros, não um calendário agrícola presumido.</p>
    <div className="mt-5"><BrazilContextNote context={regionalContext} /></div>
    <section className="mt-6 rounded-xl border border-slate-700 p-4" aria-labelledby="lab-deck"><h2 className="font-bold" id="lab-deck">Deck de culturas P0</h2><p className="mt-2 text-xs text-lime-200 sm:hidden">Deslize para ver as oito culturas →</p><div className="mt-3 flex gap-3 overflow-x-auto pb-2">{coverage.map((item) => <div className="flex min-w-44 items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3" key={item.crop.id}><CropSprite cropId={item.crop.id} name={item.crop.commonNames['pt-BR']} size={48} /><p className="font-semibold">{item.crop.commonNames['pt-BR']}</p></div>)}</div></section>
    <div className="mt-6 grid grid-cols-3 gap-2 lg:hidden" role="tablist" aria-label="Escolher cenário do laboratório">{plan.scenarios.map((scenario) => <button aria-controls={`scenario-${scenario.id}`} aria-selected={activeScenario === scenario.id} className={activeScenario === scenario.id ? 'rounded-lg bg-lime-300 px-2 py-3 font-bold text-slate-950' : 'rounded-lg border border-slate-600 px-2 py-3 font-bold'} key={scenario.id} role="tab" type="button" onClick={() => setActiveScenario(scenario.id)}>Cenário {scenario.id}</button>)}</div>
    <section className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-3" aria-label="Três cenários do laboratório">{plan.scenarios.map((scenario) => {
      const configured = scenario.slots.filter((slot) => slot.cropId).length;
      const primary = scenario.slots.find((slot) => slot.cropId);
      const primaryCrop = primary ? p0Crops.find((crop) => crop.id === primary.cropId) : undefined;
      return <article aria-labelledby={`scenario-title-${scenario.id}`} className={`${activeScenario === scenario.id ? 'block' : 'hidden'} rounded-xl border border-slate-700 bg-slate-900 p-4 lg:block`} id={`scenario-${scenario.id}`} key={scenario.id} role="tabpanel"><p className="text-sm font-semibold text-lime-300">Cenário {scenario.id}</p><h2 className="mt-1 text-xl font-bold" id={`scenario-title-${scenario.id}`}>{scenario.title}</h2><div className="mt-3"><ScenarioArtwork empty={!primaryCrop} scenario={scenario.id} /></div><div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-800/60 p-3">{primaryCrop ? <CropSprite cropId={primaryCrop.id} name={primaryCrop.commonNames['pt-BR']} size={56} /> : <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-slate-500">N/D</span>}<div><p className="font-semibold">{primaryCrop?.commonNames['pt-BR'] ?? 'Sem cultura escolhida'}</p><p className="mt-1 text-sm text-slate-300">{configured}/4 slots configurados</p></div></div><details className="mt-4 rounded-lg border border-slate-700 p-3"><summary className="cursor-pointer font-semibold">Editar sequência de 4 slots</summary><div className="mt-3 grid gap-3">{scenario.slots.map((slot, index) => { const crop = slot.cropId ? p0Crops.find((item) => item.id === slot.cropId) : undefined; return <section className={`rounded border border-slate-700 p-3 ${updatedSlot === `${scenario.id}-${index}` ? 'field-slot-updated' : ''}`} key={`${slot.year}-${slot.season}`}><p className="text-xs text-slate-300">{season(slot)}</p><div className="mt-2 flex items-center gap-3">{updatedSlot === `${scenario.id}-${index}` ? <PixelAnimation fallback="/assets/interactions/slot-place-static.png" frames={6} sheet="/assets/interactions/slot-place-sheet.png" /> : null}{crop ? <CropSprite cropId={crop.id} name={crop.commonNames['pt-BR']} size={44} /> : null}<div><p className="font-semibold">{crop ? crop.commonNames['pt-BR'] : 'N/D — sem cultura escolhida'}</p></div></div><button className="mt-3 min-h-10 text-sm underline" type="button" onClick={() => setTarget({ scenario: scenario.id, slot: index })}>{crop ? 'Trocar cultura' : 'Escolher cultura'}</button></section>; })}</div></details></article>;
    })}</section>
    {message ? <p className="mt-5 flex items-center gap-3 rounded border border-cyan-300/50 bg-cyan-500/10 p-3 text-cyan-100" role="status"><PixelAnimation fallback="/assets/interactions/draft-saved-static.png" frames={4} sheet="/assets/interactions/draft-saved-sheet.png" />{message}</p> : null}
    <div className="mt-8 flex flex-wrap gap-3"><Button type="button" onClick={save}>Salvar laboratório</Button><Button asChild variant="secondary"><Link href="/results" onClick={save}>Revisar comparação</Link></Button></div>
    {target ? <CropSelectionDialog coverage={coverage} onClose={() => setTarget(undefined)} onPick={pick} /> : null}
  </section>;
}

function CropSelectionDialog({ coverage, onClose, onPick }: { coverage: CropCoverage[]; onClose: () => void; onPick: (cropId: LabCropId | null) => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="presentation" onMouseDown={onClose}><section aria-label="Escolher cultura para slot" aria-modal="true" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 p-5" role="dialog" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold">Escolher cultura</h2><button className="min-h-10 underline" type="button" onClick={onClose}>Fechar</button></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{coverage.map((item) => <button className="flex items-center gap-3 rounded border border-slate-700 p-3 text-left hover:border-lime-300 focus-visible:outline focus-visible:outline-lime-300" key={item.crop.id} type="button" onClick={() => onPick(item.crop.id as LabCropId)}><CropSprite cropId={item.crop.id} name={item.crop.commonNames['pt-BR']} size={44} /><b>{item.crop.commonNames['pt-BR']}</b></button>)}</div><button className="mt-4 min-h-10 text-sm underline" type="button" onClick={() => onPick(null)}>Deixar como N/D</button></section></div>;
}
