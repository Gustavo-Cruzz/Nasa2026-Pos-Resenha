import type { EvidenceStatus } from '@/lib/evidence-coverage';

const label: Record<EvidenceStatus, string> = { supported: 'Suportada', partial: 'Análise parcial', insufficient_evidence: 'Evidência local insuficiente', unavailable: 'Indisponível' };
const tone: Record<EvidenceStatus, string> = { supported: 'border-lime-300 text-lime-200', partial: 'border-cyan-300 text-cyan-100', insufficient_evidence: 'border-amber-300 text-amber-100', unavailable: 'border-slate-500 text-slate-300' };
export function EvidenceStatusPill({ status }: { status: EvidenceStatus }) { return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${tone[status]}`}>{label[status]}</span>; }
