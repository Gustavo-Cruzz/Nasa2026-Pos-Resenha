'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { BloomSprite } from '@/components/catalog/bloom-sprite';
import { evidenceFieldLabels, lifeCycleLabels, t, type Loc } from '@/components/catalog/catalog-text';
import { cropEvidence, cropMetadataById, type Crop, type CropEvidenceRecord } from '@/lib/catalog';
import { intercropLibrary } from '@/lib/intercrops';
import { cropById } from '@/lib/catalog';

const structuredFields = new Set(['cycleDaysRange', 'idealTempC', 'viableTempC', 'soilPhRange', 'kcStages']);

function formatValue(value: unknown, unit: string | null): ReactNode {
  const u = unit ? ` ${unit}` : '';
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return `${value}${u}`;
  if (typeof value === 'number' || typeof value === 'boolean') return `${String(value)}${u}`;
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ') + u;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.min === 'number' && typeof o.max === 'number' && Object.keys(o).length === 2) return `${o.min}–${o.max}${u}`;
    return <ul className="mt-1 space-y-0.5">{Object.entries(o).map(([k, v]) => <li key={k}><span className="text-slate-400">{k}:</span> {typeof v === 'object' && v !== null ? (Array.isArray(v) ? v.join(', ') : JSON.stringify(v)) : String(v)}{u}</li>)}</ul>;
  }
  return String(value);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-6"><h3 className="font-mono text-sm font-bold uppercase tracking-wide text-lime-300">{title}</h3><div className="mt-2">{children}</div></section>;
}

function RangeBar({ label, range, min, max, unit, color, empty }: { label: string; range: { min: number; max: number } | null; min: number; max: number; unit: string; color: string; empty: string }) {
  if (!range) return <div className="text-sm"><span className="text-slate-300">{label}:</span> <span className="text-slate-400">{empty}</span></div>;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const left = pct(range.min);
  return <div className="text-sm">
    <div className="flex justify-between"><span className="text-slate-300">{label}</span><span className="font-mono text-cream">{range.min}–{range.max} {unit}</span></div>
    <div className="relative mt-1 h-3 border border-slate-600 bg-slate-800" role="img" aria-label={`${label}: ${range.min}–${range.max} ${unit}`}>
      <div className={`absolute top-0 h-full ${color}`} style={{ left: `${left}%`, width: `${Math.max(2, pct(range.max) - left)}%` }} />
    </div>
    <div className="mt-0.5 flex justify-between font-mono text-[10px] text-slate-500"><span>{min}</span><span>{max}</span></div>
  </div>;
}

