import type { Locale } from '@/lib/i18n';

export type GlossaryKey = 'ET0' | 'PET0' | 'ZARC' | 'GWETROOT' | 'IMERG' | 'POWER' | 'NDVI' | 'SoilGrids' | 'MFI' | 'safrinha' | 'Kc' | 'PAM' | 'hip' | 'Tmin' | 'bare';

/** Plain-language definitions of the dotted terms. They describe concepts only; no measurement is stated here. */
export const GLOSSARY: Record<GlossaryKey, { 'pt-BR': string; en: string }> = {
  ET0: { 'pt-BR': 'ET₀: evapotranspiração de referência (FAO-56). Estimativa da água que o clima pode tirar do solo e das plantas. Não é o consumo da cultura nem necessidade de irrigação.', en: 'ET₀: FAO-56 reference evapotranspiration. An estimate of the water the climate can pull from soil and plants. It is not crop water use or an irrigation need.' },
  PET0: { 'pt-BR': 'P−ET₀: chuva menos ET₀ no mês. Positivo = sobra de água no clima; negativo = falta. Indicador de clima, não de irrigação.', en: 'P−ET₀: rain minus ET₀ in the month. Positive = climate water surplus; negative = deficit. A climate indicator, not an irrigation figure.' },
  ZARC: { 'pt-BR': 'ZARC: Zoneamento Agrícola de Risco Climático (MAPA). Indica períodos de plantio com risco aceitável por município. É zoneamento, não garantia.', en: 'ZARC: Brazil’s agricultural climate-risk zoning (MAPA). Lists sowing periods with acceptable risk per municipality. It is zoning, not a guarantee.' },
  GWETROOT: { 'pt-BR': 'GWETROOT: umidade relativa da zona das raízes (0 a 1), índice modelado pela NASA. Não é medição do talhão.', en: 'GWETROOT: relative root-zone wetness (0 to 1), a NASA modelled index. It is not a field measurement.' },
  IMERG: { 'pt-BR': 'GPM IMERG: chuva estimada por satélite da NASA.', en: 'GPM IMERG: NASA satellite rainfall estimate.' },
  POWER: { 'pt-BR': 'NASA POWER: dados diários de clima (temperatura, chuva, radiação, vento) de satélite e modelo.', en: 'NASA POWER: daily climate data (temperature, rain, radiation, wind) from satellite and model.' },
  NDVI: { 'pt-BR': 'NDVI (MODIS): índice de vigor da vegetação visto do satélite.', en: 'NDVI (MODIS): satellite vegetation-vigour index.' },
  SoilGrids: { 'pt-BR': 'SoilGrids: mapa mundial de solo (ISRIC), estimado em grade. Não substitui a análise do seu talhão.', en: 'SoilGrids: ISRIC global soil map, estimated on a grid. It does not replace analysis of your field.' },
  MFI: { 'pt-BR': 'Índice de Fournier modificado (Arnoldus): mede quão erosiva é a chuva ao longo do ano. Não é perda de solo.', en: 'Modified Fournier Index (Arnoldus): how erosive the rainfall is over the year. It is not soil loss.' },
  safrinha: { 'pt-BR': 'Safrinha: segunda safra do ano, plantada depois da safra principal.', en: 'Safrinha: the second crop of the year, sown after the main crop.' },
  Kc: { 'pt-BR': 'Kc: coeficiente de cultura (FAO-56). Referência da exposição hídrica de cada fase da cultura.', en: 'Kc: FAO-56 crop coefficient. Reference of water exposure at each crop stage.' },
  PAM: { 'pt-BR': 'PAM: Produção Agrícola Municipal (IBGE). Mostra que existe cadeia local, não preço nem lucro.', en: 'PAM: IBGE municipal agricultural production. It shows a local chain exists, not price or profit.' },
  hip: { 'pt-BR': 'Hipotético: simulação para você pensar. Não é previsão do tempo.', en: 'Hypothetical: a what-if to think with. It is not a weather forecast.' },
  Tmin: { 'pt-BR': 'Tmín: temperatura mínima do ar. Triagem de geada = anos com Tmín ≤ 2 °C.', en: 'Tmin: minimum air temperature. Frost screening = years with Tmin ≤ 2 °C.' },
  bare: { 'pt-BR': 'Solo descoberto: meses fora de qualquer janela de cultura. Palhada após a colheita e manejo não são modelados.', en: 'Bare soil: months outside every crop window. Residue after harvest and management are not modelled.' },
};
export const glossaryText = (key: GlossaryKey, locale: Locale) => GLOSSARY[key][locale];
