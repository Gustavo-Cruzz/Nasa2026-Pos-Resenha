const rows = [
  ['Clima', 'NASA POWER Daily Point; 2011-01-01 a 2025-12-31, UTC. Sentinelas, ausências e valores fora de faixa ficam null.'],
  ['Qualidade', 'Cobertura é calculada por variável. A fixture só serve às coordenadas exatas do piloto e tem SHA-256 registrado.'],
  ['Escopo', 'Fora de Rio Verde (GO): clima global, sem recomendação regional. Dentro: apenas evidência ZARC registrada.'],
  ['Motor', 'Linha de base explícita ou “presumida — confirmar”. Sem template regional comparável, B/C ficam indisponíveis e score = null.'],
  ['Não calculado', 'Sem previsão, produtividade, NPK, SOC, necessidade de irrigação, diagnóstico de talhão ou ETc.'],
];

export default function MethodologyPage() {
  return <section className="max-w-3xl"><h1 className="text-3xl font-bold">Método e limites</h1><p className="mt-5 leading-7 text-slate-300">Field Shift compara dados climáticos históricos e regras regionais rastreáveis. É apoio exploratório: não é previsão, prescrição agronômica ou validação em campo.</p><dl className="mt-8 grid gap-4">{rows.map(([term, description]) => <div className="rounded-xl border border-slate-700 p-4" key={term}><dt className="font-bold text-lime-300">{term}</dt><dd className="mt-1 leading-7 text-slate-300">{description}</dd></div>)}</dl><p className="mt-8 text-sm text-slate-400">Fontes e evidências: docs/METHOD.md, docs/SOURCES.md, data/crop-evidence.json e data/rio-verde-zarc.json no repositório.</p></section>;
}
