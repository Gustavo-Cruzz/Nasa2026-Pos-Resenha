import type { Locale } from '@/lib/i18n';
import type { CycleWeather, EvidenceLevel, MonthWeather } from '@/lib/future-farm/types';

const nd = 'N/D';
const fmt = (value: number | null, digits = 0) => value === null || value === undefined ? nd : String(Number(value.toFixed(digits))).replace('-', '−');
const signed = (value: number | null) => value === null || value === undefined ? nd : `${value > 0 ? '+' : ''}${fmt(value)}`;
function detail(m: MonthWeather, c: { weatherName: Record<CycleWeather, string>; monthName: string[]; rainDaysLabel: string; tmaxLabel: string }): string {
  const days = m.rainDays === null ? nd : fmt(m.rainDays);
  return `${c.monthName[m.month - 1]} · ${c.weatherName[m.weather]} · P−ET0 ${signed(m.balanceMm)} mm · ${days} ${c.rainDaysLabel} · ${c.tmaxLabel} ${fmt(m.tmaxC)} °C`;
}

const pt = {
  rainDaysLabel: 'dias de chuva', tmaxLabel: 'Tmáx',
  purposes: { commercial: 'produção comercial', cover: 'cobertura do solo', forage: 'forragem' } as Record<string, string>,
  slotMissing: { crop: 'cultura definida', temperature: 'faixa térmica documentada', cycle: 'duração do ciclo documentada', soil_ph: 'pH informado ou faixa verificável', previous_crop_family: 'família da cultura anterior' } as Record<string, string>,
  scenarioMissing: { cycle_duration: 'duração documentada', eligible_crop: 'cultura com critérios mínimos', historical_climate: 'clima histórico', documented_temperature_range: 'faixa térmica documentada', soil_ph_or_verified_range: 'pH informado ou faixa verificável', unconfigured_lab_slots: 'etapas ainda não configuradas', futureBaseline: 'plano futuro confirmado' } as Record<string, string>,
  evidenceLevel: { climate_exploration: 'Exploração climática', regionally_contextualized: 'Contexto regional disponível', locally_validated: 'Validação local rastreável' } as Record<EvidenceLevel, string>,
  unknownCrop: 'Cultura não identificada no catálogo',
  knownRisk: 'Risco catalogado',
  staleEvidence: 'Esta etapa foi alterada depois da última análise. A cena já mostra a cultura escolhida; reabra a comparação para recalcular indicadores e evidências.',
  intercrop: (plot: string, period: string, names: string) => `Consórcio declarado “${plot}” (${period}) com ${names}. A cena alterna linhas apenas de forma esquemática: não representa proporção, espaçamento, competição nem recomendação de arranjo; a etapa exata do consórcio não é inferida das datas.`,
  attention: 'Atenção',
  zarcIndicated: (risk: string) => `ZARC (MAPA): época indicada${risk}`,
  zarcNotIndicated: 'ZARC (MAPA): época não indicada para esta cultura no município',
  zarcUnknown: 'ZARC (MAPA): sem leitura para esta cultura e época',
  waterSurplus: (mm: string) => `Chuva acima da evaporação na janela: P−ET0 de ${mm} mm (mediana histórica)`,
  waterDeficit: (mm: string) => `Déficit hídrico climático na janela: P−ET0 de ${mm} mm (mediana histórica; não é necessidade de irrigação)`,
  waterNeutral: (mm: string) => `Balanço P−ET0 próximo do neutro na janela: ${mm} mm`,
  waterNd: 'Balanço P−ET0 da janela: N/D',
  frostObserved: 'Sem anos com geada de triagem (Tmín ≤ 2 °C) na janela',
  frostUnknown: 'Risco de geada na janela: N/D',
  weatherCaption: {
    storm: 'Cena com tempestade: mês muito chuvoso e com muitos dias de chuva (clima histórico NASA, medianas; não é previsão).',
    rain: 'Cena com chuva: P−ET0 positivo no mês (clima histórico NASA, medianas; não é previsão).',
    cloudy: 'Cena nublada: muitos dias de chuva ou pouca radiação solar no mês (clima histórico NASA, medianas; não é previsão).',
    sunny: 'Cena ensolarada: mês sem sinal climático extremo (clima histórico NASA, medianas; não é previsão).',
    drought: 'Cena de seca: déficit P−ET0 no mês (clima histórico NASA, medianas; não é previsão).',
    frost: 'Cena com geada: parte dos anos teve Tmín ≤ 2 °C no mês (clima histórico NASA; não é previsão).',
    heat: 'Cena de calor: Tmáx mediana alta no mês (clima histórico NASA, medianas; não é previsão).',
    neutral: 'Cena sem chuva nem seca: P−ET0 próximo de zero (clima histórico NASA, medianas; não é previsão).',
    unknown: 'Clima do mês: N/D; nenhum fenômeno é desenhado.',
  } as Record<CycleWeather, string>,
  weatherName: { storm: 'Tempestade', rain: 'Chuva', cloudy: 'Nublado', sunny: 'Ensolarado', drought: 'Seca', frost: 'Geada', heat: 'Calor', neutral: 'Ensolarado', unknown: 'N/D' } as Record<CycleWeather, string>,
  monthName: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  monthWeatherDetail: (m: MonthWeather) => detail(m, pt),
};

