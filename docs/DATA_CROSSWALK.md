# Recursos do desafio × FieldShift (crosswalk de dados)

Data: 2026-11-15. Base: aba **Resources** do desafio "Field Shift: Adapting Farms with NASA Data" (NASA Space Apps 2026) e o inventário de fontes conferido no código (`lib/`, `scripts/`, `data/`, `app/api/`).

Escopo do produto: Brasil inteiro (contexto municipal/regional) mais exploração climática global por coordenada. Rio Verde (GO, -17,798; -50,919) é só o ponto piloto reproduzível. Regra de todas as fontes: valor ausente ou implausível vira `null` / N/D, nunca zero, nunca extrapolado para outra coordenada.

## Legenda de status

| Status | Significado |
|---|---|
| **Usado numérico** | O app lê valores e calcula indicadores com eles. |
| **Usado visual** | Aparece só como camada de imagem (GIBS); nunca é convertido em número. |
| **Substituído** | Fonte só dos EUA (ou sem rota viável); o papel dela é cumprido por um equivalente brasileiro ou global. |
| **Não aplicável** | Cobertura só dos EUA/América do Norte, sem equivalente integrado. |
| **Candidato** | Global e útil, ainda não integrado. Ver "O que dá para encaixar". |

## Tabela

### NASA

| Recurso | Status | No FieldShift | Por quê |
|---|---|---|---|
| NASA POWER | **Usado numérico** | Daily Point, `community=AG`, 2011–2025, 11 parâmetros: `T2M`, `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN` + `IMERG_PRECTOT`, `GWETROOT`, `PS`, `TSOIL1` (`lib/climate/nasa-power.ts:15-17`). Gera ET0 FAO-56, balanço P−ET0, estação chuvosa, veranicos, triagem de geada, Fournier, faixa térmica. Também POWER Monthly Regional para `GWETROOT` municipal (5.571 municípios). | Sem credencial, diário, global, parâmetros agroclimáticos prontos. |
| GPM / IMERG | **Usado numérico** + **visual** | `IMERG_PRECTOT` via POWER (total mensal e mediana de dias de chuva); camada GIBS `IMERG_Precipitation_Rate` no mapa. | Distribuição da chuva além do total; sem login. |
| MODIS (MOD13Q1 v061) | **Usado numérico** + **visual** | NDVI 250 m/16 dias (Terra) via Microsoft Planetary Computer STAC: série municipal nacional para os 5.571 municípios do IBGE 2025 (um ponto interior por município, arquivo com SHA-256) e 7 pontos de demonstração com arquivo verificado; GIBS `MODIS_Terra_CorrectedReflectance_TrueColor` no mapa. | Período de solo exposto/vegetação baixa; serviço ORNL DAAC devolvia 502/503. |
| SRTM (GL1 v003, 30 m) | **Usado numérico** | OpenTopoData `srtm30m`, até 100 pontos por análise: declividade, classes de relevo Embrapa, pontos ≥ 8%. | Relevo para risco de erosão; endpoint público. |
| SMAP | **Usado visual** | GIBS `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` em data fixa 2025-06-30. Numérico (SPL4SMGP) fica N/D: exige login Earthdata. Substituto numérico: POWER `GWETROOT` (índice modelado 0–1, não umidade volumétrica). | Sem credencial Earthdata no projeto. |
| Landsat | **Candidato** (difícil) | Não usado. | Cena 30 m exige recorte por talhão, máscara de nuvem e volume de dados. |
| VIIRS | **Candidato** (médio) | Não usado. | Continuidade do MODIS; rota de acesso sem login ainda não verificada. |
| ECOSTRESS | **Candidato** (difícil) | Não usado. | Revisita irregular, login Earthdata, cenas pesadas. |
| NLDAS | **Não aplicável** | — | Cobre só a América do Norte. |
| GLDAS | **Candidato** (médio) | Não usado. | Global (Noah 0,25°), umidade do solo em camadas; exige login Earthdata. |
| GEDI | **Candidato** (difícil, baixa prioridade) | Não usado. | Mede estrutura de floresta; pouco sinal em lavoura anual. |

### USDA e outras fontes dos EUA

