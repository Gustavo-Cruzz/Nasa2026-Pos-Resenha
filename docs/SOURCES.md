# Sources

- IBGE Produção Agrícola Municipal, tabela SIDRA 5457: área colhida e quantidade produzida municipal do último ano publicado. Contexto estatístico somente; presença não significa aptidão. “Arroz (em casca)” e “Feijão (em grão)” não distinguem sistema ou espécie.
- Embrapa Arroz e Feijão: páginas de ZARC para feijão-comum e arroz de terras altas, usadas como referência de identidade/escopo. Nenhum parâmetro numérico foi inferido.

- NASA POWER Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- FAO-56: https://www.fao.org/4/X0490E/x0490e0b.htm — background only; ET0/ETc not calculated.
- Local verified NASA Rio Verde fixture: `data/nasa-power-rio-verde.meta.json`.
- Ferreira; Santos (2020), *Zoneamento Agrícola de Risco Climático para Grandes Culturas no Município de Rio Verde, Goiás*: local PDF `2021-Marco Antônio Alves Ferreira-ZONEAMENTO AGRÍCOLA DE RISCO CLIMÁTICO PARA GRANDES CULTURAS NO MUNICÍPIO DE RIO VERDE, GOIÁS.pdf`, tables 1, 2, 4, 5, pp. 4–7.
- MAPA ZARC Goiás: https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico/portarias/safra-vigente/goias/goias-go
- IBGE API de Malhas, municípios do Brasil em qualidade mínima: https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio — artifact and SHA-256 in `data/brazil-municipalities.json`.
- IBGE API de Localidades, municípios: https://servicodados.ibge.gov.br/api/v1/localidades/municipios — names/UF joined by seven-digit geocode.
- MAPA ZARC Tábua de Risco 2026/2027: https://dados.agricultura.gov.br/dataset/6d3d141c-885e-41a4-ab7f-dc8ff323b96f/resource/139e5a60-1f43-4cc8-aeab-a35dbbf816c0 — P0 municipal index and source SHA-256 in `data/brazil-zarc-index.json`.
- Parameter-level value/unit/context/cultivar/location/year/URL/page/quote: `data/crop-evidence.json`. Audit: `docs/crop-evidence-report.md`.
