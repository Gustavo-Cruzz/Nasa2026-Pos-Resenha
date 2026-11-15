'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, CalendarRange, CloudRain, CloudSun, Database, Droplets, Flag, Layers, Mountain, Repeat, Scale, Thermometer, TriangleAlert, Waves } from 'lucide-react';
import { MonthlyChart, type MonthPoint } from '@/components/atlas/monthly-chart';
import { BoundarySummary, waterKindLabel } from '@/components/boundary/boundary-summary';
import { BrazilContextNote } from '@/components/brazil-context-note';
import { CropSprite } from '@/components/crops/crop-sprite';
import { EvidenceCenterTrigger } from '@/components/evidence/evidence-center';
import { useLocale } from '@/components/locale-provider';
import { ClimatePanel } from '@/components/results/climate-panel';
import { ClimateRiskLab } from '@/components/results/climate-risk-lab';
import { DataQualityPanel } from '@/components/results/data-quality-panel';
import { DecisionCards } from '@/components/results/decision-cards';
import { DecisionHero } from '@/components/results/decision-hero';
import { NasaInsightPanel } from '@/components/results/nasa-insight-panel';
import { RegionalSoilPanel } from '@/components/results/regional-soil-panel';
import { ScenarioComparisonTable } from '@/components/results/scenario-comparison-table';
import { SeasonPanel } from '@/components/results/season-panel';
import { SoilHealthComparison } from '@/components/results/soil-health-comparison';
import { SoilObservationNote } from '@/components/results/soil-observation-note';
import { TerrainPanel } from '@/components/results/terrain-panel';
import { CroppingSystemsSummary, DecisionSummary, RegionalContextDetails, StrategyCards } from '@/components/results/results-details';
import { KpiTile, Meter, MonthStrip, RangeGauge, StackedBar, TechDetails, WaterVisual, MONTH_NAMES } from '@/components/results/visuals';
import type { BlockId } from '@/components/results/block-comments';
import { Chip, type Tone } from '@/components/results2/drawer';
import type { BlockComment } from '@/components/results3/joao-guide';
import { deriveDecisionHero } from '@/lib/engine/decision-hero';
import type { AnalysisResult, Rotation } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';
import { cropDisplayName, scenarioDisplayTitle } from '@/lib/presentation';
import { buildSourceHealth, sourceGapLabel, sourceStateLabel, sourceTitle } from '@/lib/source-health';
import { HOTSPOT_MIN_SLOPE_PCT } from '@/lib/terrain/terrain';

export type Block = { id: BlockId; title: string; takeaway: string; status: string; tone: Tone; icon: ReactNode; body: ReactNode; comment: BlockComment };

const fmt = (value: number | null | undefined, locale: Locale, unit = '', digits = 1) => value === null || value === undefined ? 'N/D' : `${new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: digits }).format(value)}${unit}`;
const observationLabels = (locale: Locale): Record<string, string> => locale === 'en' ? { waterlogging: 'standing water', compaction: 'compacted soil', erosion: 'erosion', dry_cracked: 'dry, cracked soil', salt_crust: 'salt crust', discoloration: 'colour change', other: 'other observation' } : { waterlogging: 'água empoçada', compaction: 'solo compactado', erosion: 'erosão', dry_cracked: 'solo seco e rachado', salt_crust: 'crosta de sais', discoloration: 'mudança de cor', other: 'outra observação' };

function scenarioTone(strategy: Rotation): Tone { return strategy.unavailable || strategy.indicators.some((item) => item.state === 'attention') ? 'attention' : strategy.indicators.every((item) => item.state === 'unknown') ? 'info' : 'ok'; }
function scenarioStatus(strategy: Rotation, en: boolean): string { return strategy.unavailable ? (en ? 'Unavailable' : 'Indisponível') : strategy.indicators.some((item) => item.state === 'attention') ? (en ? 'Needs attention' : 'Pede atenção') : strategy.indicators.some((item) => item.state === 'compatible' || item.state === 'yes') ? (en ? 'Has evidence' : 'Tem evidência') : (en ? 'Partial data' : 'Dados parciais'); }

