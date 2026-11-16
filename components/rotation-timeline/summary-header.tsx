'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';
import type { AnalysisResult } from '@/lib/engine/types';
import type { TimelineModel } from '@/lib/rotation-timeline/model';
import { buildStatusLine, historyLine, prioritiesLine, systemsLine } from '@/lib/rotation-timeline/text';
import type { WhatIf } from '@/lib/rotation-timeline/what-if';

export function SummaryHeader({ data, model, whatIf }: { data: AnalysisResult; model: TimelineModel; whatIf: WhatIf }) {
  const { locale } = useLocale(); const en = locale === 'en';
  const systems = systemsLine(data, locale); const priorities = prioritiesLine(data, locale);
  return <header className="mt-6">
    <h2 className="text-2xl font-bold sm:text-3xl">{en ? 'Rotation over the next 2 years, month by month' : 'Rotação dos próximos 2 anos, mês a mês'}</h2>
    <p className="mt-1 max-w-3xl text-sm text-slate-300">{en ? 'The calendar is the interface: three lanes (A, B, C) show what each scenario plants over 24 months, and the evidence bands below share the same month ruler. Everything is a hypothesis to take to a technician, never a recommendation.' : 'O calendário é a interface: três raias (A, B, C) mostram o que cada cenário planta em 24 meses, e as faixas de evidência abaixo usam a mesma régua de meses. Tudo é hipótese para levar a um técnico, nunca recomendação.'}</p>
    <p className="mt-3 flex items-start gap-2.5 rounded-xl border border-l-4 border-[#405840] border-l-lime-300 bg-slate-900/80 px-3.5 py-2.5 text-sm" role="status"><CheckCircle2 aria-hidden="true" className="mt-0.5 flex-none text-lime-300" size={18} /><span>{buildStatusLine(data, model, whatIf, locale)}</span></p>
    <p className="mt-2 text-[13px] text-slate-300">
      <b className="text-slate-100">{en ? 'You grew' : 'Você cultivou'}:</b> {historyLine(data, locale)} · <b className="text-slate-100">{en ? 'Declared systems' : 'Sistemas declarados'}:</b> {systems.length ? systems.join('; ') : (en ? 'none' : 'nenhum')} · <b className="text-slate-100">{en ? 'Your priorities' : 'Suas prioridades'}:</b> {priorities.length ? priorities.join(', ') : 'N/D'} · <Link className="font-semibold text-cyan-200 underline" href="/farm/historico">{en ? 'Edit farm data' : 'Alterar dados da fazenda'}</Link>
    </p>
  </header>;
}
