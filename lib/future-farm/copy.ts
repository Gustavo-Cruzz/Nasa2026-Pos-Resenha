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
};

export function futureFarmCopy(locale: Locale) { return locale === 'en' ? en : pt; }