export function buildBlocks(data: AnalysisResult, comments: Record<BlockId, BlockComment>, locale: Locale): Block[] {
  const en = locale === 'en';
  const names = MONTH_NAMES[locale];
  const hero = deriveDecisionHero(data);
  const balance = Array.from({ length: 12 }, (_, index) => data.climate.waterBalanceByMonth?.find((item) => item.month === index + 1)?.balanceMedianMm ?? null);
  const knownBalance = balance.filter((value): value is number => value !== null);
  const below = knownBalance.filter((value) => value < 0).length;
  const rainy = data.climate.seasonality?.rainySeason ?? null;
  const points: MonthPoint[] = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, rainMm: data.climate.historicalPrecipitationByMonth.find((item) => item.month === index + 1)?.medianTotalMm ?? null, tempC: data.climate.monthly.find((item) => item.month === index + 1)?.tmeanMedianC ?? null }));
  const available = data.climate.status === 'available';
  const terrain = data.terrain?.status === 'available' ? data.terrain : null;
  const health = buildSourceHealth(data);
  const healthOk = health.filter((item) => item.state === 'available' || item.state === 'cache_verified').length;
  const heroTone: Tone = hero.state === 'attention' ? 'attention' : hero.state === 'compatible' ? 'ok' : 'info';
  const heroLabel = hero.state === 'attention' ? (en ? 'Attention' : 'Atenção') : hero.state === 'compatible' ? (en ? 'Compatible' : 'Compatível') : 'N/D';
  const latest = data.input.history.at(-1);
  const state = (status: string, tone: Tone) => ({ status, tone });
  const soilAvailable = data.soilContext?.status === 'available';
  return [
    { id: 'glance', title: en ? 'Decision at a glance' : 'Decisão num relance', takeaway: en ? 'The NASA temperature for the planting month against each crop’s documented range.' : 'A temperatura NASA do mês de plantio diante da faixa documentada de cada cultura.', ...state(heroLabel, heroTone), icon: <Activity size={24} />, comment: comments.glance, body: <Glance data={data} /> },
    { id: 'scenarios', title: en ? 'Scenarios A, B and C' : 'Cenários A, B e C', takeaway: en ? 'Three hypotheses to compare, not a ranking of success.' : 'Três hipóteses para comparar, não um ranking de sucesso.', ...state(en ? '3 scenarios' : '3 cenários', 'info'), icon: <Database size={24} />, comment: comments.scenarios, body: <Scenarios data={data} /> },
    { id: 'climate', title: en ? 'Rain and temperature' : 'Chuva e temperatura', takeaway: available ? (en ? 'Monthly NASA POWER history, 2011 to 2025.' : 'Histórico mensal NASA POWER de 2011 a 2025.') : (en ? 'Historical climate unavailable.' : 'Clima histórico indisponível.'), ...state(available ? (en ? 'Available' : 'Disponível') : 'N/D', available ? 'ok' : 'attention'), icon: <CloudSun size={24} />, comment: comments.climate, body: (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile icon={<CloudRain size={14} />} label={en ? 'Rain, planting month' : 'Chuva no mês de plantio'} sub={names[data.input.plantingMonth - 1]} tone={data.climate.plantingMonthPrecipitation?.medianTotalMm == null ? 'info' : 'ok'} unit="mm" value={fmt(data.climate.plantingMonthPrecipitation?.medianTotalMm, locale, '', 0)} />
          <KpiTile icon={<Thermometer size={14} />} label={en ? 'Temperature, planting month' : 'Temperatura no mês de plantio'} sub={en ? 'daily mean, median' : 'média diária, mediana'} tone={points[data.input.plantingMonth - 1].tempC === null ? 'info' : 'ok'} unit="°C" value={fmt(points[data.input.plantingMonth - 1].tempC, locale)} />
          <KpiTile icon={<Waves size={14} />} label={en ? 'Wettest month' : 'Mês mais chuvoso'} sub={extreme(points.map((p) => p.rainMm), 'max', 'mm')} tone="ok" value={extremeName(points.map((p) => p.rainMm), 'max', names)} />
          <KpiTile icon={<Thermometer size={14} />} label={en ? 'Warmest month' : 'Mês mais quente'} sub={extreme(points.map((p) => p.tempC), 'max', '°C')} tone="ok" value={extremeName(points.map((p) => p.tempC), 'max', names)} />
        </div>
        <div className="mt-5"><MonthlyChart currentMonth={data.input.plantingMonth} history={en ? 'median 2011–2025' : 'mediana 2011–2025'} points={points} /></div>
        <TechDetails technical={false} title={en ? 'Climate and regional technical details' : 'Detalhes técnicos de clima e contexto regional'}><RegionalContextDetails data={data} /><ClimatePanel climate={data.climate} plantingMonth={data.input.plantingMonth} /></TechDetails>
        <TechDetails title={en ? 'Climate Risk Lab (forecast and dry spells)' : 'Climate Risk Lab (previsão e estiagem)'}><ClimateRiskLab location={data.input.location} /></TechDetails>
      </>
    ) },
    { id: 'water', title: en ? 'Rain minus ET₀' : 'Chuva menos ET₀', takeaway: en ? 'Bars show a monthly climate indicator, not crop water use.' : 'Barras mostram um indicador climático mensal.', ...state(knownBalance.length ? (en ? `${below} of ${knownBalance.length} months below` : `${below} de ${knownBalance.length} meses abaixo`) : 'N/D', knownBalance.length ? 'info' : 'attention'), icon: <Droplets size={24} />, comment: comments.water, body: knownBalance.length ? (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KpiTile fill={below / knownBalance.length} icon={<Scale size={14} />} label={en ? 'Months with ET₀ above rain' : 'Meses com ET₀ acima da chuva'} sub={en ? `of ${knownBalance.length} calculated` : `de ${knownBalance.length} calculados`} tone={below ? 'attention' : 'ok'} value={`${below}`} />
          <KpiTile icon={<Droplets size={14} />} label={en ? 'Largest surplus' : 'Maior sobra'} sub={extremeBalance(balance, 'max', names)} tone="ok" unit="mm" value={fmt(Math.max(...knownBalance), locale, '', 0)} />
          <KpiTile icon={<Droplets size={14} />} label={en ? 'Largest shortfall' : 'Maior falta'} sub={extremeBalance(balance, 'min', names)} tone="attention" unit="mm" value={fmt(Math.min(...knownBalance), locale, '', 0)} />
        </div>
        <div className="mt-5"><WaterVisual balance={balance} /></div>
        <p className="mt-3 rounded-lg bg-slate-950/50 p-3 text-xs text-slate-300">{en ? 'ET₀ is FAO-56 reference evapotranspiration: an estimate of the water the climate can pull from soil and plants. This is a climate indicator only; it does not calculate crop water use or irrigation need.' : 'ET₀ é a evapotranspiração de referência FAO-56: uma estimativa da água que o clima pode retirar do solo e das plantas. É só um indicador climático; não calcula consumo da cultura nem necessidade de irrigação.'}</p>
        <TechDetails title={en ? 'Table of monthly values' : 'Tabela de valores mensais'}><div className="overflow-x-auto"><table className="w-full min-w-[28rem] text-left text-xs"><caption className="sr-only">{en ? 'Monthly median rain, reference ET0 and their difference, in millimetres' : 'Chuva mediana mensal, ET0 de referência e a diferença, em milímetros'}</caption><thead><tr className="text-slate-400"><th className="p-1.5" scope="col">{en ? 'Month' : 'Mês'}</th><th className="p-1.5" scope="col">{en ? 'Rain (mm)' : 'Chuva (mm)'}</th><th className="p-1.5" scope="col">ET₀ (mm)</th><th className="p-1.5" scope="col">{en ? 'Rain − ET₀ (mm)' : 'Chuva − ET₀ (mm)'}</th></tr></thead><tbody>{Array.from({ length: 12 }, (_, index) => { const item = data.climate.waterBalanceByMonth?.find((entry) => entry.month === index + 1); return <tr className="border-t border-slate-800" key={index}><th className="p-1.5 font-semibold" scope="row">{names[index]}</th><td className="p-1.5">{fmt(item?.precipMedianMm, locale)}</td><td className="p-1.5">{fmt(item?.et0MedianMm, locale)}</td><td className="p-1.5">{fmt(item?.balanceMedianMm, locale)}</td></tr>; })}</tbody></table></div></TechDetails>
      </>
    ) : <Unavailable /> },
    { id: 'calendar', title: en ? 'Season and calendar' : 'Estação e calendário', takeaway: en ? 'Which months the history shows as rainy, and how the climate window moves.' : 'Quais meses o histórico mostra como chuvosos e como a janela climática se move.', ...state(rainy ? `${names[rainy.startMonth - 1]}–${names[rainy.endMonth - 1]}` : 'N/D', rainy ? 'ok' : 'info'), icon: <CalendarRange size={24} />, comment: comments.calendar, body: (
      <>
        <MonthStrip ariaLabel={en ? 'Rainy season by month' : 'Estação chuvosa por mês'} cells={Array.from({ length: 12 }, (_, index) => ({ state: !rainy ? 'nd' : rainy.months.includes(index + 1) ? 'on' : 'off' }))} ndLabel={en ? 'not identified (N/D)' : 'não identificado (N/D)'} offLabel={en ? 'outside the rainy season' : 'fora da estação chuvosa'} onLabel={en ? 'rainy season' : 'estação chuvosa'} ring={data.input.plantingMonth} />
        <p className="mt-3 text-xs text-slate-400">{en ? 'Rainy season = the longest run of months whose median rain is above median ET₀.' : 'Estação chuvosa = a maior sequência de meses em que a chuva mediana supera a ET₀ mediana.'}</p>
        <TechDetails title={en ? 'Climate window by month, vegetation and NASA Insight' : 'Janela climática por mês, vegetação e NASA Insight'}><SeasonPanel data={data} /><NasaInsightPanel initialMonth={data.input.plantingMonth} insights={data.nasaInsightByMonth} /></TechDetails>
      </>
    ) },
    { id: 'soil', title: en ? 'Soil context' : 'Contexto do solo', takeaway: data.input.soil ? (en ? 'Values reported by the producer.' : 'Dados informados pelo produtor.') : (en ? 'Regional estimate; not a soil test of the field.' : 'Estimativa regional; não é análise do talhão.'), ...state(soilAvailable ? (en ? 'Available' : 'Disponível') : (en ? 'Partial' : 'Parcial'), data.input.soilObservation ? 'attention' : 'info'), icon: <Layers size={24} />, comment: comments.soil, body: (
      <>
        <SoilVisual data={data} />
        {data.input.soilObservation ? <SoilObservationNote observation={data.input.soilObservation} /> : null}
        <TechDetails title={en ? 'Soil context in detail and soil-health comparison' : 'Contexto do solo em detalhe e comparação de saúde do solo'}><RegionalSoilPanel context={data.soilContext} /><SoilHealthComparison strategies={data.strategies} /></TechDetails>
      </>
    ) },
    { id: 'terrain', title: en ? 'Relief and boundary' : 'Relevo e polígono', takeaway: terrain ? (en ? 'Slope derived from NASA SRTM samples.' : 'Inclinação derivada de amostras NASA SRTM.') : (en ? 'Relief unavailable.' : 'Relevo indisponível.'), ...state(terrain ? `${fmt(terrain.slopePct?.mean, locale, '%')} ${en ? 'mean' : 'média'}` : 'N/D', terrain && terrain.hotspots.sharePct > 0 ? 'attention' : 'info'), icon: <Mountain size={24} />, comment: comments.terrain, body: (
      <>
        {terrain ? <TerrainVisual data={data} /> : <Unavailable />}
        {data.input.fieldBoundary ? <div className="mt-5"><h3 className="mb-2 font-bold">{en ? 'Boundary in the analysis' : 'Polígono na análise'}</h3><BoundarySummary boundary={data.input.fieldBoundary} waterPoint={data.input.waterPoint} /></div> : data.input.waterPoint ? <p className="mt-5 text-sm text-slate-300"><b>{en ? 'Water point declared by the producer' : 'Ponto de água informado pelo produtor'}:</b> {waterKindLabel(data.input.waterPoint.kind, en)}{data.input.waterPoint.label ? ` — ${data.input.waterPoint.label}` : ''}. {en ? 'Declared context only.' : 'Apenas contexto declarado.'}</p> : null}
        <TechDetails title={en ? 'Relief classes, erosivity and sources' : 'Classes de relevo, erosividade e fontes'}><TerrainPanel data={data} /></TechDetails>
      </>
    ) },
    { id: 'rotation', title: en ? 'Rotation and cropping systems' : 'Rotação e sistemas de cultivo', takeaway: en ? 'What you grew, and the hypotheses that follow it.' : 'O que você cultivou e as hipóteses que vêm depois.', ...state(en ? `${data.input.history.length} record(s)` : `${data.input.history.length} registro(s)`, 'info'), icon: <Repeat size={24} />, comment: comments.rotation, body: (
      <>
        <RotationVisual data={data} latestCrop={latest ? cropDisplayName(latest.cropId, latest.otherLabel, locale) : 'N/D'} />
        <TechDetails title={en ? 'Declared cropping systems' : 'Sistemas de cultivo declarados'}><CroppingSystemsSummary data={data} />{data.strategies[0]?.croppingSystems.length ? null : <p className="mt-3 text-sm text-slate-300">{en ? 'No cropping system was declared.' : 'Nenhum sistema de cultivo foi declarado.'}</p>}</TechDetails>
        <TechDetails title={en ? 'Per-scenario detail: validation level, sequence, reasons and gaps' : 'Detalhe por cenário: nível de validação, sequência, motivos e lacunas'}><StrategyCards data={data} /></TechDetails>
      </>
    ) },
    { id: 'quality', title: en ? 'Data quality and sources' : 'Qualidade dos dados e fontes', takeaway: en ? 'Where each piece of data came from, and how complete it is.' : 'De onde veio cada dado e quão completo ele está.', ...state(`${healthOk}/${health.length} ${en ? 'sources' : 'fontes'}`, healthOk === health.length ? 'ok' : 'attention'), icon: <Flag size={24} />, comment: comments.quality, body: (
      <>
        <SourcesVisual data={data} />
        <div className="mt-5"><BrazilContextNote context={data.regionalContext} /></div>
        {data.evidenceManifest ? <div className="mt-4"><EvidenceCenterTrigger manifest={data.evidenceManifest} /></div> : null}
        <TechDetails title={en ? 'Data status and derivations' : 'Status e derivações dos dados'}><DataQualityPanel records={data.dataQuality} /></TechDetails>
      </>
    ) },
    { id: 'next', title: en ? 'Next steps' : 'Próximos passos', takeaway: en ? 'What we know, what is missing, and who to ask.' : 'O que sabemos, o que falta e a quem perguntar.', ...state(en ? 'Review' : 'Revisão', 'info'), icon: <ArrowRight size={24} />, comment: comments.next, body: (
      <>
        <DecisionSummary data={data} />
        <div className="mt-4 flex flex-wrap gap-3"><Link className="rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold" href="/methodology">{en ? 'See the methodology' : 'Ver metodologia'}</Link></div>
      </>
    ) },
  ];
}

