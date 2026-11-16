# NDVI municipal (MODIS MOD13Q1 v061, Terra) — Brasil

Contexto municipal modelado: um ponto interno de 250 m por município IBGE. Não é medição da fazenda nem do talhão.

## Estimativa antes da execução nacional (registrada em 2026-11-15, antes de rodar)

Medida ao vivo num composto (2020-01-01) com os 5.571 municípios do catálogo IBGE 2025:

| Item | Valor |
|---|---|
| Tiles MODIS com municípios | 16 (h10v09, h11v08–10, h12v08–11, h13v08–12, h14v09–11) |
| Compostos 2011–2025 (listados no STAC) | ~334 por tile (catálogo do Planetary Computer tem lacunas em 2023–2025) |
| Itens (tile × composto) | ~5.350 |
| Requisições HTTP Range | ~50 mil leituras de blocos internos (agrupadas) + ~5,5 mil cabeçalhos de 16 KiB |
| Volume baixado | ~69 GB (blocos internos de 512×512 int16 deflate, ~349 KB cada) |
| Tempo estimado | ~1,6 h com concorrência 8 (limitado por banda, ~12 MB/s) |
| Alternativa ponto-a-ponto evitada | ~1,9 milhão de chamadas |

Pilotos já executados: DF (1 município, 334 itens, 59 s) e GO (246 municípios, 668 itens, 5 min 09 s), sem falhas.

## Arquivos

- `points.json` — um ponto por município (código IBGE como string, método, tipo de geometria).
- `manifest.json` — progresso/retomada e checksums SHA-256 de `states/<UF>.json`.
- `states/<UF>.json` — registros municipais com climatologia mensal, cobertura, status e proveniência.
- `report.json` — relatório de validação.
- `.work/` — valores brutos por tile para retomada; não versionado.

## Resultado da execução nacional (validada em 2026-11-15)

| Item | Valor |
|---|---|
| Municípios processados | 5.571 / 5.571 (0 duplicados, 0 pontos inválidos, 0 falhas) |
| `available` | 5.556 |
| `insufficient_coverage` | 10 |
| `unavailable` | 5 |
| Cobertura (média / mínima / máxima) | 99,78% / 0% / 100% |
| Período real | compostos de 2011-01-01 a 2025-12-19 (o último termina em 2026-01-03) |
| Compostos por tile no catálogo | 334 de 345 esperados (lacunas em 2023–2025) |
| Tiles MODIS usados | 15 |
| Itens STAC amostrados | 5.010 |
| Requisições e volume | ~50 mil leituras de blocos internos; ~69 GB estimados |
| Tempo da execução nacional | 59 min 19 s, concorrência 8 |

Pilotos: DF (1 município, 59 s) e GO (246 municípios, 5 min 09 s), sem falhas.

Validação de valores: correspondência exata com a API de ponto do Planetary Computer em 60/60 pontos aleatórios e nos 3 compostos de Rio Verde.

Municípios sem série utilizável (ponto sobre água dentro do limite do IBGE: baías, lagoas, reservatórios, estuários; o MODIS preenche a água). No app, aparecem como N/D:

- `unavailable` (5): Salvador (BA), Madre de Deus (BA), Afuá (PA), Chaves (PA), Arraial do Cabo (RJ).
- `insufficient_coverage` (10): Japurá (AM), Itaparica (BA), Saubara (BA), Viana (MA), Belém (PA), Cabedelo (PB), Quinze de Novembro (RS), Laguna (SC), Cananéia (SP), Rubinéia (SP).

Regra de disponibilidade: `available` exige pelo menos 90% dos compostos esperados listados (23 por ano) e pelo menos 70% válidos. Valores fora de −2000..10000 (cru) e o preenchimento −3000 viram `null`, nunca zero.

## Como atualizar

Execute nesta ordem, na raiz do repositório:

```bash
# 1. Recriar os pontos (só se o catálogo IBGE mudar)
npm run build:ndvi-municipal-points

# 2. Conferir o plano sem baixar nada
npm run fetch:ndvi-brazil -- --dry-run

# 3. Baixar o que falta (retoma do checkpoint)
npm run fetch:ndvi-brazil -- --resume

# 4. Validar exigindo cobertura completa
npm run validate:ndvi-brazil -- --require-complete
```

Filtros úteis: `--uf GO,DF`, `--ibge 5218805`, `--start-year 2011 --end-year 2025`, `--concurrency 1-16` (a execução nacional usou 8). `--source point` é um caminho de contingência, com concorrência baixa, pela API de ponto; não é o caminho normal.

Antes de usar `--force`, confira no `manifest.json` os SHA-256 de catálogo e gerador: a mudança deles indica que os dados anteriores podem não corresponder ao código atual.

## Como validar

`npm run validate:ndvi-brazil -- --require-complete` confere:

- formato e versão do `manifest.json`, e o SHA-256 de cada `states/<UF>.json`;
- que todo município do catálogo tem registro, sem duplicados e com ponto dentro da própria geometria;
- status, cobertura e contagens de observações por município;
- a regra de disponibilidade acima.

Resultado em `report.json`. Use `--require-complete` para exigir cobertura completa dos municípios.

## Retomada

- `--resume` continua apenas o trabalho incompleto, lendo o `manifest.json`.
- Os valores brutos por tile ficam em `.work/` (não versionado, 29 MB). Com eles, uma retomada não baixa de novo o que já foi lido.
- `--force` refaz o trabalho; use só quando for necessário.
- Todas as escritas de `manifest.json` e `states/` são atômicas (arquivo temporário + renomeação). Uma interrupção não deixa arquivo parcial.

## Limitações

- Um ponto por município. Não representa todos os usos da terra do município e pode cair em água, sobretudo em municípios costeiros.
- Contexto municipal apenas: não há NDVI de talhão nem de fazenda.
- Lacunas no catálogo do Planetary Computer em 2023–2025 (334 de 345 compostos por tile).
- A malha IBGE usada é a de "qualidade mínima" (geometria simplificada).
- Não mede produtividade, saúde da cultura nem condição atual do talhão, e não é previsão.
