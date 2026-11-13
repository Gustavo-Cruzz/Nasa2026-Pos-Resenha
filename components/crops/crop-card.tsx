import type { CropCoverage } from '@/lib/evidence-coverage';
import { EvidenceStatusPill } from '@/components/crops/evidence-status-pill';
import { CropSprite } from '@/components/crops/crop-sprite';
const purposeLabel: Record<string, string> = { commercial: 'Comercial', cover: 'Cobertura', forage: 'Forragem' };
export function CropCard({ coverage, onSelect }: { coverage: CropCoverage; onSelect: () => void }) {
  const { crop } = coverage;
  const status = coverage.status === 'partial' ? 'Análise parcial' : coverage.status === 'insufficient_evidence' ? 'Sem evidência local' : coverage.status;
  return <button aria-label={`${crop.commonNames['pt-BR']}: ${status}`} className="flex min-h-[178px] min-w-0 flex-col rounded-xl border border-slate-600 bg-slate-900/75 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300" type="button" onClick={onSelect}><div className="flex min-w-0 items-start gap-3"><CropSprite cropId={crop.id} name={crop.commonNames['pt-BR']} /><div className="min-w-0"><p className="break-words text-base font-bold leading-tight">{crop.commonNames['pt-BR']}</p><p className="mt-1 text-xs text-slate-300">{crop.purposes.map((purpose) => purposeLabel[purpose] ?? purpose).join(' · ')}</p></div></div><div className="mt-auto pt-4"><EvidenceStatusPill status={coverage.status} /></div></button>;
}