| Recurso | Status | Equivalente no FieldShift | Por quê |
|---|---|---|---|
| USDA Ag Data Commons | **Substituído** | Catálogo de evidências de culturas (`data/crop-evidence.json`: Embrapa, FAO ECOCROP, FAO-56, ANA), cada valor com página e trecho literal. | Conteúdo voltado aos EUA; para o Brasil a referência agronômica é Embrapa/FAO. |
| Web Soil Survey (WSS) | **Substituído** | ISRIC SoilGrids 2.0 (perfil municipal 0–30 cm, 5 km) + análise de solo do agricultor. | Só EUA. |
| SSURGO / STATSGO2 | **Substituído** | ISRIC SoilGrids 2.0 (pH, COS, argila, areia, silte, CTC, densidade, água retida). | Só EUA. |
| PRISM | **Substituído** | NASA POWER + IMERG (via POWER). | Só EUA. |
| NASS QuickStats | **Substituído** | IBGE PAM (SIDRA 5457: área colhida e quantidade, 6 produtos) e MAPA ZARC (risco por decêndio). | Só EUA; PAM é a estatística municipal oficial do Brasil. |
| Cropland Data Layer (CDL) | **Não aplicável** | — (MapBiomas seria o equivalente brasileiro; não é usado). | Só EUA. |
| NAIP | **Não aplicável** | — | Só EUA. |
| NLCD | **Não aplicável** | — (MapBiomas seria o equivalente; não é usado). | Só EUA. |
| CoCoRaHS | **Não aplicável** | Chuva vem de POWER/IMERG, sem validação por pluviômetro. | América do Norte. |
| USGS NWIS | **Não aplicável** | — (ANA HidroWeb seria o equivalente; não é usado). | Só EUA; o app não recomenda irrigação. |
| USDA AMS Market News | **Não aplicável** | — | Só EUA; economia está fora do escopo. |
| OpenET | **Não aplicável** | ET0 calculada pelo próprio app (FAO-56 Penman-Monteith). | Oeste dos EUA; ETc fica fora do escopo. |
| LANDFIRE | **Não aplicável** | — | Só EUA. |

### Global e agências parceiras

| Recurso | Status | No FieldShift | Por quê |
|---|---|---|---|
| FAO GAEZ v4 | **Candidato** (médio) | Não usado. | Aptidão agroclimática global por cultura; complementaria o ZARC fora dos 6 cultivos P0. |
| Copernicus Sentinel-2 (ESA) | **Candidato** (difícil) | Não usado. | NDVI 10 m por talhão; nuvem, volume e processamento. |
| ERA5 (ECMWF) | **Candidato** (médio) | Não usado. | Reanálise horária desde 1940; série mais longa que 2011–2025; exige conta CDS. |

### Fontes usadas que não estão na lista do desafio

IBGE (malha municipal, Localidades, PAM), MAPA ZARC 2026/2027, ISRIC SoilGrids 2.0, catálogo Embrapa/FAO, NASA GIBS (camadas de imagem), Open-Meteo (tempo atual e previsão meteorológica de até 16 dias), NOAA CPC RONI (fase El Niño/La Niña), OpenTopoData (porta de acesso ao SRTM), Microsoft Planetary Computer (porta de acesso ao MODIS).

### Contagem

| Status | Recursos |
|---|---|
| Usado numérico | 4 (POWER, IMERG, MODIS, SRTM) — IMERG e MODIS também aparecem como camada visual |
| Usado visual | 1 (SMAP) |
| Substituído | 5 (Ag Data Commons, WSS, SSURGO/STATSGO2, PRISM, NASS QuickStats) |
| Não aplicável | 9 (NLDAS, CDL, NAIP, NLCD, CoCoRaHS, NWIS, AMS, OpenET, LANDFIRE) |
| Candidato | 8 (Landsat, VIIRS, ECOSTRESS, GLDAS, GEDI, GAEZ, Sentinel-2, ERA5) |
| **Total** | **27** linhas (Landsat, MODIS e VIIRS separados) |

## Por que cada fonte

