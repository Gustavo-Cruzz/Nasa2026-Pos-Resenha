'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type { EvidenceFilter, EvidenceManifest } from '@/lib/evidence/types';
import { EvidenceIcon } from '@/components/pixel/evidence-icon';
import { useLocale } from '@/components/locale-provider';

export function EvidenceCenterTrigger({ manifest }: { manifest: EvidenceManifest }) {
  const [open, setOpen] = useState(false);
  return <><EvidenceTriggerButton manifest={manifest} onClick={() => setOpen(true)} /><EvidenceCenterDrawer manifest={manifest} open={open} onClose={() => setOpen(false)} /></>;
}

export function EvidenceTriggerButton({ manifest, onClick, label }: { manifest: EvidenceManifest; onClick: () => void; label?: string }) {
  const { copy } = useLocale();
  const available = manifest.sources.filter((source) => source.status === 'available').length;
  return <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/60 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 hover:border-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" type="button" onClick={onClick}><EvidenceIcon kind="source" size={16} />{label ?? copy.evidenceTrigger} · {available} fontes · {manifest.gaps.length} lacunas</button>;
}

export function EvidenceCenterDrawer({ manifest, open, onClose, filter }: { manifest: EvidenceManifest; open: boolean; onClose: () => void; filter?: EvidenceFilter }) {
  const { copy } = useLocale();
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>('button, a[href], select, [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [open]);
  if (!open) return null;
  const claims = manifest.claims.filter((claim) => (!filter ? claim.slotIndex === null : (!filter.scenarioId || claim.scenarioId === filter.scenarioId) && (filter.slotIndex === undefined || claim.slotIndex === filter.slotIndex) && (!filter.indicatorId || claim.indicatorId === filter.indicatorId)));
  const sourceLabel = (status: 'available' | 'partial' | 'unavailable') => status === 'available' ? copy.evidenceAvailable : status === 'partial' ? copy.evidencePartial : copy.evidenceUnavailable;
  return <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/75" role="presentation" onMouseDown={onClose}>
    <section ref={drawerRef} aria-label={copy.evidenceCenter} aria-modal="true" className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-slate-600 bg-slate-900 p-5 shadow-2xl sm:h-full sm:max-h-none sm:max-w-xl sm:rounded-none" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Field Shift</p><h2 className="text-2xl font-bold">{copy.evidenceCenter}</h2></div><button ref={closeRef} aria-label={copy.evidenceClose} className="grid h-11 w-11 place-items-center rounded-lg border border-slate-600" type="button" onClick={onClose}><X aria-hidden="true" /></button></div>
      <section className="mt-6" aria-labelledby="evidence-sources"><h3 className="font-bold" id="evidence-sources">{copy.evidenceSources}</h3><ul className="mt-3 grid gap-2">{manifest.sources.map((source) => <li className="rounded-lg border border-slate-700 p-3 text-sm" key={source.id}><div className="flex items-start justify-between gap-3"><div><b>{source.title}</b><p className="mt-1 text-xs text-slate-400">{source.scope} · {source.period ?? 'N/D'}{source.coveragePct === null ? '' : ` · ${source.coveragePct}%`}</p></div><span className="rounded-full border border-slate-600 px-2 py-1 text-xs">{sourceLabel(source.status)}</span></div>{source.url ? <a className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs underline" href={source.url} rel="noreferrer" target="_blank">Abrir fonte<ExternalLink size={13} aria-hidden="true" /></a> : null}</li>)}</ul></section>
      <section className="mt-6" aria-labelledby="evidence-claims"><h3 className="font-bold" id="evidence-claims">{copy.evidenceClaims}</h3>{claims.length ? <div className="mt-3 grid gap-3">{claims.map((claim) => <article className="rounded-lg border border-slate-700 p-3" key={claim.id}><div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-semibold">{claim.label}</h4><span className="rounded-full bg-slate-800 px-2 py-1 text-xs">{claim.status}</span></div><p className="mt-2 text-sm text-slate-300">{claim.observation}</p><dl className="mt-2 grid gap-1 text-xs text-slate-400"><div><dt className="inline font-semibold">Regra: </dt><dd className="inline">{claim.ruleId}</dd></div><div><dt className="inline font-semibold">Resultado: </dt><dd className="inline">{claim.result}</dd></div><div><dt className="inline font-semibold">Nível: </dt><dd className="inline">{claim.validationLevel}</dd></div></dl></article>)}</div> : <p className="mt-3 text-sm text-slate-300">{copy.evidenceNoClaims}</p>}</section>
      <section className="mt-6" aria-labelledby="evidence-gaps"><h3 className="font-bold" id="evidence-gaps">{copy.evidenceGaps}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{manifest.gaps.map((gap) => <li key={gap.id}>{gap.label} · {gap.scenarioIds.join('/')}</li>)}</ul></section>
      <section className="mt-6 rounded-lg border border-amber-300/40 bg-amber-950/20 p-4" aria-labelledby="evidence-limits"><h3 className="font-bold text-amber-100" id="evidence-limits">{copy.evidenceGuardrails}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-50">{manifest.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}</ul></section>
    </section>
  </div>;
}