function extreme(values: Array<number | null>, kind: 'max' | 'min', unit: string): string | undefined {
  const known = values.flatMap((value, index) => value === null ? [] : [{ value, index }]);
  if (!known.length) return undefined;
  const best = known.reduce((a, b) => (kind === 'max' ? b.value > a.value : b.value < a.value) ? b : a);
  return `${Math.round(best.value * 10) / 10} ${unit}`;
}
function extremeName(values: Array<number | null>, kind: 'max' | 'min', names: readonly string[]): string {
  const known = values.flatMap((value, index) => value === null ? [] : [{ value, index }]);
  if (!known.length) return 'N/D';
  return names[known.reduce((a, b) => (kind === 'max' ? b.value > a.value : b.value < a.value) ? b : a).index];
}
function extremeBalance(balance: Array<number | null>, kind: 'max' | 'min', names: readonly string[]): string { return extremeName(balance, kind, names); }

function Unavailable() { const en = useLocale().locale === 'en'; return <p className="flex items-center gap-2 rounded-lg bg-slate-950/50 p-4 text-sm text-slate-400"><TriangleAlert aria-hidden="true" className="shrink-0 text-slate-500" size={16} />{en ? 'Data not available; no estimate was made up.' : 'Dado não disponível; nenhuma estimativa foi inventada.'}</p>; }

