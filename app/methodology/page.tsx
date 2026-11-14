'use client';

import { Ban, CloudSun, Database, FileCheck2, Mountain, Satellite, Sprout, UserRound } from 'lucide-react';
import { useLocale } from '@/components/locale-provider';

type Source = { icon: typeof Satellite; title: string; gives: string; limit: string };

export default function MethodologyPage() {
  const { locale, copy } = useLocale();
  const en = locale === 'en';
  const sources: Source[] = en ? [
    { icon: Satellite, title: 'NASA POWER · GPM IMERG', gives: 'Daily temperature, rain, humidity, wind and solar radiation (2011–2025). From them: FAO-56 ET0 and the monthly rain − ET0 balance.', limit: 'Not a forecast, crop demand or irrigation need.' },
    { icon: CloudSun, title: 'Open-Meteo · live weather', gives: 'Temperature, humidity, rain, wind, pressure and cloud cover right now at the chosen point, refreshed every 15 minutes.', limit: 'Not NASA data; a weather-model analysis, not a measurement of your farm. No forecasts.' },
    { icon: Sprout, title: 'NASA MODIS · NDVI', gives: 'Vegetation greenness (MOD13Q1) for pilot points, via Planetary Computer.', limit: 'Shown only where a verified file exists; otherwise N/D.' },
    { icon: Mountain, title: 'SRTM · Embrapa · Fournier index', gives: 'Slope, relief classes, slope hotspots (≥ 8%) and rain erosivity (Modified Fournier Index).', limit: 'Soil loss (RUSLE) stays N/D: soil, cover and slope-length data are missing.' },
    { icon: Database, title: 'IBGE · ZARC · PAM', gives: 'Municipality lookup, local ZARC crop records and municipal production history.', limit: 'PAM never picks crops; municipal data is not field validation.' },
    { icon: FileCheck2, title: 'Crop evidence catalog', gives: 'Thermal ranges, pH and cycle, each linked to a verified source.', limit: 'Missing parameters stay N/D. Nothing is inferred.' },
    { icon: UserRound, title: 'Your input', gives: 'Place, past crops and soil notes you report.', limit: 'Not verified, and not used in any calculation.' },
  ] : [
    { icon: Satellite, title: 'NASA POWER · GPM IMERG', gives: 'Temperatura, chuva, umidade, vento e radiação solar diários (2011–2025). Deles saem a ET0 FAO-56 e o balanço mensal chuva − ET0.', limit: 'Não é previsão, demanda da cultura nem necessidade de irrigação.' },
    { icon: CloudSun, title: 'Open-Meteo · tempo real', gives: 'Temperatura, umidade, chuva, vento, pressão e nuvens de agora no ponto escolhido, atualizados a cada 15 minutos.', limit: 'Não são dados da NASA; é análise de modelo meteorológico, não medição da sua fazenda. Sem previsões.' },
    { icon: Sprout, title: 'NASA MODIS · NDVI', gives: 'Verdor da vegetação (MOD13Q1) em pontos piloto, via Planetary Computer.', limit: 'Aparece só onde há arquivo verificado; fora disso, N/D.' },
    { icon: Mountain, title: 'SRTM · Embrapa · Índice de Fournier', gives: 'Declividade, classes de relevo, pontos críticos (≥ 8%) e erosividade da chuva (Índice de Fournier Modificado).', limit: 'A perda de solo (RUSLE) segue N/D: faltam solo, cobertura e comprimento de rampa.' },
    { icon: Database, title: 'IBGE · ZARC · PAM', gives: 'Município, registros locais do ZARC e histórico municipal de produção.', limit: 'O PAM nunca escolhe culturas; dado municipal não valida o talhão.' },
    { icon: FileCheck2, title: 'Catálogo de evidências', gives: 'Faixas térmicas, pH e ciclo, cada um ligado a uma fonte verificada.', limit: 'Parâmetro ausente fica N/D. Nada é inferido.' },
    { icon: UserRound, title: 'Seus dados', gives: 'Local, culturas anteriores e observações do solo que você informa.', limit: 'Não são verificados e não entram em nenhum cálculo.' },
  ];
  const steps = en
    ? [['Read the data', 'Climate and relief come from the sources above.'], ['Apply documented rules', 'Each crop is compared with its own sourced ranges.'], ['Show the result', 'Compatible, attention or N/D — month by month, with the source.']]
    : [['Ler os dados', 'Clima e relevo vêm das fontes acima.'], ['Aplicar regras documentadas', 'Cada cultura é comparada com suas próprias faixas, com fonte.'], ['Mostrar o resultado', 'Compatível, atenção ou N/D — mês a mês, com a fonte.']];
  const nots = en
    ? ['No forecasts', 'No scores or rankings', 'No irrigation or yield advice', 'Missing data is never "ok"']
    : ['Sem previsões', 'Sem notas nem rankings', 'Sem recomendação de irrigação ou produtividade', 'Dado ausente nunca vira "ok"'];
  const levels = en
    ? [['Climate exploration', 'NASA climate plus documented crop rules.'], ['Regional context', 'Also a matching municipal ZARC record.'], ['Local validation', 'Reserved for traceable field validation. Not available yet.']]
    : [['Exploração climática', 'Clima NASA mais regras documentadas da cultura.'], ['Contexto regional', 'Também há registro municipal do ZARC para a cultura.'], ['Validação local', 'Reservada para validação de campo rastreável. Ainda indisponível.']];
  return <section className="mx-auto max-w-5xl">
    <h1 className="page-title font-bold">{copy.methodTitle}</h1>
    <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">{en ? 'What goes in, how it is used, and what it cannot tell you.' : 'O que entra, como é usado e o que não dá para afirmar.'}</p>

    <h2 className="mt-10 text-2xl font-bold">{en ? 'Where the data comes from' : 'De onde vêm os dados'}</h2>
    <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{sources.map(({ icon: Icon, title, gives, limit }) => <li className="rounded-xl border border-slate-700 bg-slate-900/70 p-5" key={title}>
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200"><Icon aria-hidden="true" size={22} /></span><h3 className="font-bold">{title}</h3></div>
      <p className="mt-3 text-sm text-slate-300">{gives}</p>
      <p className="mt-3 text-sm text-amber-200"><b>{en ? 'Limit: ' : 'Limite: '}</b>{limit}</p>
    </li>)}</ul>

    <h2 className="mt-10 text-2xl font-bold">{en ? 'How it works' : 'Como funciona'}</h2>
    <ol className="mt-4 grid gap-4 md:grid-cols-3">{steps.map(([title, text], index) => <li className="rounded-xl border border-slate-700 bg-slate-900/70 p-5" key={title}><span className="font-mono text-sm font-bold text-lime-300">0{index + 1}</span><h3 className="mt-2 font-bold">{title}</h3><p className="mt-1 text-sm text-slate-300">{text}</p></li>)}</ol>

    <div className="mt-10 grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-amber-300/40 bg-amber-950/20 p-5"><h2 className="flex items-center gap-2 text-xl font-bold text-amber-100"><Ban aria-hidden="true" size={20} />{en ? 'What we do not do' : 'O que não fazemos'}</h2><ul className="mt-3 grid gap-2 text-sm text-amber-50">{nots.map((item) => <li key={item}>• {item}</li>)}</ul></section>
      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{en ? 'Evidence levels' : 'Níveis de evidência'}</h2><dl className="mt-3 grid gap-3 text-sm">{levels.map(([term, text]) => <div key={term}><dt className="font-semibold text-lime-200">{term}</dt><dd className="text-slate-300">{text}</dd></div>)}</dl></section>
    </div>
    <p className="mt-8 text-sm text-slate-400">{copy.sources}</p>
  </section>;
}
