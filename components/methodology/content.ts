/**
 * Copy for the methodology page. Every statement mirrors what the code does (see docs/DATA_CROSSWALK.md);
 * nothing here is a measurement. Numbers for the Rio Verde example are computed at render time from the
 * verified NASA POWER fixture, never typed in this file.
 */
export type Bi = { pt: string; en: string };
export type Level = 'simple' | 'technical';
export const pick = (text: Bi, en: boolean) => (en ? text.en : text.pt);

export type SourceGroupId = 'nasa_numeric' | 'nasa_visual' | 'br_global' | 'yours';
export type SourceCard = { id: string; icon: 'satellite' | 'rain' | 'leaf' | 'mountain' | 'map' | 'layers' | 'database' | 'book' | 'cloud' | 'wave' | 'user'; title: string; gives: Bi; why: Bi; limit: Bi; tech?: { params: string; resolution: Bi; period: Bi } };

export const SOURCE_GROUPS: Array<{ id: SourceGroupId; title: Bi; hint: Bi }> = [
  { id: 'nasa_numeric', title: { pt: 'NASA · dados numéricos', en: 'NASA · numeric data' }, hint: { pt: 'Viram números e cálculos.', en: 'Turned into numbers and calculations.' } },
  { id: 'nasa_visual', title: { pt: 'NASA · camadas visuais', en: 'NASA · visual layers' }, hint: { pt: 'Só imagem no mapa; nunca viram número.', en: 'Map images only; never turned into numbers.' } },
  { id: 'br_global', title: { pt: 'Fontes brasileiras e globais complementares', en: 'Complementary Brazilian and global sources' }, hint: { pt: 'Contexto oficial e evidência agronômica.', en: 'Official context and agronomic evidence.' } },
  { id: 'yours', title: { pt: 'Seus dados', en: 'Your data' }, hint: { pt: 'O que você informa.', en: 'What you tell us.' } },
];

