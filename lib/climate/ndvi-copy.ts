/** Mandatory caveats whenever NDVI comes from the national municipal artifact. NDVI is context only: no yield, crop, degradation, biomass or irrigation claim. */
const PT = ['NDVI MODIS representativo do município.', 'Ponto modelado de 250 m; não representa necessariamente a fazenda.', 'Série histórica, não previsão.', 'Não mede produtividade, saúde da cultura ou condição atual do talhão.'];
const EN = ['MODIS NDVI representative of the municipality.', 'Modelled 250 m point; does not necessarily represent the farm.', 'Historical series, not a forecast.', 'Does not measure yield, crop health or the current condition of the field.'];
export const ndviMunicipalCaveats = (locale: 'pt-BR' | 'en'): string[] => locale === 'en' ? EN : PT;
