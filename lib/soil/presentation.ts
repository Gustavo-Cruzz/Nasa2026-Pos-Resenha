import type { RegionalSoilAnalysis } from '@/lib/soil/regional-analysis';

export type SoilSummaryIndicator = { id: 'texture' | 'ph' | 'organic_carbon' | 'root_zone_wetness'; label: string; value: string; status: 'estimated' | 'modelled' | 'unknown' };
const textureLabels = { 'pt-BR': { very_clayey: 'Muito argilosa', clayey: 'Argilosa', silty: 'Siltosa', sandy: 'Arenosa', medium: 'Média' }, en: { very_clayey: 'Very clayey', clayey: 'Clayey', silty: 'Silty', sandy: 'Sandy', medium: 'Medium' } } as const;

export function buildRegionalSoilSummary(context: RegionalSoilAnalysis, locale: 'pt-BR' | 'en'): SoilSummaryIndicator[] {
  const soil = context.staticProfile; const moisture = context.moistureSnapshot; const en = locale === 'en';
  const attribute = (id: 'phh2o' | 'soc') => soil.status === 'available' ? soil.attributes[id] : null;
  const format = (item: { value: number | null; unit: string } | null) => item?.value === null || item?.value === undefined ? 'N/D' : `${item.value} ${item.unit}`;
  const latest = moisture.status === 'available' ? moisture.latest : null; const period = latest ? `${latest.period.slice(4, 6)}/${latest.period.slice(0, 4)}` : null;
  return [
    { id: 'texture', label: en ? 'Texture' : 'Textura', value: soil.status === 'available' && soil.textureClass ? textureLabels[locale][soil.textureClass] : 'N/D', status: soil.status === 'available' && soil.textureClass ? 'estimated' : 'unknown' },
    { id: 'ph', label: en ? 'pH in water' : 'pH em água', value: format(attribute('phh2o')), status: attribute('phh2o') ? 'estimated' : 'unknown' },
    { id: 'organic_carbon', label: en ? 'Organic carbon' : 'Carbono orgânico', value: format(attribute('soc')), status: attribute('soc') ? 'estimated' : 'unknown' },
    { id: 'root_zone_wetness', label: en ? `Root-zone wetness (${period ?? 'N/D'})` : `Umidade radicular (${period ?? 'N/D'})`, value: latest ? `${latest.value.toFixed(2)} · P${latest.percentile ?? 'N/D'}` : 'N/D', status: latest ? 'modelled' : 'unknown' },
  ];
}
