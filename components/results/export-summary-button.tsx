'use client';

import { Download } from 'lucide-react';
import type { AnalysisResult } from '@/lib/engine/types';
import { buildAnalysisSummary } from '@/lib/export-summary';
import { useLocale } from '@/components/locale-provider';

export function ExportSummaryButton({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const label = locale === 'en' ? 'Export technical summary' : 'Exportar resumo técnico';
  const download = () => { const blob = new Blob([buildAnalysisSummary(data, locale)], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `field-shift-${data.input.location.latitude}-${data.input.location.longitude}.md`; link.click(); URL.revokeObjectURL(url); };
  return <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold hover:border-lime-300" type="button" onClick={download}><Download size={17} aria-hidden="true" />{label}</button>;
}