- **NASA POWER**: única fonte NASA que entrega, sem login e para qualquer ponto do planeta, todas as variáveis da ET0 FAO-56 (temperatura, umidade, vento a 2 m, radiação, pressão) numa série diária de 15 anos. É grade modelada (~0,5°), não estação.
- **IMERG via POWER**: mesma requisição, segunda estimativa de chuva (satélite), usada para contar dias de chuva.
- **GWETROOT (POWER)**: substituto sem credencial do SMAP numérico. Índice relativo 0–1, não umidade volumétrica.
- **TSOIL1 (POWER)**: temperatura do solo próxima à superfície, mostrada no Explorar; no arquivo de Rio Verde não existe (N/D).
- **MODIS MOD13Q1**: NDVI para achar meses de vegetação relativamente baixa (risco de solo exposto). No Brasil, a série municipal cobre os 5.571 municípios (um ponto modelado de 250 m por município, não a fazenda); fora disso, só nos 7 pontos de demonstração com arquivo verificado. Sem série válida (por exemplo, ponto sobre água), N/D.
- **SRTM**: declividade e classes de relevo da Embrapa para o risco de erosão.
- **GIBS**: mostrar SMAP, IMERG e MODIS no mapa sem baixar nem decodificar dados.
- **SoilGrids**: única base de solo com cobertura nacional e acesso aberto; os arquivos são pré-processados porque a API REST está suspensa.
- **IBGE / ZARC / PAM**: contexto oficial brasileiro (município, risco de plantio por decêndio, produção municipal). Não escolhem culturas.
- **Catálogo Embrapa/FAO**: faixas térmicas, ciclo, pH e Kc com fonte; o que falta fica N/D.
- **Open-Meteo**: tempo atual e previsão meteorológica de até 16 dias (chuva, ET0 do provedor, Tmáx/Tmín). O POWER é histórico, então não serve para isso.
- **NOAA RONI**: fase global do ENSO como contexto, sem efeito local atribuído.

## O que dá para encaixar

### Fácil (sem fonte nova; dados já baixados do POWER)

Já calculados (não listar como novidade): ET0 FAO-56, balanço P−ET0, estação chuvosa, veranicos (≥ 7 dias com P < 1 mm), triagem de geada (`T2M_MIN` ≤ 2 °C, também na janela da cultura), Fournier modificado, umidade radicular `GWETROOT`, mediana de `TSOIL1`.

| Item | O que acrescenta à decisão | Variáveis | Acesso | Custo / risco |
|---|---|---|---|---|
| Frequência de chuva extrema (índices ETCCDI R20mm, R50mm, Rx1day, Rx5day) por mês | Mostra quando chuvas fortes caem em meses de solo exposto (complementa o Fournier, que é mensal). | `PRECTOTCORR`, `IMERG_PRECTOT` | Já na resposta do POWER | Baixo. Limiares vêm da definição ETCCDI; grade de ~50 km suaviza extremos locais. |
| Concordância IMERG × PRECTOTCORR | Marca meses em que as duas estimativas de chuva divergem (etiqueta de qualidade). | `IMERG_PRECTOT`, `PRECTOTCORR` | Já baixado | Baixo. O critério de divergência precisa ser declarado; não há verdade de campo. |
| Dias de calor por mês | Conta dias com `T2M_MAX` acima de um limiar **documentado** da cultura. | `T2M_MAX` + catálogo | Já baixado | Médio-baixo. Só onde a fonte da cultura trouxer limiar de máxima; senão N/D. |
| Tendência 2011–2025 (Mann-Kendall / Sen) | Indica se chuva, ET0 ou Tmáx mudaram no período. | séries anuais | Já baixado | 15 anos é curto: mostrar só como sinal, com teste de significância. |
| Temperatura do solo no plantio | Usar `TSOIL1` na janela de semeadura. | `TSOIL1` | Já baixado (ao vivo) | Exige limiar de germinação com fonte por cultura; arquivo piloto não tem `TSOIL1`. |

### Médio (fonte nova, acesso com cadastro ou pré-processamento)

