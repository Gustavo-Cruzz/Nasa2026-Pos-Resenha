import type { EvidenceStatus } from '@/lib/evidence-coverage';

const label: Record<EvidenceStatus, string> = { supported: 'Suportada', partial: 'Análise parcial', insufficient_evidence: 'Sem evidência local', unavailable: 'Indisponível' };
const tone: Record<EvidenceStatus, string> = { supported: 'border-lime-300 bg-lime-300/10 text-lime-200', partial: 'border-cyan-300 bg-cyan-500/10 text-cyan-100', insufficient_evidence: 'border-amber-300 bg-amber-950/40 text-amber-100', unavailable: 'border-slate-500 text-slate-300' };
export function EvidenceStatusPill({ status }: { status: EvidenceStatus }) { return <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-tight ${tone[status]}`}>{label[status]}</span>; }
