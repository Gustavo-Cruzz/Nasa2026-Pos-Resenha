'use client';

import { Check } from 'lucide-react';
import type { CropPicker } from '@/lib/chat/flow';
import { categoryById } from '@/lib/chat/crop-categories';
import { cropById } from '@/lib/catalog';
import { CropSprite } from '@/components/crops/crop-sprite';

type Props = { picker: CropPicker; selected: string[]; locale: 'pt-BR' | 'en'; onToggle: (id: string) => void; onContinue: () => void; onChoose: (id: string) => void; onSkip?: () => void; disabled?: boolean };

export function CropConversationPicker({ picker, selected, locale, onToggle, onContinue, onChoose, onSkip, disabled }: Props) {
  const multi = picker.kind !== 'next';
  const label = locale === 'en' ? 'Multiple selection — choose as many as you want' : 'Seleção múltipla — escolha quantas opções quiser';
  const count = locale === 'en' ? `${selected.length} selected` : `${selected.length} ${selected.length === 1 ? 'selecionada' : 'selecionadas'}`;
  return <section aria-label={picker.kind === 'next' ? (locale === 'en' ? 'Next planting' : 'Próximo plantio') : (locale === 'en' ? 'Crop selection' : 'Seleção de culturas')} className="border-t border-slate-800 bg-slate-950/40 px-4 py-3">
    {multi ? <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-300"><span>{label}</span><span aria-live="polite" className="font-semibold text-lime-200">{count}</span></div> : <p className="mb-2 text-xs text-slate-300">{locale === 'en' ? 'Choose one main crop. “Choose another crop” shows the full catalog.' : 'Escolha uma cultura principal. “Escolher outra cultura” mostra todo o catálogo.'}</p>}
    <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {picker.ids.map((id) => {
        const category = picker.kind === 'categories' ? categoryById.get(id) : undefined;
        const crop = picker.kind === 'categories' ? undefined : cropById.get(id);
        if (!category && !crop) return null;
        const checked = selected.includes(id);
        const name = category ? category.name[locale] : crop!.commonNames[locale];
        return <button aria-pressed={multi ? checked : undefined} className={`flex min-h-16 items-center gap-3 rounded-xl border p-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300 ${checked ? 'border-lime-300 bg-lime-300/15' : 'border-slate-600 hover:border-lime-300/70 hover:bg-slate-800'}`} disabled={disabled} key={id} type="button" onClick={() => multi ? onToggle(id) : onChoose(id)}>
          {category ? <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-lg bg-slate-800 text-2xl">{category.icon}</span> : <CropSprite cropId={crop!.id} name={name} size={44} />}
          <span className="min-w-0 flex-1 font-semibold leading-tight">{name}</span>
          {multi ? <span aria-hidden="true" className={`grid h-5 w-5 place-items-center rounded border ${checked ? 'border-lime-300 bg-lime-300 text-slate-950' : 'border-slate-500'}`}>{checked ? <Check size={14} /> : null}</span> : null}
        </button>;
      })}
    </div>
    {picker.skippable && onSkip ? <button className="mt-3 min-h-10 w-full rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-100 hover:border-lime-300" disabled={disabled} type="button" onClick={onSkip}>{locale === 'en' ? 'Skip' : 'Pular'}</button> : null}
    {picker.kind === 'next' ? <button className="mt-3 min-h-10 w-full rounded-lg border border-slate-600 px-3 text-sm font-semibold text-slate-100 hover:border-lime-300" disabled={disabled} type="button" onClick={() => onChoose('__catalog__')}>{locale === 'en' ? 'Choose another crop' : 'Quero escolher outra cultura'}</button> : <button className="mt-3 min-h-11 w-full rounded-lg bg-lime-300 px-4 text-sm font-bold text-slate-950 hover:bg-lime-200 disabled:opacity-50" disabled={disabled || (picker.kind === 'categories' && !selected.length)} type="button" onClick={onContinue}>{locale === 'en' ? 'Continue with my choices' : 'Continuar com minhas escolhas'}</button>}
  </section>;
}
