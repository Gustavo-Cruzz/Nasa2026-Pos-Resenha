'use client';

import { useState } from 'react';
import { clearJourneyMetrics, readJourneyMetrics } from '@/lib/journey-metrics';
import { useLocale } from '@/components/locale-provider';

export function JourneyMetricsPanel() {
  const { locale } = useLocale();
  const [metrics, setMetrics] = useState(() => readJourneyMetrics());
  const labels = locale === 'en' ? { title: 'Local journey metrics', intro: 'Stored only in this browser; nothing is sent to a server.', visits: 'Route visits', completions: 'Completed comparisons', duration: 'Last completion time', clear: 'Clear local metrics', seconds: 'seconds' } : { title: 'Métricas locais da jornada', intro: 'Armazenadas apenas neste navegador; nada é enviado ao servidor.', visits: 'Visitas por etapa', completions: 'Comparações concluídas', duration: 'Tempo da última conclusão', clear: 'Limpar métricas locais', seconds: 'segundos' };
  return <details className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4"><summary className="cursor-pointer font-bold">{labels.title}</summary><p className="mt-3 text-sm text-slate-300">{labels.intro}</p><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><div><dt className="text-slate-400">{labels.visits}</dt><dd className="font-semibold">{Object.values(metrics.visits).reduce((sum, value) => sum + value, 0)}</dd></div><div><dt className="text-slate-400">{labels.completions}</dt><dd className="font-semibold">{metrics.completedAnalyses}</dd></div><div><dt className="text-slate-400">{labels.duration}</dt><dd className="font-semibold">{metrics.lastCompletionSeconds === null ? 'N/D' : `${metrics.lastCompletionSeconds} ${labels.seconds}`}</dd></div></dl><button className="mt-4 min-h-10 text-sm font-semibold underline" type="button" onClick={() => { clearJourneyMetrics(); setMetrics(readJourneyMetrics()); }}>{labels.clear}</button></details>;
}