const en: typeof pt = {
  rainDaysLabel: 'rain days', tmaxLabel: 'Tmax',
  purposes: { commercial: 'commercial production', cover: 'soil cover', forage: 'forage' },
  slotMissing: { crop: 'defined crop', temperature: 'documented thermal range', cycle: 'documented cycle duration', soil_ph: 'informed pH or verifiable range', previous_crop_family: 'previous crop family' },
  scenarioMissing: { cycle_duration: 'documented duration', eligible_crop: 'crop meeting minimum criteria', historical_climate: 'historical climate', documented_temperature_range: 'documented thermal range', soil_ph_or_verified_range: 'informed pH or verifiable range', unconfigured_lab_slots: 'stages not configured yet', futureBaseline: 'confirmed future plan' },
  evidenceLevel: { climate_exploration: 'Climate exploration', regionally_contextualized: 'Regional context available', locally_validated: 'Traceable local validation' },
  unknownCrop: 'Crop not identified in the catalog',
  knownRisk: 'Cataloged risk',
  staleEvidence: 'This stage changed after the last analysis. The scene already shows the chosen crop; reopen the comparison to recompute indicators and evidence.',
  intercrop: (plot, period, names) => `Declared intercrop “${plot}” (${period}) with ${names}. The scene alternates rows only schematically: it does not represent ratio, spacing, competition or an arrangement recommendation; the exact stage of the intercrop is not inferred from the dates.`,
  attention: 'Attention',
  zarcIndicated: (risk) => `ZARC (MAPA): indicated sowing window${risk}`,
  zarcNotIndicated: 'ZARC (MAPA): sowing window not indicated for this crop in the municipality',
  zarcUnknown: 'ZARC (MAPA): no reading for this crop and window',
  waterSurplus: (mm) => `Rain above evaporation in the window: P−ET0 of ${mm} mm (historical median)`,
  waterDeficit: (mm) => `Climatic water deficit in the window: P−ET0 of ${mm} mm (historical median; not irrigation need)`,
  waterNeutral: (mm) => `P−ET0 balance close to neutral in the window: ${mm} mm`,
  waterNd: 'Window P−ET0 balance: N/A',
  frostObserved: 'No years with screening frost (Tmin ≤ 2 °C) in the window',
  frostUnknown: 'Frost risk in the window: N/A',
  weatherCaption: {
    storm: 'Storm scene: very wet month with many rain days (NASA historical climate, medians; not a forecast).',
    rain: 'Rain scene: positive P−ET0 in the month (NASA historical climate, medians; not a forecast).',
    cloudy: 'Cloudy scene: many rain days or low solar radiation in the month (NASA historical climate, medians; not a forecast).',
    sunny: 'Sunny scene: month with no extreme climate signal (NASA historical climate, medians; not a forecast).',
    drought: 'Drought scene: P−ET0 deficit in the month (NASA historical climate, medians; not a forecast).',
    frost: 'Frost scene: some years had Tmin ≤ 2 °C in the month (NASA historical climate; not a forecast).',
    heat: 'Heat scene: high median Tmax in the month (NASA historical climate, medians; not a forecast).',
    neutral: 'No rain or drought drawn: P−ET0 close to zero (NASA historical climate, medians; not a forecast).',
    unknown: 'Month climate: N/A; no phenomenon is drawn.',
  },
  weatherName: { storm: 'Storm', rain: 'Rain', cloudy: 'Cloudy', sunny: 'Sunny', drought: 'Drought', frost: 'Frost', heat: 'Heat', neutral: 'Sunny', unknown: 'N/A' },
  monthName: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  monthWeatherDetail: (m: MonthWeather) => detail(m, en),
};

export function futureFarmCopy(locale: Locale) { return locale === 'en' ? en : pt; }
