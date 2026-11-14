import type { AnalysisResult } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';
import { cropDisplayName } from '@/lib/presentation';
import { deriveDecisionHero } from '@/lib/engine/decision-hero';
import { deriveRotationCalendar, deriveSeasonInsights, describeSeasonInsight, monthLabel, seasonCaveat } from '@/lib/engine/season';
import { relativeLowVegetationMonths } from '@/lib/climate/ndvi';
import { RELIEF_CLASSES, reliefLabel, HOTSPOT_MIN_SLOPE_PCT } from '@/lib/terrain/terrain';
import { erosivityLabel } from '@/lib/climate/erosivity';
import { buildSourceHealth, sourceGapLabel, sourceStateLabel, sourceTitle } from '@/lib/source-health';

const monthNames = { 'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] } as const;

function boundaryText(data: AnalysisResult, en: boolean): string {
  const boundary = data.boundaryAnalysis;
  if (boundary.status !== 'spatial_context') return 'N/D';
  const center = boundary.centroid ? `${en ? 'centroid' : 'centroide'} ${boundary.centroid.latitude.toFixed(5)}, ${boundary.centroid.longitude.toFixed(5)}` : null;
  const smap = boundary.smapHistorical.spatialInterpretation === 'coarser_than_boundary' ? (en ? 'smaller than one nominal 9 km SMAP cell' : 'menor que uma célula nominal de 9 km do SMAP') : en ? 'may span several nominal 9 km SMAP cells' : 'pode abranger várias células nominais de 9 km do SMAP';
  return [`${boundary.vertexCount} ${en ? 'vertices' : 'vértices'}`, `${boundary.areaHa ?? 'N/D'} ha`, center, smap, en ? 'SMAP historical series N/D (requires Earthdata preprocessing)' : 'série histórica SMAP N/D (requer pré-processamento Earthdata)'].filter(Boolean).join(' · ');
}

function waterLines(data: AnalysisResult, en: boolean): string[] {
  const point = data.input.waterPoint;
  if (!point) return [];
  const kind = { well: en ? 'well' : 'poço', river: en ? 'river' : 'rio', reservoir: en ? 'reservoir' : 'açude', other: en ? 'other' : 'outro' }[point.kind];
  return [`${en ? 'Water point declared by the producer' : 'Ponto de água informado pelo produtor'}: ${kind}${point.label ? ` — ${point.label}` : ''} (${en ? 'declared context only; not used in any reading' : 'apenas contexto declarado; não usado em nenhuma leitura'})`];
}

function decisionLines(data: AnalysisResult, locale: Locale): string[] {
  const en = locale === 'en';
  const hero = deriveDecisionHero(data);
  const month = monthNames[locale][hero.month - 1];
  const state = { attention: en ? 'attention' : 'atenção', compatible: en ? 'compatible' : 'compatível', unknown: 'N/D' }[hero.state];
  const rule = en ? 'NASA POWER median temperature vs. documented crop thermal range' : 'Temperatura mediana NASA POWER × faixa térmica documentada da cultura';
  const next = { confirm_baseline: en ? 'Confirm the baseline, then review the documented range with a local agronomist or technician.' : 'Confirme a linha de base e revise a faixa documentada com agrônomo ou técnico local.', review_with_technician: en ? 'Review the documented range with a local agronomist or technician.' : 'Revise a faixa documentada com agrônomo ou técnico local.', provide_data: en ? 'Provide the missing data or retry later; nothing was assumed to be fine.' : 'Informe o dado que falta ou tente depois; nada foi assumido como ok.' }[hero.nextCheck];
  const lines = ['', `## ${en ? 'Concrete decision' : 'Decisão concreta'}`, '', `- ${en ? 'State' : 'Estado'}: ${state}`, `- ${en ? 'Month' : 'Mês'}: ${month}`, `- ${en ? 'NASA signal' : 'Sinal NASA'}: ${hero.observedValue === null ? 'N/D' : `${hero.observedValue} ${hero.unit}`}${hero.period ? ` (${hero.period.start}–${hero.period.end})` : ''}`, `- ${en ? 'Rule' : 'Regra'}: ${rule}`, `- ${en ? 'Source' : 'Fonte'}: ${hero.sourceUrl ?? 'N/D'}`];
  for (const item of hero.items) lines.push(`- ${en ? 'Hypothesis' : 'Hipótese'} ${item.scenarioId} (${cropDisplayName(item.cropId, item.cropName, locale) || 'N/D'}): ${item.rangeC ? `${en ? 'documented range' : 'faixa documentada'} ${item.rangeC.min}–${item.rangeC.max} °C` : en ? 'no documented range (N/D)' : 'sem faixa documentada (N/D)'}`);
  if (hero.state !== 'unknown' && hero.unreadScenarioIds.length) lines.push(`- ${en ? 'No reading (not counted as compatible)' : 'Sem leitura (não conta como compatível)'}: ${hero.unreadScenarioIds.join(', ')}`);
  lines.push(`- ${en ? 'Next human check' : 'Próxima verificação humana'}: ${next}`);
  return lines;
}

function soilLines(data: AnalysisResult, en: boolean): string[] {
  const soil = data.input.soilObservation;
  if (!soil) return [];
  const labels = { waterlogging: en ? 'standing water / waterlogging' : 'água empoçada / encharcamento', compaction: en ? 'hard or compacted soil' : 'solo duro ou compactado', erosion: en ? 'erosion' : 'erosão', dry_cracked: en ? 'very dry or cracked soil' : 'solo muito seco ou rachado', salt_crust: en ? 'whitish or salty crust' : 'crosta esbranquiçada ou salina', discoloration: en ? 'stains or odd color' : 'manchas ou cor estranha', other: en ? 'other' : 'outro' };
  return [`${en ? 'Soil observation reported by the producer' : 'Observação do produtor sobre o solo'}: ${soil.kinds.map((kind) => labels[kind]).join(', ')}${soil.note ? ` — "${soil.note}"` : ''} (${en ? 'declared context only; not used in any reading; take it to a local technician' : 'apenas contexto declarado; não usado em nenhuma leitura; leve a um técnico local'})`];
}

function seasonLines(data: AnalysisResult, locale: Locale): string[] {
  const en = locale === 'en';
  const calendar = deriveRotationCalendar(data.nasaInsightByMonth);
  const balance = data.climate.waterBalanceByMonth ?? [];
  const lines = ['', `## ${en ? 'Climate window by month' : 'Janela climática por mês'}`, '', seasonCaveat(locale), ''];
  for (const insight of deriveSeasonInsights(calendar, balance, data.input.plantingMonth)) { const text = describeSeasonInsight(insight, locale); lines.push(`- **${text.title}.** ${text.detail}`); }
  if (calendar.length) {
    const head = Array.from({ length: 12 }, (_, index) => monthLabel(index + 1, locale));
    lines.push('', `### ${en ? 'Thermal calendar (✓ inside documented range, ! outside, N/D no reading; margin in °C)' : 'Calendário térmico (✓ dentro da faixa documentada, ! fora, N/D sem leitura; margem em °C)'}`, '', `| ${en ? 'Hypothesis' : 'Hipótese'} | ${head.join(' | ')} |`, `|---|${head.map(() => '---').join('|')}|`);
    for (const row of calendar) lines.push(`| ${row.scenarioId} ${cropDisplayName(row.cropId, row.cropName, locale) || 'N/D'} | ${row.cells.map((cell) => cell.state === 'unknown' ? 'N/D' : `${cell.state === 'compatible' ? '✓' : '!'} ${cell.marginC}`).join(' | ')} |`);
  }
  if (balance.some((month) => month.balanceMedianMm !== null)) {
    lines.push('', `### ${en ? 'Climate water balance (median mm: precipitation, FAO-56 ET0, difference)' : 'Balanço hídrico climático (mediana em mm: chuva, ET0 FAO-56, diferença)'}`, '', `| ${en ? 'Month' : 'Mês'} | ${en ? 'Precipitation' : 'Chuva'} | ET0 | ${en ? 'Balance' : 'Balanço'} |`, '|---|---|---|---|');
    for (const month of balance) lines.push(`| ${monthLabel(month.month, locale)} | ${month.precipMedianMm ?? 'N/D'} | ${month.et0MedianMm ?? 'N/D'} | ${month.balanceMedianMm ?? 'N/D'} |`);
  } else lines.push('', `${en ? 'Climate water balance' : 'Balanço hídrico climático'}: N/D`);
  const ndvi = data.climate.ndvi;
  if (ndvi) {
    const low = relativeLowVegetationMonths(ndvi.months);
    lines.push('', `${en ? 'MODIS NDVI (monthly median)' : 'NDVI MODIS (mediana mensal)'}: ${ndvi.months.map((month) => `${monthLabel(month.month, locale)} ${month.medianNdvi ?? 'N/D'}`).join(', ')}${low.length ? ` — ${en ? 'relative lowest months' : 'meses relativamente mais baixos'}: ${low.map((month) => monthLabel(month, locale)).join(', ')}` : ''}`);
  } else lines.push('', `${en ? 'MODIS NDVI' : 'NDVI MODIS'}: N/D`);
  return lines;
}

function terrainLines(data: AnalysisResult, locale: Locale): string[] {
  const en = locale === 'en';
  const terrain = data.terrain;
  const erosivity = data.climate.erosivity;
  const lines = ['', `## ${en ? 'Relief and erosion context' : 'Relevo e contexto de erosão'}`, ''];
  if (terrain?.status === 'available' && terrain.slopePct) {
    lines.push(`- ${en ? 'Elevation (NASA SRTM)' : 'Elevação (NASA SRTM)'}: ${terrain.elevationM ? `${terrain.elevationM.min}–${terrain.elevationM.max} m` : 'N/D'}`, `- ${en ? 'Slope mean / max' : 'Declividade média / máx.'}: ${terrain.slopePct.mean}% / ${terrain.slopePct.max}% (${terrain.mode === 'polygon' ? (en ? 'boundary' : 'polígono') : en ? 'local value around the point, about 180 m' : 'valor local em torno do ponto, cerca de 180 m'}; ${en ? 'grid' : 'malha'} ${terrain.gridSpacingM} m, ${terrain.sampledCells} ${en ? 'cells' : 'células'})`, `- ${en ? `Relief hotspots (slope ≥ ${HOTSPOT_MIN_SLOPE_PCT}%)` : `Hotspots de relevo (declividade ≥ ${HOTSPOT_MIN_SLOPE_PCT}%)`}: ${terrain.hotspots.count} ${en ? 'cells' : 'células'} (${terrain.hotspots.sharePct}%)`, `- ${en ? 'Relief classes (Embrapa)' : 'Classes de relevo (Embrapa)'}: ${RELIEF_CLASSES.map((item) => `${reliefLabel(item.id, locale)} ${terrain.classShares.find((entry) => entry.classId === item.id)?.sharePct ?? 0}%`).join('; ')}`);
  } else lines.push(`- ${en ? 'Relief (NASA SRTM)' : 'Relevo (NASA SRTM)'}: N/D`);
  lines.push(`- ${en ? 'Rainfall erosivity (Arnoldus Modified Fournier Index)' : 'Erosividade da chuva (Índice de Fournier Modificado, Arnoldus)'}: ${erosivity?.mfi !== null && erosivity?.mfi !== undefined && erosivity.classId ? `${erosivity.mfi} — ${erosivityLabel(erosivity.classId, locale)}` : 'N/D'}`, `- ${en ? 'Soil loss (RUSLE)' : 'Perda de solo (RUSLE)'}: N/D — ${en ? 'needs soil erodibility, cover/management and slope length; hotspots are relief hotspots, not soil-loss hotspots' : 'exige erodibilidade do solo, cobertura/manejo e comprimento de rampa; hotspots são de relevo, não de perda de solo'}`);
  return lines;
}

function sourceLines(data: AnalysisResult, locale: Locale): string[] {
  const en = locale === 'en';
  const lines = ['', `## ${en ? 'Source status' : 'Estado das fontes'}`, ''];
  for (const source of buildSourceHealth(data)) {
    const parts = [sourceStateLabel(source.state, locale), source.origin, source.period, source.coveragePct === null ? null : `${source.coveragePct}%`, source.cache === 'verified_fixture' ? (en ? 'verified cache' : 'cache verificado') : null, sourceGapLabel(source.gap, locale) ? `${en ? 'gap' : 'lacuna'}: ${sourceGapLabel(source.gap, locale)}` : null].filter(Boolean);
    lines.push(`- ${sourceTitle(source.id)}: ${parts.join(' · ')}`);
  }
  return lines;
}

export function buildAnalysisSummary(data: AnalysisResult, locale: Locale): string {
  const en = locale === 'en';
  const evidenceLevel = (level: string) => ({ climate_exploration: en ? 'Climate exploration' : 'Exploração climática', regionally_contextualized: en ? 'Regional context' : 'Contexto regional', locally_validated: en ? 'Traceable local validation' : 'Validação local rastreável' }[level] ?? level);
  const lines = [`# Field Shift — ${en ? 'Exploratory comparison' : 'Comparação exploratória'}`, '', `${en ? 'Location' : 'Local'}: ${data.input.location.latitude}, ${data.input.location.longitude}`, `${en ? 'Exploratory boundary' : 'Polígono exploratório'}: ${boundaryText(data, en)}`, ...waterLines(data, en), ...soilLines(data, en), `${en ? 'Planting-month climate window' : 'Mês da janela climática'}: ${data.input.plantingMonth}`, `${en ? 'Climate source' : 'Fonte climática'}: ${data.climate.provenance?.source ?? 'N/D'} (${data.climate.provenance?.period.start ?? 'N/D'}–${data.climate.provenance?.period.end ?? 'N/D'})`, ...decisionLines(data, locale), ...seasonLines(data, locale), ...terrainLines(data, locale), ...sourceLines(data, locale), '', `## ${en ? 'Scenarios' : 'Cenários'}`];
  for (const strategy of data.strategies) {
    lines.push('', `### ${strategy.id}. ${strategy.title}`, `${en ? 'Primary hypothesis' : 'Hipótese principal'}: ${strategy.proposedCrop?.name ?? 'N/D'}`, `${en ? 'Evidence level' : 'Nível de evidência'}: ${evidenceLevel(strategy.validationLevel)}`);
    for (const indicator of strategy.indicators) lines.push(`- ${indicator.label}: ${indicator.state} — ${indicator.detail}`);
    if (strategy.missingData.length) lines.push(`- ${en ? 'Missing' : 'Falta'}: ${strategy.missingData.join(', ')}`);
  }
  lines.push('', `## ${en ? 'Limits' : 'Limites'}`, ...data.evidenceManifest.guardrails.map((item) => `- ${item}`), '', data.disclaimer);
  return lines.join('\n');
}
