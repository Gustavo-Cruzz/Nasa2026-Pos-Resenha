'use client';

import Link from 'next/link';
import { JoaoFigure } from '@/components/joao/joao-figure';
import { useLocale } from '@/components/locale-provider';
import type { AnalysisResult } from '@/lib/engine/types';
import { historyLine, prioritiesLine, systemsLine } from '@/lib/rotation-timeline/text';

export function SummaryHeader({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale(); const en = locale === 'en';
  const systems = systemsLine(data, locale); const priorities = prioritiesLine(data, locale);
  return <header className="mt-6">
    <div className="flex max-w-3xl items-start gap-3"><JoaoFigure className="h-[96px] w-[64px] shrink-0" mood="happy" /><div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-lime-300/30 bg-slate-900 p-3.5"><span aria-hidden="true" className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-lime-300/30 bg-slate-900" /><p className="text-sm font-semibold text-lime-200">{en ? 'Advanced comparison' : 'Comparação avançada'}</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">{en ? 'Rotation over the next 2 years, month by month' : 'Rotação dos próximos 2 anos, mês a mês'}</h2><p className="mt-2 text-sm text-slate-100">{en ? 'Here is how I see it: the three lanes (A, B, C) show what each scenario plants over 24 months, and the evidence bands below use the same month ruler, so you can read them together. Everything here is a hypothesis to take to a technician, never a recommendation.' : 'Olha como eu enxergo: as três raias (A, B, C) mostram o que cada cenário planta em 24 meses, e as faixas de evidência abaixo usam a mesma régua de meses, para você ler tudo junto. Tudo aqui é hipótese para levar a um técnico, nunca recomendação.'}</p></div></div>
    <p className="mt-2 text-[13px] text-slate-300">
      <b className="text-slate-100">{en ? 'You grew' : 'Você cultivou'}:</b> {historyLine(data, locale)} · <b className="text-slate-100">{en ? 'Declared systems' : 'Sistemas declarados'}:</b> {systems.length ? systems.join('; ') : (en ? 'none' : 'nenhum')} · <b className="text-slate-100">{en ? 'Your priorities' : 'Suas prioridades'}:</b> {priorities.length ? priorities.join(', ') : 'N/D'} · <Link className="font-semibold text-cyan-200 underline" href="/farm/historico">{en ? 'Edit farm data' : 'Alterar dados da fazenda'}</Link>
    </p>
  </header>;
}