export const SOURCES: Record<SourceGroupId, SourceCard[]> = {
  nasa_numeric: [
    { id: 'power', icon: 'satellite', title: 'NASA POWER',
      gives: { pt: 'Temperatura, chuva, umidade, vento, radiação solar e pressão, dia a dia, de 2011 a 2025. Daí saem a ET0, o balanço chuva − ET0, a estação chuvosa, os veranicos, a triagem de geada e a erosividade.', en: 'Temperature, rain, humidity, wind, solar radiation and pressure, day by day, 2011–2025. From them: ET0, the rain − ET0 balance, rainy season, dry spells, frost screen and erosivity.' },
      why: { pt: 'Sem cadastro, para qualquer ponto do planeta, com tudo que a fórmula FAO-56 pede.', en: 'No sign-up, any point on Earth, with everything the FAO-56 formula needs.' },
      limit: { pt: 'Modelo em grade de ~50 km, não estação na sua fazenda. Não é previsão nem necessidade de irrigação.', en: 'A ~50 km grid model, not a station on your farm. Not a forecast or irrigation need.' },
      tech: { params: 'T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PS, GWETROOT, TSOIL1 · community=AG, UTC', resolution: { pt: 'Grade ~0,5° (MERRA-2/CERES), diário', en: '~0.5° grid (MERRA-2/CERES), daily' }, period: { pt: '2011-01-01 a 2025-12-31; ao vivo, cache de 24 h', en: '2011-01-01 to 2025-12-31; live, 24 h cache' } } },
    { id: 'imerg', icon: 'rain', title: 'GPM IMERG',
      gives: { pt: 'Uma segunda estimativa de chuva, por satélite, usada para contar quantos dias chove em cada mês.', en: 'A second, satellite-based rain estimate, used to count rainy days in each month.' },
      why: { pt: 'Mostra como a chuva se distribui, não só o total. Vem na mesma consulta do POWER.', en: 'Shows how rain is spread, not just the total. Comes in the same POWER request.' },
      limit: { pt: 'Estimativa de satélite, não pluviômetro. Se faltar, só esse item vira N/D.', en: 'A satellite estimate, not a rain gauge. If missing, only this item becomes N/D.' },
      tech: { params: 'IMERG_PRECTOT (via POWER)', resolution: { pt: 'Agregado à grade do POWER, diário', en: 'Aggregated to the POWER grid, daily' }, period: { pt: '2011–2025', en: '2011–2025' } } },
    { id: 'gwetroot', icon: 'layers', title: 'POWER GWETROOT · TSOIL1',
      gives: { pt: 'Umidade relativa da zona das raízes (0 a 1) e temperatura do solo perto da superfície.', en: 'Relative root-zone wetness (0 to 1) and near-surface soil temperature.' },
      why: { pt: 'O SMAP numérico exige login Earthdata; o GWETROOT é o substituto sem credencial. Também existe um retrato municipal para os 5.571 municípios.', en: 'Numeric SMAP needs an Earthdata login; GWETROOT is the credential-free stand-in. A municipal snapshot also covers all 5,571 municipalities.' },
      limit: { pt: 'Índice modelado, não umidade em volume nem sensor. TSOIL1 não existe no arquivo de Rio Verde (N/D).', en: 'A modelled index, not volumetric moisture or a sensor. TSOIL1 is absent from the Rio Verde file (N/D).' },
      tech: { params: 'GWETROOT (0–1), TSOIL1 (°C) · POWER Daily Point + Monthly Regional', resolution: { pt: 'Grade POWER; município = célula mais próxima do ponto interior', en: 'POWER grid; municipality = cell nearest to its interior point' }, period: { pt: 'Diário 2011–2025; municipal: medianas 2015–2025 + último mês válido', en: 'Daily 2011–2025; municipal: 2015–2025 medians + latest valid month' } } },
    { id: 'modis', icon: 'leaf', title: 'NASA MODIS · NDVI',
      gives: { pt: 'O verde da vegetação a cada 16 dias, para achar os meses em que o solo fica mais descoberto.', en: 'Vegetation greenness every 16 days, to find the months when soil is most exposed.' },
      why: { pt: 'É o índice de vegetação da NASA com série longa e acesso aberto (Planetary Computer).', en: 'NASA’s vegetation index with a long, open-access series (Planetary Computer).' },
      limit: { pt: 'Só em 7 pontos com arquivo verificado. Fora deles, N/D.', en: 'Only at 7 points with a verified file. Elsewhere, N/D.' },
      tech: { params: 'MOD13Q1 v061 · 250m_16_days_NDVI · escala 0,0001 · fill −3000', resolution: { pt: '250 m, 16 dias, amostra pontual', en: '250 m, 16 days, point sample' }, period: { pt: '2011–2025 (345 compostos esperados; grava só com ≥ 90% listados e ≥ 70% válidos)', en: '2011–2025 (345 expected composites; written only with ≥ 90% listed and ≥ 70% valid)' } } },
    { id: 'srtm', icon: 'mountain', title: 'NASA SRTM',
      gives: { pt: 'Altitude de até 100 pontos da área. Daí saem a declividade, a classe de relevo e os pontos íngremes.', en: 'Elevation at up to 100 points of the area. From it: slope, relief class and steep spots.' },
      why: { pt: 'Relevo é o que mais pesa no risco de a chuva levar o solo.', en: 'Relief weighs most on the risk of rain washing soil away.' },
      limit: { pt: 'Erro vertical do radar; ponto íngreme não é perda de solo medida (RUSLE fica N/D).', en: 'Radar vertical error; a steep spot is not measured soil loss (RUSLE stays N/D).' },
      tech: { params: 'SRTM GL1 v003 via OpenTopoData srtm30m', resolution: { pt: '1″ (~30 m); grade ≥ 60 m, ≤ 100 pontos; sem polígono: 3×3 a 90 m', en: '1″ (~30 m); grid ≥ 60 m, ≤ 100 points; no polygon: 3×3 at 90 m' }, period: { pt: 'Missão de 2000; cache de 24 h', en: '2000 mission; 24 h cache' } } },
  ],
  nasa_visual: [
    { id: 'gibs', icon: 'map', title: 'NASA GIBS',
      gives: { pt: 'Camadas no mapa: umidade do solo SMAP L4, chuva IMERG e imagem MODIS em cor verdadeira.', en: 'Map layers: SMAP L4 soil moisture, IMERG rain and MODIS true-colour imagery.' },
      why: { pt: 'Deixa ver os satélites sem baixar nem processar arquivos pesados.', en: 'Shows the satellites without downloading or processing heavy files.' },
      limit: { pt: 'Só imagem: nenhum pixel vira número. O SMAP é de uma data fixa.', en: 'Images only: no pixel becomes a number. SMAP is from a fixed date.' },
      tech: { params: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture (2025-06-30), IMERG_Precipitation_Rate, MODIS_Terra_CorrectedReflectance_TrueColor', resolution: { pt: 'WMTS EPSG:3857, nível 6 (SMAP, IMERG) e 9 (MODIS)', en: 'WMTS EPSG:3857, level 6 (SMAP, IMERG) and 9 (MODIS)' }, period: { pt: 'SMAP fixo; IMERG e MODIS por data', en: 'SMAP fixed; IMERG and MODIS by date' } } },
  ],
  br_global: [
    { id: 'ibge', icon: 'database', title: 'IBGE · ZARC · PAM',
      gives: { pt: 'Em qual município você está, o risco de plantio do ZARC por decêndio e o que o município produziu.', en: 'Which municipality you are in, ZARC planting risk per 10-day period, and what the municipality produced.' },
      why: { pt: 'São as bases oficiais do Brasil para zoneamento e produção.', en: 'They are Brazil’s official bases for zoning and production.' },
      limit: { pt: 'Não escolhem culturas. Sem registro no ZARC quer dizer "sem registro", não "inapto".', en: 'They do not pick crops. No ZARC record means "no record", not "unsuitable".' },
      tech: { params: 'Malhas v3 + Localidades v1 · ZARC Tábua de Risco 2026/2027 (códigos 0/20/30/40) · SIDRA 5457 (vars 216, 214)', resolution: { pt: 'Município; ZARC por decêndio 1–36', en: 'Municipality; ZARC per 10-day period 1–36' }, period: { pt: 'ZARC 2026/2027; PAM último ano (2025)', en: 'ZARC 2026/2027; PAM latest year (2025)' } } },
    { id: 'soilgrids', icon: 'layers', title: 'ISRIC SoilGrids 2.0',
      gives: { pt: 'Estimativa do solo do município: pH, carbono, argila, areia, silte, CTC, densidade e água retida (0–30 cm).', en: 'Municipal soil estimate: pH, carbon, clay, sand, silt, CEC, bulk density and retained water (0–30 cm).' },
      why: { pt: 'Única base de solo aberta com cobertura nacional (substitui o SSURGO/WSS dos EUA).', en: 'The only open soil base covering the whole country (replaces the US SSURGO/WSS).' },
      limit: { pt: 'Estimativa, não análise de laboratório. Nunca é misturada com a sua análise.', en: 'An estimate, not a lab analysis. Never mixed with your own analysis.' },
      tech: { params: 'phh2o, soc, clay, sand, silt, cec, bdod, wv0033, wv1500', resolution: { pt: '5 km agregado; 1 ponto interior por município; 5.456/5.571 completos', en: '5 km aggregated; 1 interior point per municipality; 5,456/5,571 complete' }, period: { pt: 'SoilGrids 2.0 (pré-processado, API REST suspensa)', en: 'SoilGrids 2.0 (preprocessed, REST API suspended)' } } },
    { id: 'catalog', icon: 'book', title: 'Embrapa · FAO',
      gives: { pt: 'Faixa de temperatura, ciclo, pH e Kc de cada cultura, cada valor com página e trecho da fonte.', en: 'Temperature range, cycle, pH and Kc of each crop, each value with page and excerpt from the source.' },
      why: { pt: 'Regras com fonte, conferidas contra o texto do PDF.', en: 'Sourced rules, checked against the PDF text.' },
      limit: { pt: 'O que a fonte não traz fica N/D. O Kc é só mostrado; a ETc não é calculada.', en: 'Whatever the source lacks stays N/D. Kc is only shown; ETc is not calculated.' },
      tech: { params: 'data/crop-evidence.json: 93 registros (viableTempC 12, cycleDaysRange 16, kcStages 15, soilPhRange 12…)', resolution: { pt: 'Por cultura', en: 'Per crop' }, period: { pt: 'FAO-56 Tab. 11/12, ECOCROP, Embrapa', en: 'FAO-56 Tab. 11/12, ECOCROP, Embrapa' } } },
    { id: 'openmeteo', icon: 'cloud', title: 'Open-Meteo',
      gives: { pt: 'O tempo agora no ponto (atualizado a cada 5 minutos) e a previsão do tempo de até 16 dias: chuva, ET0 e temperatura.', en: 'Current weather at the point (refreshed every 5 minutes) and a weather forecast up to 16 days: rain, ET0 and temperature.' },
      why: { pt: 'O POWER é histórico; para o tempo de agora e dos próximos dias é preciso um modelo meteorológico.', en: 'POWER is historical; current and next-days weather needs a weather model.' },
      limit: { pt: 'Não é dado NASA nem medição da fazenda. Se faltar um dia, a soma de 7/15 dias fica N/D.', en: 'Not NASA data nor a farm measurement. If one day is missing, the 7/15-day sum is N/D.' },
      tech: { params: 'precipitation_sum, et0_fao_evapotranspiration, temperature_2m_max/min · models=best_match', resolution: { pt: 'Ponto; previsão diária', en: 'Point; daily forecast' }, period: { pt: 'Até 16 dias; tempo atual com cache de 5 min', en: 'Up to 16 days; current weather cached 5 min' } } },
    { id: 'enso', icon: 'wave', title: 'NOAA CPC · RONI',
      gives: { pt: 'Se o momento é de El Niño, La Niña ou neutro.', en: 'Whether it is El Niño, La Niña or neutral now.' },
      why: { pt: 'Contexto climático global que o agricultor conhece.', en: 'Global climate context farmers know.' },
      limit: { pt: 'Índice global: nenhum efeito local é atribuído.', en: 'A global index: no local effect is claimed.' },
      tech: { params: 'RONI.ascii.txt · |v| < 0,5 neutro; faixas 0,5/1,0/1,5/2,0', resolution: { pt: 'Global, trimestre móvel', en: 'Global, rolling 3-month season' }, period: { pt: 'Cache de 1 dia', en: '1-day cache' } } },
  ],
  yours: [
    { id: 'you', icon: 'user', title: 'Você',
      gives: { pt: 'Local, culturas anteriores, restrições, prioridades (água, solo, operação) e análise de solo, se tiver. O histórico define o plano atual (A); restrições e prioridades mudam as alternativas B e C; pH e carbono da sua análise substituem a estimativa regional.', en: 'Place, past crops, constraints, priorities (water, soil, operations) and a soil analysis, if you have one. History sets the current plan (A); constraints and priorities change alternatives B and C; pH and carbon from your analysis replace the regional estimate.' },
      why: { pt: 'Só você conhece o talhão.', en: 'Only you know the plot.' },
      limit: { pt: 'Informação declarada, não verificada em campo. A observação livre do solo não entra no cálculo.', en: 'Declared, not field-verified. The free-text soil note is not used in calculations.' } },
  ],
};

export type CrosswalkStatus = 'numeric' | 'visual' | 'replaced' | 'na' | 'candidate';
export const STATUS_LABEL: Record<CrosswalkStatus, Bi> = {
  numeric: { pt: 'Usado numérico', en: 'Used, numeric' },
  visual: { pt: 'Usado visual', en: 'Used, visual' },
  replaced: { pt: 'Substituído', en: 'Replaced' },
  na: { pt: 'Não aplicável (EUA)', en: 'Not applicable (US)' },
  candidate: { pt: 'Candidato', en: 'Candidate' },
};
export type CrosswalkRow = { name: string; status: CrosswalkStatus; note: Bi };
export const CROSSWALK: CrosswalkRow[] = [
  { name: 'NASA POWER', status: 'numeric', note: { pt: '11 parâmetros diários 2011–2025 e GWETROOT municipal.', en: '11 daily parameters 2011–2025 and municipal GWETROOT.' } },
  { name: 'GPM IMERG', status: 'numeric', note: { pt: 'IMERG_PRECTOT via POWER; também camada GIBS.', en: 'IMERG_PRECTOT via POWER; also a GIBS layer.' } },
  { name: 'MODIS', status: 'numeric', note: { pt: 'NDVI MOD13Q1 em 7 pontos verificados; também camada GIBS.', en: 'MOD13Q1 NDVI at 7 verified points; also a GIBS layer.' } },
  { name: 'SRTM', status: 'numeric', note: { pt: 'Declividade e classes de relevo Embrapa.', en: 'Slope and Embrapa relief classes.' } },
  { name: 'SMAP', status: 'visual', note: { pt: 'Camada GIBS L4; numérico exige Earthdata (substituto: GWETROOT).', en: 'GIBS L4 layer; numeric needs Earthdata (stand-in: GWETROOT).' } },
  { name: 'Ag Data Commons', status: 'replaced', note: { pt: '→ catálogo Embrapa/FAO com fonte.', en: '→ sourced Embrapa/FAO catalog.' } },
  { name: 'Web Soil Survey', status: 'replaced', note: { pt: '→ SoilGrids + sua análise de solo.', en: '→ SoilGrids + your soil analysis.' } },
  { name: 'SSURGO / STATSGO2', status: 'replaced', note: { pt: '→ SoilGrids 2.0.', en: '→ SoilGrids 2.0.' } },
  { name: 'PRISM', status: 'replaced', note: { pt: '→ NASA POWER + IMERG.', en: '→ NASA POWER + IMERG.' } },
  { name: 'NASS QuickStats', status: 'replaced', note: { pt: '→ IBGE PAM + ZARC.', en: '→ IBGE PAM + ZARC.' } },
  { name: 'NLDAS', status: 'na', note: { pt: 'Só América do Norte.', en: 'North America only.' } },
  { name: 'CDL', status: 'na', note: { pt: 'Só EUA (MapBiomas não usado).', en: 'US only (MapBiomas not used).' } },
  { name: 'NAIP', status: 'na', note: { pt: 'Só EUA.', en: 'US only.' } },
  { name: 'NLCD', status: 'na', note: { pt: 'Só EUA (MapBiomas não usado).', en: 'US only (MapBiomas not used).' } },
  { name: 'CoCoRaHS', status: 'na', note: { pt: 'América do Norte; chuva sem validação por pluviômetro.', en: 'North America; rain not gauge-validated.' } },
  { name: 'USGS NWIS', status: 'na', note: { pt: 'Só EUA; sem recomendação de irrigação.', en: 'US only; no irrigation advice.' } },
  { name: 'USDA AMS', status: 'na', note: { pt: 'Só EUA; economia fora do escopo.', en: 'US only; economics out of scope.' } },
  { name: 'OpenET', status: 'na', note: { pt: 'Oeste dos EUA; ET0 calculada pelo app.', en: 'Western US; ET0 computed by the app.' } },
  { name: 'LANDFIRE', status: 'na', note: { pt: 'Só EUA.', en: 'US only.' } },
  { name: 'Landsat', status: 'candidate', note: { pt: 'NDVI por talhão (difícil).', en: 'Field-level NDVI (hard).' } },
  { name: 'VIIRS', status: 'candidate', note: { pt: 'Continuidade do MODIS (médio).', en: 'MODIS continuity (medium).' } },
  { name: 'ECOSTRESS', status: 'candidate', note: { pt: 'LST/ET de alta resolução (difícil).', en: 'High-res LST/ET (hard).' } },
  { name: 'GLDAS', status: 'candidate', note: { pt: 'Umidade em camadas, Earthdata (médio).', en: 'Layered soil moisture, Earthdata (medium).' } },
  { name: 'GEDI', status: 'candidate', note: { pt: 'Estrutura de vegetação; pouco sinal em lavoura (difícil).', en: 'Vegetation structure; little signal on cropland (hard).' } },
  { name: 'FAO GAEZ', status: 'candidate', note: { pt: 'Aptidão por cultura (médio).', en: 'Crop suitability (medium).' } },
  { name: 'Sentinel-2', status: 'candidate', note: { pt: 'NDVI 10 m (difícil).', en: '10 m NDVI (hard).' } },
  { name: 'ERA5', status: 'candidate', note: { pt: 'Série desde 1940, conta CDS (médio).', en: 'Series since 1940, CDS account (medium).' } },
];

export type RoadmapItem = { title: Bi; adds: Bi; tech: Bi };
export const ROADMAP: Array<{ id: 'easy' | 'medium' | 'hard'; title: Bi; hint: Bi; items: RoadmapItem[] }> = [
  { id: 'easy', title: { pt: 'Fácil', en: 'Easy' }, hint: { pt: 'Sem fonte nova: dados que já baixamos.', en: 'No new source: data we already fetch.' }, items: [
    { title: { pt: 'Chuva extrema por mês', en: 'Extreme rain per month' }, adds: { pt: 'Quando caem as chuvas fortes que levam o solo descoberto.', en: 'When heavy rains that wash bare soil away fall.' }, tech: { pt: 'Índices ETCCDI R20mm, R50mm, Rx1day, Rx5day sobre PRECTOTCORR/IMERG.', en: 'ETCCDI R20mm, R50mm, Rx1day, Rx5day on PRECTOTCORR/IMERG.' } },
    { title: { pt: 'Duas chuvas concordam?', en: 'Do two rain estimates agree?' }, adds: { pt: 'Avisa quando as duas estimativas de chuva divergem.', en: 'Flags when the two rain estimates disagree.' }, tech: { pt: 'IMERG_PRECTOT × PRECTOTCORR por mês, como etiqueta de qualidade.', en: 'IMERG_PRECTOT × PRECTOTCORR per month, as a quality tag.' } },
    { title: { pt: 'Dias de calor', en: 'Hot days' }, adds: { pt: 'Dias acima do limite de calor da cultura, quando a fonte trouxer esse limite.', en: 'Days above the crop’s heat limit, when the source gives one.' }, tech: { pt: 'Contagem de T2M_MAX > limiar documentado; sem limiar, N/D.', en: 'Count of T2M_MAX > documented threshold; none, N/D.' } },
    { title: { pt: 'Tendência 2011–2025', en: '2011–2025 trend' }, adds: { pt: 'Se a chuva ou o calor mudaram no período.', en: 'Whether rain or heat changed over the period.' }, tech: { pt: 'Mann-Kendall / Sen sobre totais anuais; 15 anos é curto.', en: 'Mann-Kendall / Sen on annual totals; 15 years is short.' } },
  ] },
  { id: 'medium', title: { pt: 'Médio', en: 'Medium' }, hint: { pt: 'Fonte nova com cadastro ou pré-processamento.', en: 'New source with sign-up or preprocessing.' }, items: [
    { title: { pt: 'SMAP numérico', en: 'Numeric SMAP' }, adds: { pt: 'Umidade do solo de satélite em vez do índice modelado.', en: 'Satellite soil moisture instead of the modelled index.' }, tech: { pt: 'SPL3SMP_E / SPL4SMGP 9 km, token Earthdata, pré-processar por município.', en: 'SPL3SMP_E / SPL4SMGP 9 km, Earthdata token, preprocess per municipality.' } },
    { title: { pt: 'GLDAS', en: 'GLDAS' }, adds: { pt: 'Umidade em camadas até 2 m e ET modelada.', en: 'Layered moisture down to 2 m and modelled ET.' }, tech: { pt: 'Noah 0,25°, GES DISC, login Earthdata.', en: 'Noah 0.25°, GES DISC, Earthdata login.' } },
    { title: { pt: 'ERA5 / ERA5-Land', en: 'ERA5 / ERA5-Land' }, adds: { pt: 'Normais de 30 anos em vez de 15.', en: '30-year normals instead of 15.' }, tech: { pt: 'Conta CDS, fila de requisição: só offline.', en: 'CDS account, request queue: offline only.' } },
    { title: { pt: 'FAO GAEZ', en: 'FAO GAEZ' }, adds: { pt: 'Segunda opinião de aptidão onde o ZARC não tem registro.', en: 'A second suitability view where ZARC has no record.' }, tech: { pt: 'GeoTIFF v4 ~9 km; rendimento potencial nunca vira promessa.', en: 'v4 GeoTIFF ~9 km; potential yield never becomes a promise.' } },
  ] },
  { id: 'hard', title: { pt: 'Difícil', en: 'Hard' }, hint: { pt: 'Por talhão, pesado ou de pouco retorno.', en: 'Per field, heavy or low return.' }, items: [
    { title: { pt: 'ECOSTRESS', en: 'ECOSTRESS' }, adds: { pt: 'Manchas quentes e ET real dentro do talhão.', en: 'Hot spots and actual ET inside the field.' }, tech: { pt: 'LST/ET 70 m, revisita irregular (ISS), AppEEARS.', en: 'LST/ET 70 m, irregular ISS revisit, AppEEARS.' } },
    { title: { pt: 'Landsat/HLS · Sentinel-2', en: 'Landsat/HLS · Sentinel-2' }, adds: { pt: 'NDVI do seu talhão, não de um ponto.', en: 'NDVI of your field, not of a point.' }, tech: { pt: '30 m / 10 m; máscara de nuvem, polígono obrigatório.', en: '30 m / 10 m; cloud mask, polygon required.' } },
    { title: { pt: 'GEDI', en: 'GEDI' }, adds: { pt: 'Estrutura das matas no entorno.', en: 'Structure of nearby woodland.' }, tech: { pt: 'L4A amostral por feixes; quase sem sinal em lavoura anual.', en: 'Sampled L4A beams; little signal on annual crops.' } },
  ] },
];
