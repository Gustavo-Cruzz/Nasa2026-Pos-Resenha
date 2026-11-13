import type { CropCoverage } from '@/lib/evidence-coverage';
import { CropSprite } from '@/components/crops/crop-sprite';
import { useLocale } from '@/components/locale-provider';
const purposeLabel: Record<string, string> = { commercial: 'Comercial', cover: 'Cobertura', forage: 'Forragem' };
export function CropCard({ coverage, onSelect }: { coverage: CropCoverage; onSelect: () => void }) {
  const { locale } = useLocale();
  const { crop } = coverage;
  const purposes = locale === 'en' ? { commercial: 'Commercial', cover: 'Cover', forage: 'Forage' } : purposeLabel;
  return <button aria-label={crop.commonNames[locale]} className="flex min-h-[176px] min-w-0 flex-col items-center rounded-xl border border-slate-600 bg-slate-900/75 p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-lime-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300" type="button" onClick={onSelect}><CropSprite cropId={crop.id} name={crop.commonNames[locale]} size={56} /><div className="mt-2 min-w-0"><p className="hyphens-auto text-base font-bold leading-tight">{crop.commonNames[locale]}</p><p className="mt-1 text-xs text-slate-300">{crop.purposes.map((purpose) => purposes[purpose as keyof typeof purposes] ?? purpose).join(' · ')}</p></div></button>;
}