export function CropDetail({ crop, locale, onClose, bloomKey }: { crop: Crop; locale: Loc; onClose: () => void; bloomKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const L = (k: keyof typeof t) => t[k][locale];
  const name = crop.commonNames[locale];
  const meta = cropMetadataById.get(crop.id);
  const empty = L('noData');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>('button')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])'));
      if (items.length === 0) return;
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus(); };
  }, [onClose]);

  const evidence = cropEvidence.filter((r) => r.cropId === crop.id && !r.supersededBy && !structuredFields.has(r.field));
  const grouped = new Map<string, CropEvidenceRecord[]>();
  for (const r of evidence) grouped.set(r.field, [...(grouped.get(r.field) ?? []), r]);
  const systems = intercropLibrary.systems.filter((s) => s.cropIds.includes(crop.id));
  const evidenceSources = cropEvidence.filter((r) => r.cropId === crop.id && !r.supersededBy).map((r) => r.source);
  const seen = new Set<string>();
  const sourceList: { key: string; title: string; url: string | null; inst: string | null; year: number | null }[] = [];
  for (const s of evidenceSources) { const key = s.url ?? s.title; if (!seen.has(key)) { seen.add(key); sourceList.push({ key, title: s.title, url: s.url, inst: s.institution, year: s.year }); } }
  for (const url of crop.sourceRefs) if (!seen.has(url)) { seen.add(url); sourceList.push({ key: url, title: url, url, inst: null, year: null }); }
  const hasSoil = crop.residuePotential || crop.nitrogenFixationPotential || crop.rootingClass;
  const risks = [...crop.knownRisks, ...(crop.diseaseNotes ?? [])];
  const kcMax = Math.max(1.4, ...(crop.kcStages ?? []).map((s) => s.kc));
  const status = crop.parameterStatus;
  const statusCls = status === 'verified' ? 'border-emerald-400 bg-emerald-900/60 text-emerald-200' : status === 'provisional' ? 'border-amber-400 bg-amber-900/50 text-amber-200' : 'border-slate-500 bg-slate-800 text-slate-300';
  const purposeLabel = (p: string) => t[p as 'commercial' | 'cover' | 'forage'][locale];

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div aria-labelledby="catalog-dialog-title" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border-2 border-lime-300/70 bg-slate-900 text-cream shadow-2xl sm:max-h-[88vh]" ref={ref} role="dialog">
      <div className="sticky top-0 z-10 flex justify-end bg-slate-900/90 p-2">
        <button aria-label={L('close')} className="border border-slate-600 p-2 text-slate-200 hover:border-lime-300 hover:text-lime-300" onClick={onClose} type="button"><X aria-hidden size={18} /></button>
      </div>
      <div className="px-4 pb-8 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <div className="cat-field cat-hero w-full"><div className="cat-cell"><div className="cat-mound"><BloomSprite active bloomKey={bloomKey} cropId={crop.id} name={name} size={160} /></div></div></div>
          <h2 className="mt-3 text-2xl font-bold" id="catalog-dialog-title">{name}</h2>
          <p className="italic text-slate-300">{crop.scientificName}</p>
          <p className="text-sm text-slate-400">{L('family')}: {crop.family}{meta ? ` · ${L('lifeCycle')}: ${lifeCycleLabels[meta.lifeCycle]?.[locale] ?? meta.lifeCycle}` : ''}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {crop.purposes.map((p) => <span className="border border-lime-300/60 px-2 py-0.5 text-xs text-lime-200" key={p}>{purposeLabel(p)}</span>)}
            <span className={`border px-2 py-0.5 text-xs ${statusCls}`}>{status === 'missing' ? L('missing') : L(status)}</span>
          </div>
        </div>
        {meta?.usageRestrictions ? <p className="mt-4 border-l-4 border-amber-400 bg-amber-900/30 p-3 text-sm text-amber-100"><strong>{L('caution')}:</strong> {meta.usageRestrictions}</p> : null}

        <Section title={L('conditions')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <RangeBar color="bg-lime-400" empty={empty} label={L('idealTemp')} max={45} min={0} range={crop.idealTempC} unit="°C" />
            <RangeBar color="bg-amber-400" empty={empty} label={L('viableTemp')} max={45} min={0} range={crop.viableTempC} unit="°C" />
            <RangeBar color="bg-sky-400" empty={empty} label={L('ph')} max={8} min={4} range={crop.soilPhRange} unit="pH" />
            <div className="text-sm"><span className="text-slate-300">{L('cycle')}:</span> <span className="font-mono text-cream">{crop.cycleDaysRange ? `${crop.cycleDaysRange.min}–${crop.cycleDaysRange.max}` : empty}</span></div>
          </div>
        </Section>

        {crop.kcStages && crop.kcStages.length > 0 ? <Section title={L('water')}>
          <ul className="space-y-1.5">{crop.kcStages.map((s, i) => <li className="text-sm" key={i}>
            <div className="flex justify-between"><span className="text-slate-300">{s.stage}</span><span className="font-mono">{s.kc}</span></div>
            <div className="h-2.5 bg-slate-800"><div className="h-full bg-cyan-400" style={{ width: `${(s.kc / kcMax) * 100}%` }} /></div>
          </li>)}</ul>
        </Section> : null}

        {hasSoil ? <Section title={L('soil')}>
          <dl className="grid gap-1 text-sm sm:grid-cols-3">
            {([['residue', crop.residuePotential], ['nitrogen', crop.nitrogenFixationPotential], ['rooting', crop.rootingClass]] as const).map(([k, v]) => <div className="border border-slate-700 p-2" key={k}><dt className="text-slate-400">{L(k)}</dt><dd>{v ?? empty}</dd></div>)}
          </dl>
        </Section> : null}

        {risks.length > 0 ? <Section title={L('risks')}><ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">{risks.map((r, i) => <li key={i}>{r}</li>)}</ul></Section> : null}

        {grouped.size > 0 ? <Section title={L('evidence')}>
          <div className="space-y-3">{[...grouped.entries()].map(([field, records]) => <div className="border border-slate-700 p-3 text-sm" key={field}>
            <p className="font-bold text-lime-200">{evidenceFieldLabels[field]?.[locale] ?? field}</p>
            <ul className="mt-1 space-y-2">{records.map((r, i) => <li key={i}>
              <div className="flex flex-wrap items-center gap-2"><span>{formatValue(r.value, r.unit) ?? empty}</span>{r.source.verification === 'not_verified' ? <span className="border border-amber-400 bg-amber-900/50 px-1.5 py-px text-[10px] uppercase tracking-wide text-amber-200">{L('notVerified')}</span> : null}</div>
              <p className="text-xs text-slate-400">{r.context}{r.cultivar ? ` · ${r.cultivar}` : ''} · {r.location}</p>
            </li>)}</ul>
          </div>)}</div>
        </Section> : null}

        {systems.length > 0 ? <Section title={L('intercrops')}>
          <ul className="space-y-1 text-sm">{systems.map((s) => {
            const partners = s.cropIds.filter((id) => id !== crop.id).map((id) => cropById.get(id)?.commonNames[locale] ?? id);
            return <li key={s.id}>{L('with')} <strong>{partners.join(' + ')}</strong> <span className="text-slate-400">— {s.labelPtBR}</span></li>;
          })}</ul>
        </Section> : null}

        {sourceList.length > 0 ? <Section title={L('sources')}>
          <ul className="space-y-1 break-words text-sm">{sourceList.map((s) => <li key={s.key}>
            {s.url ? <a className="text-lime-300 underline" href={s.url} rel="noreferrer" target="_blank">{s.title}</a> : s.title}
            {s.inst || s.year ? <span className="text-slate-400"> — {[s.inst, s.year].filter(Boolean).join(', ')}</span> : null}
          </li>)}</ul>
        </Section> : null}
      </div>
    </div>
  </div>;
}
