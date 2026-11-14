import type { CropCoverage } from '@/lib/evidence-coverage';
import { CropSprite } from '@/components/crops/crop-sprite';
import { useLocale } from '@/components/locale-provider';
const purposeLabel: Record<string, string> = { commercial: 'Comercial', cover: 'Cobertura', forage: 'Forragem' };
export function CropCard({ coverage }: { coverage: CropCoverage }) {
  const { locale } = useLocale();
  const { crop } = coverage;
  const purposes = locale === 'en' ? { commercial: 'Commercial', cover: 'Cover', forage: 'Forage' } : purposeLabel;
  return <article aria-label={crop.commonNames[locale]} className="flex min-h-[132px] min-w-0 flex-col items-center justify-center rounded-xl border border-slate-600 bg-slate-900/75 p-2.5 text-center shadow-sm"><CropSprite cropId={crop.id} name={crop.commonNames[locale]} size={48} /><div className="mt-1.5 min-w-0"><p className="hyphens-auto text-sm font-bold leading-tight">{crop.commonNames[locale]}</p><p className="mt-1 text-xs text-slate-300">{crop.purposes.map((purpose) => purposes[purpose as keyof typeof purposes] ?? purpose).join(' · ')}</p></div></article>;
}
