import Image from 'next/image';
import type { CropCoverage } from '@/lib/evidence-coverage';
import { EvidenceStatusPill } from '@/components/crops/evidence-status-pill';
const sprite: Record<string, string> = { soybean: 'soybean', maize: 'corn', sorghum: 'sorghum', sunflower: 'sunflower', cowpea: 'cowpea', pearl_millet: 'millet', ruziziensis: 'brachiaria', sunn_hemp: 'sunn-hemp', cotton: 'cotton', pigeon_pea: 'pigeon-pea' };
export function CropCard({ coverage, onSelect }: { coverage: CropCoverage; onSelect: () => void }) {
  const { crop } = coverage;
  return <button aria-label={`${crop.commonNames['pt-BR']}: ${coverage.status === 'partial' ? 'Análise parcial' : coverage.status === 'insufficient_evidence' ? 'Evidência local insuficiente' : coverage.status}`} className="rounded-lg border border-slate-700 bg-slate-950/40 p-3 text-left transition hover:border-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300" type="button" onClick={onSelect}><div className="flex items-start gap-2"><Image alt="" className="h-12 w-12 object-contain [image-rendering:pixelated]" height={48} src={`/assets/crops/${sprite[crop.id]}.png`} width={48} /><div><p className="font-semibold">{crop.commonNames['pt-BR']}</p><p className="text-xs text-slate-400">{crop.purposes.join(' · ')}</p></div></div><div className="mt-3"><EvidenceStatusPill status={coverage.status} /></div></button>;
}