| Item | O que acrescenta | Variáveis | Acesso | Custo / risco |
|---|---|---|---|---|
| SMAP L3/L4 numérico (SPL3SMP_E 9 km, SPL4SMGP 9 km) | Umidade do solo medida/assimilada (m³/m³) no lugar do índice `GWETROOT`. | superfície 0–5 cm, zona radicular 0–100 cm | Login Earthdata (token) + NSIDC/CMR; pré-processar por município | Token fica no servidor; arquivos HDF5 grandes; mudança de unidade exige rever textos. |
| GLDAS Noah 0,25° | Umidade em camadas, ET real modelada, escoamento. | SoilMoi0_10cm … 100_200cm, Evap, Qs | Login Earthdata (GES DISC) | Modelo, não medição; 3-horário/mensal; latência de semanas. |
| ERA5 / ERA5-Land | Série desde 1940/1950 para normais 30 anos; temperatura do solo e umidade em 4 camadas. | t2m, tp, swvl1-4, stl1 | Conta CDS + fila de requisição | Fila lenta para requisição ao vivo: só em pré-processamento. Licença Copernicus. |
| FAO GAEZ v4 | Aptidão agroclimática por cultura e restrições de solo; segunda opinião onde o ZARC não tem registro. | classes de aptidão, rendimento potencial | Download de GeoTIFF (sem login) | Resolução ~9 km; rendimento potencial não pode virar promessa de produtividade. |
| VIIRS VNP13 NDVI | Continuidade do NDVI quando o MODIS Terra parar. | NDVI 500 m | A verificar | Mesmo pipeline do MODIS; resolução menor. |
| MapBiomas (fora da lista) | Uso do solo anual (equivalente ao CDL/NLCD). | classes de cobertura | Download público | Grande; precisa recorte por município. |

### Difícil (pesado, por talhão, ou de baixo retorno)

| Item | O que acrescenta | Variáveis | Acesso | Custo / risco |
|---|---|---|---|---|
| ECOSTRESS LST / ET (70 m) | Pontos quentes e ET real dentro do talhão. | LST, ETdaily | Earthdata (LP DAAC/AppEEARS) | Revisita irregular (ISS), nuvem, sem série regular; não substitui ET0. |
| Landsat / HLS (30 m) | NDVI por talhão, solo exposto entre safras. | Refletância, NDVI | Earthdata ou Planetary Computer | Máscara de nuvem, volume, polígono do talhão obrigatório. |
| Sentinel-2 (10 m) | NDVI/EVI e red-edge por talhão, revisita de 5 dias. | B4, B8, B11 | Copernicus Data Space ou Planetary Computer | Mesmo custo do Landsat; harmonizar com HLS. |
| GEDI L4A biomassa | Estrutura de vegetação no entorno (matas, APP). | AGBD, altura de dossel | Earthdata | Amostral (feixes), não cobre a área toda; quase sem sinal em lavoura anual. |

## Correções pendentes (fora desta tarefa)

Divergências entre documentação e código encontradas no inventário. Não foram corrigidas aqui:

1. ~~`data/README.md` e `docs/SOURCES.md` falam em NDVI para 3 pontos; o código (`lib/climate/ndvi.ts:12-20`) tem 7.~~ **Corrigido em 2026-11-15**: os 7 pontos de demonstração e a série municipal nacional (`data/ndvi-brazil/`) estão descritos nos dois arquivos.
2. ~~`lib/source-health.ts` rotula o MODIS como "(ORNL DAAC)", mas os dados vêm do Microsoft Planetary Computer.~~ **Corrigido em 2026-11-15**: o rótulo agora cita NASA LP DAAC via Planetary Computer.
3. A página de metodologia dizia "Sem previsões" / "Open-Meteo … sem previsões", mas existem `/api/forecast` e `/api/climate-risk` (previsão meteorológica de até 16 dias). **Corrigido na nova página.**
4. `docs/METHOD.md` lista nove parâmetros POWER; o código pede 11 (inclui `PS` e `TSOIL1`).
5. RONI/ENSO e `TSOIL1` não aparecem em `docs/SOURCES.md` nem em `docs/METHOD.md`.
6. `PLANEJAMENTO.md` cita OpenFreeMap, mas o mapa base atual usa blocos ArcGIS World_Imagery.
7. `docs/RELATORIO_FIT_NASA.md` é histórico (diz "sem IA/ML"); o modelo logístico de veranico foi adicionado depois e está `not_validated` (não emite probabilidade).
8. A página de metodologia dizia que o tempo atual é atualizado "a cada 15 minutos"; o código (`components/atlas/use-live-weather.ts:8`) atualiza a cada 5 minutos. **Corrigido na nova página.**