function Glance({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const hero = useMemo(() => deriveDecisionHero(data), [data]);
  const names = MONTH_NAMES[locale];
  const balance = (data.climate.waterBalanceByMonth ?? []).map((item) => item.balanceMedianMm).filter((value): value is number => value !== null);
  const inside = hero.items.filter((item) => item.state === 'compatible').length;
  const tone: Tone = hero.state === 'attention' ? 'attention' : hero.state === 'compatible' ? 'ok' : 'info';
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile icon={<CalendarRange size={14} />} label={en ? 'Planting month' : 'Mês de plantio'} sub={en ? 'reading month' : 'mês de leitura'} value={names[hero.month - 1]} />
      <KpiTile icon={<Thermometer size={14} />} label={en ? 'NASA signal' : 'Sinal NASA'} sub={hero.period ? `${hero.period.start}–${hero.period.end}` : undefined} tone={hero.observedValue === null ? 'info' : 'ok'} unit={hero.unit ?? ''} value={fmt(hero.observedValue, locale)} />
      <KpiTile fill={hero.items.length ? inside / hero.items.length : null} icon={<Activity size={14} />} label={en ? 'Inside documented range' : 'Dentro da faixa documentada'} sub={en ? `of ${hero.items.length} scenario crops` : `de ${hero.items.length} culturas dos cenários`} tone={tone} value={hero.items.length ? `${inside}` : 'N/D'} />
      <KpiTile fill={balance.length ? balance.filter((value) => value < 0).length / balance.length : null} icon={<Droplets size={14} />} label={en ? 'Months with ET₀ above rain' : 'Meses com ET₀ acima da chuva'} sub={balance.length ? (en ? `of ${balance.length} calculated` : `de ${balance.length} calculados`) : undefined} tone={balance.some((value) => value < 0) ? 'attention' : 'info'} value={balance.length ? `${balance.filter((value) => value < 0).length}` : 'N/D'} />
    </div>
    {hero.items.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{hero.items.map((item) => { const name = cropDisplayName(item.cropId, item.cropName, locale) || 'N/D'; return <RangeGauge key={item.scenarioId} label={`${item.scenarioId} · ${name}`} range={item.rangeC} sprite={item.cropId ? <CropSprite cropId={item.cropId} name={name} size={28} /> : undefined} unit="°C" value={item.evaluatedMonth !== undefined ? item.observedValueC : hero.observedValue} />; })}</div> : null}
    <DecisionHero data={data} />
  </>;
}

function Scenarios({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  return <>
    <ul className="grid gap-3 sm:grid-cols-3">{data.strategies.map((strategy) => {
      const name = cropDisplayName(strategy.proposedCrop?.cropId, strategy.proposedCrop?.name, locale);
      const good = strategy.indicators.filter((item) => item.state === 'compatible' || item.state === 'yes' || item.state === 'observed').length;
      const attention = strategy.indicators.filter((item) => item.state === 'attention').length;
      const unknown = strategy.indicators.length - good - attention;
      return <li className="rounded-xl border border-slate-700 bg-slate-950/40 p-3" key={strategy.id}>
        <div className="flex items-center justify-between gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-lg font-extrabold text-lime-200">{strategy.id}</span><Chip tone={scenarioTone(strategy)}>{scenarioStatus(strategy, en)}</Chip></div>
        <div className="mt-3 flex items-center gap-3">{strategy.proposedCrop ? <CropSprite cropId={strategy.proposedCrop.cropId} name={name} size={56} /> : null}<div className="min-w-0"><p className="font-bold leading-tight">{strategy.proposedCrop ? name : (en ? 'No crop defined' : 'Sem cultura definida')}</p><p className="mt-0.5 text-xs text-slate-400">{scenarioDisplayTitle(strategy, locale)}</p></div></div>
        <div aria-label={en ? `${good} compatible or present, ${attention} attention, ${unknown} unknown indicators` : `${good} indicadores compatíveis ou presentes, ${attention} em atenção, ${unknown} desconhecidos`} className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-800" role="img">{[[good, 'bg-cyan-300'], [attention, 'bg-amber-300'], [unknown, 'bg-slate-500']].map(([count, cls]) => Number(count) > 0 ? <span className={`h-full ${cls}`} key={cls as string} style={{ width: `${(Number(count) / Math.max(1, strategy.indicators.length)) * 100}%` }} /> : null)}</div>
        <p className="mt-1.5 text-xs text-slate-300"><span className="text-cyan-200">{good}</span> · <span className="text-amber-200">{attention}</span> · <span className="text-slate-400">{unknown}</span> · {strategy.missingData.length} {en ? 'gap(s)' : 'lacuna(s)'}</p>
      </li>;
    })}</ul>
    <p className="mt-2 text-xs text-slate-400"><i aria-hidden="true" className="mr-1 inline-block h-2 w-2 rounded-sm bg-cyan-300 align-middle" />{en ? 'compatible or present' : 'compatível ou presente'} <i aria-hidden="true" className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-amber-300 align-middle" />{en ? 'attention' : 'atenção'} <i aria-hidden="true" className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-slate-500 align-middle" />{en ? 'unknown' : 'desconhecido'}</p>
    <DecisionCards data={data} />
    <ScenarioComparisonTable data={data} />
  </>;
}

function SoilVisual({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const staticSoil = data.soilContext?.staticProfile.status === 'available' ? data.soilContext.staticProfile.attributes : null;
  const farmer = Boolean(data.input.soil);
  const ph = data.input.soil?.ph ?? staticSoil?.phh2o.value ?? null;
  const carbon = data.input.soil?.organicCarbonGKg ?? staticSoil?.soc.value ?? null;
  const sand = data.input.soil?.sandPct ?? staticSoil?.sand.value ?? null;
  const silt = data.input.soil?.siltPct ?? staticSoil?.silt.value ?? null;
  const clay = data.input.soil?.clayPct ?? staticSoil?.clay.value ?? null;
  const texture = [{ label: en ? 'Sand' : 'Areia', value: sand, tone: 'sand' as const }, { label: en ? 'Silt' : 'Silte', value: silt, tone: 'silt' as const }, { label: en ? 'Clay' : 'Argila', value: clay, tone: 'clay' as const }].filter((item): item is { label: string; value: number; tone: 'sand' | 'silt' | 'clay' } => item.value !== null);
  const observations = observationLabels(locale);
  return <div className="grid gap-5 lg:grid-cols-2">
    <div className="grid gap-4">
      <p className="text-xs text-slate-400"><Chip tone="info">{farmer ? (en ? 'Reported by the producer' : 'Informado pelo produtor') : (en ? 'Regional estimate' : 'Estimativa regional')}</Chip></p>
      <Meter display={fmt(ph, locale)} domain={[3.5, 9]} label={en ? 'pH in water' : 'pH em água'} ticks={[4, 5, 6, 7, 8, 9]} value={ph} zones={[{ from: 3.5, to: 7, className: 'bg-slate-600', label: en ? 'acidic (< 7)' : 'ácido (< 7)' }, { from: 7, to: 9, className: 'bg-slate-400', label: en ? 'alkaline (> 7)' : 'alcalino (> 7)' }]} />
    </div>
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3"><KpiTile label={en ? 'Organic carbon' : 'Carbono orgânico'} tone={carbon === null ? 'info' : 'ok'} unit="g/kg" value={fmt(carbon, locale)} /><KpiTile label={en ? 'Soil texture' : 'Textura'} sub={texture.length ? undefined : (en ? 'not available' : 'indisponível')} value={texture.length ? `${texture.length}/3` : 'N/D'} /></div>
      {texture.length ? <StackedBar ariaLabel={en ? 'Soil texture' : 'Textura do solo'} segments={texture} unit="%" /> : null}
    </div>
    {data.input.soilObservation ? <p className="text-sm text-amber-100 lg:col-span-2"><b>{en ? 'Producer report' : 'Relato do produtor'}:</b> {data.input.soilObservation.kinds.map((item) => observations[item] ?? item).join(', ')}.</p> : null}
  </div>;
}

function TerrainVisual({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const terrain = data.terrain;
  if (!terrain || terrain.status !== 'available' || !terrain.slopePct) return <Unavailable />;
  const top = Math.max(30, Math.ceil(terrain.slopePct.max / 5) * 5);
  return <>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiTile icon={<Mountain size={14} />} label={en ? 'Mean slope' : 'Inclinação média'} tone="ok" unit="%" value={fmt(terrain.slopePct.mean, locale)} />
      <KpiTile icon={<Mountain size={14} />} label={en ? 'Maximum slope' : 'Inclinação máxima'} tone="ok" unit="%" value={fmt(terrain.slopePct.max, locale)} />
      <KpiTile fill={terrain.hotspots.sharePct / 100} icon={<TriangleAlert size={14} />} label={en ? `Samples ≥ ${terrain.hotspots.minSlopePct}%` : `Amostras ≥ ${terrain.hotspots.minSlopePct}%`} tone={terrain.hotspots.sharePct > 0 ? 'attention' : 'ok'} unit="%" value={fmt(terrain.hotspots.sharePct, locale)} />
      <KpiTile icon={<Layers size={14} />} label={en ? 'Elevation range' : 'Faixa de altitude'} sub={terrain.elevationM ? `${fmt(terrain.elevationM.min, locale, '', 0)}–${fmt(terrain.elevationM.max, locale, '', 0)} m` : undefined} unit="m" value={fmt(terrain.elevationM?.mean, locale, '', 0)} />
    </div>
    <div className="mt-5"><Meter display={`${fmt(terrain.slopePct.mean, locale)}% ${en ? 'mean' : 'média'}`} domain={[0, top]} label={en ? 'Mean slope on the sampled grid' : 'Inclinação média na grade amostrada'} ticks={[0, Math.round(top / 2), top]} value={terrain.slopePct.mean} zones={[{ from: 0, to: HOTSPOT_MIN_SLOPE_PCT, className: 'bg-slate-600', label: en ? `below ${HOTSPOT_MIN_SLOPE_PCT}%` : `abaixo de ${HOTSPOT_MIN_SLOPE_PCT}%` }, { from: HOTSPOT_MIN_SLOPE_PCT, to: top, className: 'bg-amber-300/70', label: en ? `${HOTSPOT_MIN_SLOPE_PCT}% or more (steeper)` : `${HOTSPOT_MIN_SLOPE_PCT}% ou mais (mais íngreme)` }]} /></div>
  </>;
}

function RotationVisual({ data, latestCrop }: { data: AnalysisResult; latestCrop: string }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const history = data.input.history;
  const labels = { en: { highlights: 'Highlighted priorities', before: 'You grew', after: 'Hypotheses', assumed: 'Assumed continuation — confirm it', last: 'Last crop' }, 'pt-BR': { highlights: 'Prioridades em destaque', before: 'Você cultivou', after: 'Hipóteses', assumed: 'Continuação presumida — confirmar', last: 'Último cultivo' } }[locale];
  const priorityLabels: Record<string, string> = en ? { root_zone_wetness: 'root-zone water context', cover_potential: 'cover potential', functional_diversity: 'functional diversity' } : { root_zone_wetness: 'contexto hídrico da zona radicular', cover_potential: 'potencial de cobertura', functional_diversity: 'diversidade funcional' };
  return <>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{labels.before}</p>
    <ol className="mt-2 flex gap-2 overflow-x-auto pb-1">{history.map((item) => { const name = cropDisplayName(item.cropId, item.otherLabel, locale); return <li className="flex min-w-[6.5rem] flex-col items-center rounded-xl border border-slate-700 bg-slate-950/40 p-2.5 text-center" key={`${item.startYearMonth}-${item.endYearMonth}`}><CropSprite cropId={item.cropId ?? 'unknown'} name={name} size={44} /><b className="mt-1 text-sm">{name}</b><span className="text-[11px] text-slate-400">{item.startYearMonth} → {item.endYearMonth}</span></li>; })}
      <li aria-hidden="true" className="grid shrink-0 place-items-center text-slate-500"><ArrowRight size={22} /></li></ol>
    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">{labels.after}</p>
    <ol className="mt-2 grid gap-2 sm:grid-cols-3">{data.strategies.map((strategy) => { const name = cropDisplayName(strategy.proposedCrop?.cropId, strategy.proposedCrop?.name, locale); return <li className="flex items-center gap-3 rounded-xl border border-cyan-300/30 bg-slate-950/40 p-2.5" key={strategy.id}>{strategy.proposedCrop ? <CropSprite cropId={strategy.proposedCrop.cropId} name={name} size={44} /> : <span aria-hidden="true" className="grid h-11 w-11 place-items-center text-slate-500">–</span>}<div className="min-w-0 text-sm"><b>{strategy.id} · {strategy.proposedCrop ? name : 'N/D'}</b><span className="block text-xs text-slate-400">{strategy.baselineAssumed ? labels.assumed : scenarioDisplayTitle(strategy, locale)}</span></div></li>; })}</ol>
    <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-300"><b>{labels.highlights}:</b>{data.priorityHighlights.length ? data.priorityHighlights.map((id) => <Chip key={id} tone="info">{priorityLabels[id] ?? id}</Chip>) : 'N/D'}<span className="sr-only">{labels.last}: {latestCrop}</span></p>
  </>;
}

function SourcesVisual({ data }: { data: AnalysisResult }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const health = buildSourceHealth(data);
  const count = (...states: Array<(typeof health)[number]['state']>) => health.filter((item) => states.includes(item.state)).length;
  const mark = { available: 'border-cyan-300/60', cache_verified: 'border-cyan-300/60', partial: 'border-amber-300/60', nd: 'border-slate-600' } as const;
  return <>
    <StackedBar ariaLabel={en ? 'Data sources by state' : 'Fontes de dados por estado'} segments={[{ label: en ? 'available' : 'disponível', value: count('available', 'cache_verified'), tone: 'cyan' }, { label: en ? 'partial' : 'parcial', value: count('partial'), tone: 'amber' }, { label: 'N/D', value: count('nd'), tone: 'slate' }]} />
    <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{health.map((item) => <li className={`rounded-lg border bg-slate-950/40 p-2.5 text-xs ${mark[item.state]}`} key={item.id}>
      <p className="font-bold text-slate-100">{sourceTitle(item.id)}</p><p className="text-slate-300">{sourceStateLabel(item.state, locale)}</p>
      {item.coveragePct !== null ? <div className="mt-1.5"><div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min(100, item.coveragePct)}%` }} /></div><p className="mt-1 text-slate-400">{en ? 'coverage' : 'cobertura'} {fmt(item.coveragePct, locale, '%', 0)}</p></div> : null}
      {item.period ? <p className="mt-1 font-mono text-[11px] text-slate-400">{item.period}</p> : null}
      {item.gap ? <p className="mt-1 text-amber-100">{sourceGapLabel(item.gap, locale)}</p> : null}
    </li>)}</ul>
  </>;
}
