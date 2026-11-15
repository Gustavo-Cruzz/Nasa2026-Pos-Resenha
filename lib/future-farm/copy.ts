import type { Locale } from '@/lib/i18n';
import type { EvidenceLevel } from '@/lib/future-farm/types';

const pt = {
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
  weatherCaption: { drought: 'Cena com faixa seca: déficit P−ET0 na janela desta cultura (clima histórico, não previsão).', rain: 'Cena com chuva: P−ET0 positivo na janela desta cultura (clima histórico, não previsão).', neutral: 'Sem chuva nem seca na cena: P−ET0 próximo de zero na janela (clima histórico).', unknown: 'Clima da janela: N/D; nenhuma chuva ou seca é desenhada.' } as Record<string, string>,
};

const en: typeof pt = {
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
  weatherCaption: { drought: 'Dry-spell scene: P−ET0 deficit in this crop window (historical climate, not a forecast).', rain: 'Rain scene: positive P−ET0 in this crop window (historical climate, not a forecast).', neutral: 'No rain or drought drawn: P−ET0 close to zero in the window (historical climate).', unknown: 'Window climate: N/A; no rain or drought is drawn.' },
};

export function futureFarmCopy(locale: Locale) { return locale === 'en' ? en : pt; }
