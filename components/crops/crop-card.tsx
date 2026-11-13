import type { CropCoverage } from '@/lib/evidence-coverage';
import { CropSprite } from '@/components/crops/crop-sprite';
const purposeLabel: Record<string, string> = { commercial: 'Comercial', cover: 'Cobertura', forage: 'Forragem' };
export function CropCard({ coverage, onSelect }: { coverage: CropCoverage; onSelect: () => void }) {
  const { crop } = coverage;
  return <button aria-label={crop.commonNames['pt-BR']} className="flex min-h-[176px] min-w-0 flex-col items-center rounded-xl border border-slate-600 bg-slate-900/75 p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300" type="button" onClick={onSelect}><CropSprite cropId={crop.id} name={crop.commonNames['pt-BR']} size={56} /><div className="mt-2 min-w-0"><p className="hyphens-auto text-base font-bold leading-tight">{crop.commonNames['pt-BR']}</p><p className="mt-1 text-xs text-slate-300">{crop.purposes.map((purpose) => purposeLabel[purpose] ?? purpose).join(' · ')}</p></div></button>;
}
