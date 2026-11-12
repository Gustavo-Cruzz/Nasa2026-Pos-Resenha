'use client';

import { useLocale } from '@/components/locale-provider';

export default function MethodologyPage() {
  const { locale, copy } = useLocale();
  const rows = locale === 'en' ? [
    ['Climate', 'NASA POWER Daily Point; 2011-01-01 to 2025-12-31, UTC. Sentinels, gaps, and implausible values remain null.'],
    ['Quality', 'Coverage is calculated per variable. The fixture only serves exact pilot coordinates and has a recorded SHA-256.'],
    ['Scope', 'Outside Rio Verde (GO): global climate, without regional recommendation. Within it: only registered ZARC context.'],
    ['Engine and laboratory', 'An explicit or presumed baseline; the laboratory records A/B/C hypotheses in neutral slots. Existing qualitative indicators are recalculated only for the selected crop; empty slots remain N/D.'],
    ['Comparison', 'Priorities only highlight available indicators. No score, aggregate ranking, yield, or success probability is shown when data is missing.'],
    ['Not calculated', 'No forecast, yield, NPK, SOC, irrigation need, field diagnosis, or ETc.'],
  ] : [
    ['Clima', 'NASA POWER Daily Point; 2011-01-01 a 2025-12-31, UTC. Sentinelas, ausências e valores fora de faixa ficam null.'],
    ['Qualidade', 'Cobertura é calculada por variável. A fixture só serve às coordenadas exatas do piloto e tem SHA-256 registrado.'],
    ['Escopo', 'Fora de Rio Verde (GO): clima global, sem recomendação regional. Dentro: apenas evidência ZARC registrada.'],
    ['Motor e laboratório', 'Linha de base explícita ou “presumida — confirmar”; o laboratório registra hipóteses A/B/C em slots neutros. Indicadores qualitativos existentes são recalculados somente para cultura escolhida; slots sem escolha ficam N/D.'],
    ['Comparação', 'Prioridades apenas destacam indicadores disponíveis. Não há score, ranking agregado, produtividade ou probabilidade de sucesso quando faltam dados.'],
    ['Não calculado', 'Sem previsão, produtividade, NPK, SOC, necessidade de irrigação, diagnóstico de talhão ou ETc.'],
  ];
  return <section className="max-w-3xl"><h1 className="text-3xl font-bold">{copy.methodTitle}</h1><p className="mt-5 leading-7 text-slate-300">{copy.methodIntro}</p><dl className="mt-8 grid gap-4">{rows.map(([term, description]) => <div className="rounded-xl border border-slate-700 p-4" key={term}><dt className="font-bold text-lime-300">{term}</dt><dd className="mt-1 leading-7 text-slate-300">{description}</dd></div>)}</dl><p className="mt-8 text-sm text-slate-400">{copy.sources}</p></section>;
}
