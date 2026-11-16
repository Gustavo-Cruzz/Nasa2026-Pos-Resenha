'use client';

import Link from 'next/link';
import { CheckCircle2, CircleHelp, ClipboardCheck, TriangleAlert } from 'lucide-react';
import { ExportSummaryButton } from '@/components/results/export-summary-button';
import { useLocale } from '@/components/locale-provider';
import type { AnalysisResult } from '@/lib/engine/types';
import { buildTechnicianBrief } from '@/lib/rotation-timeline/text';

export function TechnicianTab({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale(); const en = locale === 'en'; const brief = buildTechnicianBrief(data, locale);
  const columns = [
    { id: 'known', title: en ? 'What we know' : 'O que sabemos', items: brief.known, icon: <CheckCircle2 aria-hidden="true" className="text-cyan-300" size={20} />, empty: 'N/D' },
    { id: 'missing', title: en ? 'What is missing' : 'O que falta', items: brief.missing, icon: <CircleHelp aria-hidden="true" className="text-amber-300" size={20} />, empty: en ? 'No critical cataloged gap.' : 'Nenhuma lacuna crítica catalogada.' },
    { id: 'risks', title: en ? 'Risks to discuss' : 'Riscos para conversar', items: brief.risks, icon: <TriangleAlert aria-hidden="true" className="text-[#E7BF62]" size={20} />, empty: en ? 'No risk flagged by the loaded data.' : 'Nenhum risco sinalizado pelos dados carregados.' },
    { id: 'questions', title: en ? 'Questions for the technician' : 'Perguntas para o técnico', items: brief.questions, icon: <ClipboardCheck aria-hidden="true" className="text-lime-300" size={20} />, empty: 'N/D' },
  ];
  return <div>
    <p className="mb-3 text-sm text-slate-300">{en ? 'Take this conversation forward. Human review is not automatic validation; nothing here is a recommendation.' : 'Leve esta conversa adiante. A revisão humana não é validação automática; nada aqui é recomendação.'}</p>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{columns.map((column) => <section aria-labelledby={`rt-brief-${column.id}`} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3" key={column.id}>
      <div className="flex items-center gap-2">{column.icon}<h3 className="m-0 text-sm font-bold" id={`rt-brief-${column.id}`}>{column.title}</h3></div>
      {column.items.length ? <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-200">{column.items.map((item) => <li className="py-0.5" key={item}>{item}</li>)}</ul> : <p className="mt-2 text-[13px] text-slate-300">{column.empty}</p>}
    </section>)}</div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><ExportSummaryButton data={data} /><Link className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-4 text-sm font-semibold hover:border-lime-300" href="/methodology">{en ? 'Methodology and limits' : 'Metodologia e limites'}</Link></div>
  </div>;
}
