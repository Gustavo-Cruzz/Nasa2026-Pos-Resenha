import type { AnalysisResult, Rotation, SoilHealthIndicator } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';

export type NdReason = { code: string; reason: string; action: string };
const t = (locale: Locale, pt: string, en: string) => locale === 'en' ? en : pt;

export function soilHealthNdReason(item: SoilHealthIndicator, rotation: Rotation, locale: Locale): NdReason | null {
  if (item.state !== 'unknown') return null;
  if (item.id === 'nitrogen_fixation_potential') return { code: 'nitrogen_evidence_missing', reason: t(locale, 'Nenhuma cultura desta sequência tem fixação de N documentada; família botânica não comprova fixação.', 'No crop in this sequence has documented N fixation; botanical family alone does not prove fixation.'), action: t(locale, 'Confira as fontes da cultura no catálogo.', 'Check the crop sources in the catalog.') };
  if (item.id === 'bare_soil_interval') {
    const missing = rotation.bareSoil?.missing ?? [];
    if (missing.includes('cycle_context_confirmation')) return { code: 'cycle_context_confirmation', reason: t(locale, 'Falta confirmar o contexto e os marcos da duração exploratória em um ou mais slots.', 'One or more slots need confirmation of the context and events of the exploratory duration.'), action: t(locale, 'No Laboratório, revise a referência de cada cultura e confirme o contexto aplicável.', 'In the Laboratory, review each crop reference and confirm its applicable context.') };
    const slots = missing.includes('unconfigured_lab_slots'); const month = missing.includes('safrinha_start_month');
    return { code: slots ? 'bare_slots_missing' : month ? 'bare_start_missing' : 'bare_window_missing', reason: t(locale, slots ? 'Faltam culturas em um ou mais dos quatro slots.' : month ? 'Falta o mês de início da safrinha.' : 'Não foi possível formar todas as janelas de cultivo.', slots ? 'One or more of the four crop slots are empty.' : month ? 'The second-crop start month is missing.' : 'Not all crop windows could be formed.'), action: t(locale, slots ? 'Complete os quatro slots no Laboratório.' : month ? 'Informe o mês de início da safrinha no Histórico da fazenda.' : 'Confira culturas e meses no Laboratório e no Histórico da fazenda.', slots ? 'Complete the four slots in the Laboratory.' : month ? 'Enter the second-crop start month in Farm History.' : 'Check crops and months in the Laboratory and Farm History.') };
  }
  if (item.id === 'erosion_protection_context') {
    const missing = rotation.bareSoil?.missing ?? [];
    const windows = rotation.bareSoil?.windowsSource === 'unknown';
    const rain = missing.includes('rainfall_erosivity'); const slope = missing.includes('terrain_slope');
    return { code: windows ? 'erosion_crop_windows_missing' : rain ? 'erosion_rainfall_missing' : slope ? 'erosion_slope_missing' : 'erosion_management_unknown', reason: t(locale, windows ? 'Faltam janelas de cultivo para avaliar meses descobertos.' : rain ? 'Falta a erosividade histórica da chuva.' : slope ? 'Falta declividade SRTM válida para este local.' : 'Cobertura efetiva, palhada e manejo do talhão não foram medidos.', windows ? 'Crop windows are missing, so bare months cannot be evaluated.' : rain ? 'Historical rainfall erosivity is unavailable.' : slope ? 'Valid SRTM slope is unavailable for this location.' : 'Actual cover, residue and field management have not been measured.'), action: t(locale, windows ? 'Complete a sequência no Laboratório.' : 'Confira as fontes e discuta manejo local com um técnico; não há cálculo de perda de solo.', windows ? 'Complete the sequence in the Laboratory.' : 'Check sources and discuss local management with a technician; soil loss is not calculated.') };
  }
  return null;
}

export function regionalNdReasons(data: AnalysisResult, locale: Locale): NdReason[] {
  const reasons: NdReason[] = [];
  if (!data.climate.ndvi) {
    const code = data.climate.ndviGapCode ?? (data.regionalContext.municipality ? 'artifact_missing' : 'municipality_missing');
    const detail: Record<typeof code, [string, string]> = {
      municipality_missing: ['Sem município IBGE resolvido, não há série NDVI municipal aplicável.', 'Without a resolved IBGE municipality, no municipal NDVI series applies.'],
      invalid_code: ['Código IBGE inválido para consulta NDVI.', 'Invalid IBGE code for NDVI lookup.'],
      artifact_missing: ['Arquivo municipal NDVI ausente ou inválido.', 'Municipal NDVI artifact is missing or invalid.'],
      checksum_mismatch: ['Arquivo NDVI falhou na verificação de integridade.', 'NDVI artifact failed the integrity check.'],
      record_missing: ['Município sem registro no arquivo NDVI carregado.', 'Municipality has no record in the loaded NDVI artifact.'],
      insufficient_coverage: ['Série MODIS municipal com cobertura insuficiente.', 'Municipal MODIS series has insufficient coverage.'],
      unavailable: ['Ponto municipal sem observações MODIS válidas (por exemplo, sobre água).', 'Municipal point has no valid MODIS observations (for example, over water).'],
    };
    reasons.push({ code: `ndvi_${code}`, reason: t(locale, ...detail[code]), action: t(locale, 'Confira o município e a qualidade da fonte; NDVI municipal não mede a fazenda.', 'Check the municipality and source quality; municipal NDVI does not measure the farm.') });
  }
  if (!data.regionalContext.zarc) reasons.push({ code: data.regionalContext.municipality ? 'zarc_safra_missing' : 'zarc_municipality_missing', reason: data.regionalContext.municipality ? t(locale, 'Não há tabela ZARC processada para este município e safra.', 'No processed ZARC table is available for this municipality and crop year.') : t(locale, 'Sem município IBGE resolvido, o ZARC municipal não se aplica.', 'Without a resolved IBGE municipality, municipal ZARC does not apply.'), action: t(locale, 'Confira município, safra e tabelas oficiais; ausência não significa inaptidão.', 'Check municipality, crop year and official tables; absence does not mean unsuitable.') });
  return reasons;
}
