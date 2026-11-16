# Inventário de dados — "Comparação avançada" (tela atual)

Registro de **todos** os dados exibidos pela tela "Comparação avançada" antes da substituição pela nova linha do tempo de 24 meses. Serve para que nada seja esquecido na migração.

- Data do levantamento: 2026-11-15
- Escopo: `components/results/analysis-results.tsx` (modo `advanced`), `components/results/results-blocks.tsx` (`buildBlocks`) e todos os componentes renderizados pelos blocos.
- Comentários do João: `components/results/block-comments.ts` (comentários locais) e `lib/gemini/farm-explanation.ts` (seções geradas pelo Gemini ou pelo texto embutido de fallback).

## Como ler este documento

- **Campo de origem** é o caminho exato dentro de `AnalysisResult` (`lib/engine/types.ts`), por exemplo `strategies[].bareSoil.months`. Quando o valor é derivado por função do motor, o nome da função aparece entre parênteses.
- `[]` indica array. `?` indica campo opcional. `.value` indica o número dentro de um atributo de solo.
- **N/D** é a convenção da tela: o valor aparece como "N/D" quando o campo está ausente ou nulo. Nada é preenchido por estimativa.
- Textos fixos da interface (sem dado) aparecem como "texto fixo". Eles são listados porque fazem parte do que o usuário lê, e algumas datas dentro deles são fixas no código, não vêm dos dados.
- Nesta versão não restou nenhum item **verificar** sem resolução. O único ponto que o código não determina (se o painel do João será reutilizado) foi reescrito como decisão da nova tela.
- Tipos consultados: `lib/engine/types.ts`, `lib/climate/nasa-power.ts`, `lib/climate/indicators.ts`, `lib/climate/seasonality.ts`, `lib/climate/ndvi.ts`, `lib/climate/erosivity.ts`, `lib/brazil/types.ts`, `lib/terrain/terrain.ts`, `lib/soil/regional-analysis.ts`, `lib/soil/municipal-profile.ts`, `lib/soil/municipal-moisture.ts`, `lib/schema.ts`, `lib/engine/decision-hero.ts`, `lib/engine/decision-cards.ts`, `lib/engine/season.ts`, `lib/engine/tradeoffs.ts`, `lib/engine/bare-soil.ts`, `lib/engine/boundary-context.ts`, `lib/lab/assessment.ts`, `lib/source-health.ts`, `lib/presentation.ts`.

## Resumo rápido

- 10 blocos (`glance`, `scenarios`, `climate`, `water`, `calendar`, `soil`, `terrain`, `rotation`, `quality`, `next`).
- Itens do topo, cabeçalho e comentários do João estão nas seções 1 e 2.
- Componentes que deixam de ser usados estão na seção 5.

---

## 1. Topo da tela e cabeçalho do modo avançado

### 1.1 Abas de modo e cabeçalho

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Aba "Comparação simples" (🌱) e aba "Comparação avançada" (📊) | `?mode=advanced` na URL (não é dado da análise) | — | texto fixo | Alternância por `router.replace`; teclado com setas e Home/End. |
| Kicker "Comparação avançada" | texto fixo | — | texto | Primeira linha do cabeçalho. |
| Título "Análise científica completa" | texto fixo | — | texto | h2 do cabeçalho. |
| Subtítulo "Explore os indicadores, fontes, métodos e incertezas utilizados na comparação." | texto fixo | — | texto | — |
| Botão "Voltar à comparação simples" | texto fixo | — | ação | Chama `setMode('simple')`. |

### 1.2 Itens do topo (abaixo do cabeçalho)

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Chip de local: "Nome (UF)" | `regionalContext.municipality.name`, `regionalContext.municipality.uf` | IBGE malha municipal 2025 (`regionalContext.municipalitySource`) | texto | Usado quando há município. |
| Chip de local (fallback): "lat, lon" | `input.location.latitude`, `input.location.longitude` (3 casas) | Coordenadas declaradas pelo usuário | graus decimais, `toFixed(3)` | Usado quando `municipality` é nulo. |
| Chip "Último cultivo: <nome>" | `input.history[-1].cropId`, `input.history[-1].otherLabel` (nome via `cropDisplayName`) | Declarado pelo produtor; nomes do catálogo de culturas | texto | Mostra ícone da cultura (`CropSprite`, `cropId ?? 'unknown'`). |
| Botão "Voltar ao laboratório" | rota `/lab` | — | link | Texto fixo. |
| Botão "Alterar dados da fazenda" | rota `/farm/historico` | — | link | Texto fixo. |
| Botão "Exportar resumo técnico" | `ready` (AnalysisResult inteiro) via `buildAnalysisSummary(data, locale)` em `lib/export-summary.ts` | Todas as fontes do resumo | arquivo `.md` `field-shift-<latitude>-<longitude>.md` | O arquivo exportado cobre o resultado inteiro, não só os blocos. Seções do arquivo: Decisão concreta, Janela climática por mês, Balanço hídrico, Relevo e contexto de erosão, Estado das fontes, Cenários (`strategies[].title`, `proposedCrop.name`), Limites (`evidenceManifest.guardrails`, `disclaimer`). Campos conferidos em `lib/export-summary.ts`. Títulos de seção: Decisão concreta; Janela climática por mês; Calendário térmico; Balanço hídrico climático; Relevo e contexto de erosão; Estado das fontes; Cenários; Limites. |
| Interruptor "Explicações do João" (aria-switch) | Estado local `guide` (padrão ligado) | — | ligado/desligado | Não altera dados. Desligado, esconde a coluna do João e o painel inferior. |
| Linha de origem das explicações (role=status) | Estado `explain` (origem da resposta de `/api/explain-farm`) | Gemini 3.5 Flash-Lite (texto da interface) ou texto embutido do app | texto | Três textos: (a) loading: "João está preparando uma explicação curta dos dados…"; (b) origem `gemini`: "Explicações geradas com Gemini 3.5 Flash-Lite a partir deste resultado."; (c) origem `fallback`: "Explicação segura do aplicativo." seguido do aviso `warning`, que é "A explicação automática está temporariamente indisponível." quando a chamada falha. |
| Aviso "Análise salva." com data/hora | `state.cachedAt` (vem de `loadLastAnalysis().savedAt`, `lib/analysis-cache.ts`) | Cache local do navegador (`localStorage`) | data e hora (`toLocaleString`) | Só aparece quando a análise reutilizada veio do cache do dispositivo. |
| Faixa "Demonstração Brasil" | Prop `demo` (true apenas na demonstração) | Texto fixo: "Rio Verde · NASA POWER + contexto ZARC municipal" | texto | Sem dado variável. |

### 1.3 Estados antes do resultado (não são blocos)

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| "Analisando clima e cenários…" | Estado `loading` | — | texto | Animação `PixelAnimation` é decorativa. |
| "Nenhum rascunho válido foi encontrado neste navegador." | Estado `empty` | Rascunho em `lib/storage` | texto | Botão "Preencher análise" (ou "Start analysis") para `/explore`. |
| Mensagem de erro | Estado `error` (texto de `/api/analyze`) | Motor de análise | texto | Erro genérico: "Não foi possível analisar o rascunho." |

---

## 2. Comentários do João: fonte de cada bloco

### 2.1 Mapa bloco → fonte do comentário

| Bloco (`id`) | Fonte do comentário | Seção Gemini (`explanationSectionIds`) | Observação |
|---|---|---|---|
| `glance` | Local: `localBlockComments().glance` | — | Sem seção Gemini. Usa `deriveDecisionHero` e `sourceHealth`. |
| `scenarios` | Gemini ou fallback | `overview` | `sectionForBlock.scenarios = 'overview'`. |
| `climate` | Gemini ou fallback | `climate` | — |
| `water` | Gemini ou fallback | `water` | A seção precisa citar ET₀ e não pode usar a palavra "saldo" (validação do schema). |
| `calendar` | Local: `localBlockComments().calendar` | — | Usa `seasonality.rainySeason` e `input.plantingMonth`. |
| `soil` | Gemini ou fallback | `soil` | — |
| `terrain` | Gemini ou fallback | `terrain` | — |
| `rotation` | Gemini ou fallback | `rotation` | — |
| `quality` | Local: `localBlockComments().quality` | — | Usa a contagem de fontes disponíveis (`buildSourceHealth`). |
| `next` | Local: `localBlockComments().next` | — | Usa `strategies[].baselineAssumed`. |

Hierarquia do comentário:
1. Resposta de `POST /api/explain-farm` (origem `gemini`), validada pelo schema `farmExplanationSchema`.
2. Se a chamada falhar ou a resposta for inválida: texto embutido `fallbackFarmExplanation(buildFarmExplanationContext(data), locale)` (origem `fallback`).
3. Se o contexto não puder ser montado: `unavailableComment` ("João não conseguiu preparar um comentário deste bloco a partir dos dados.").

Cada comentário tem `happening` (resumo), `points` (até 2 pontos, opcional) e `limit` ("O que isto não diz").

### 2.2 Dados enviados ao João (`buildFarmExplanationContext`)

Estes campos também são dados de `AnalysisResult`, por isso são listados aqui.

| Campo do contexto | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| `location.municipality`, `location.uf` | `regionalContext.municipality.name`, `.uf` | IBGE malha 2025 | texto | `null` quando não há município. |
| `location.latitude`, `location.longitude` | `input.location` | Declarado | graus | — |
| `plantingMonth` | `input.plantingMonth` | Declarado | 1–12 | — |
| `history[]` (máx. 3): `crop`, `period` | `input.history[].cropId`, `.otherLabel`, `.startYearMonth`, `.endYearMonth` | Declarado | texto; `AAAA-MM–AAAA-MM` | Apresentado como histórico, nunca como plano. |
| `climate.status`, `climate.period` | `climate.status`, `climate.provenance.period.start`/`.end` | NASA POWER | texto | `period` é `null` sem proveniência. |
| `climate.monthly[].rainMm` | `climate.historicalPrecipitationByMonth[].medianTotalMm` | NASA POWER PRECTOTCORR | mm | 12 meses. |
| `climate.monthly[].temperatureC` | `climate.monthly[].tmeanMedianC` | NASA POWER T2M | °C | 12 meses. |
| `climate.rainySeasonMonths` | `climate.seasonality.rainySeason.months` | Derivado (balanço P−ET₀) | meses | `[]` quando não há estação. |
| `climate.waterBalanceMm` | `climate.waterBalanceByMonth[].balanceMedianMm` | NASA POWER + FAO-56 | mm | 12 meses. |
| `soil.status` | `soilContext.status` (ou `unavailable`) | — | texto | — |
| `soil.ph`, `soil.organicCarbonGKg`, `soil.sandPct`, `soil.siltPct`, `soil.clayPct` | `input.soil.*` com fallback para `soilContext.staticProfile.attributes.phh2o/soc/sand/silt/clay.value` | Declarado ou SoilGrids 2.0 | pH; g/kg; % | Prioridade: produtor e depois regional. |
| `soil.farmerObservations` | `input.soilObservation.kinds` | Declarado pelo produtor | até 7 rótulos | — |
| `terrain.status`, `terrain.meanSlopePct`, `terrain.maxSlopePct` | `terrain.status`, `terrain.slopePct.mean`, `terrain.slopePct.max` | NASA SRTM | % | `null` sem relevo. |
| `terrain.steepSlopeSharePct` | `terrain.hotspots.sharePct` | NASA SRTM | % das amostras com declividade ≥ 8% | — |
| `strategies[]` (3): `id`, `title`, `crop`, `baseline`, `baselineAssumed`, `indicators[]` (`label`, `state`, `detail`), `missingData[]` | `strategies[].id`, `.title`, `.proposedCrop.name` ou `.cropId`, `.baseline`, `.baselineAssumed`, `.indicators[]`, `.missingData[]` | Vários (ver seção 3) | texto | `indicators` é limitado a 12 itens por cenário no contexto. |
| `warnings` | `warnings[]` | Motor | texto | Enviado ao João; não é exibido na tela avançada. |

---

## 3. Blocos da tela

Ordem de exibição: `glance`, `scenarios`, `climate`, `water`, `calendar`, `soil`, `terrain`, `rotation`, `quality`, `next`.

Para cada bloco, o cabeçalho mostra: ícone (decorativo), **título**, **takeaway** (linha abaixo do título) e **chip de status**, com o tom (ok, attention, info).

---

### Bloco 1 — `glance`

- **Título exibido:** "Decisão num relance" (en: "Decision at a glance")
- **Takeaway:** "A temperatura NASA do mês de plantio diante da faixa documentada de cada cultura."
- **Chip de status:** "Atenção" / "Compatível" / "N/D" conforme `deriveDecisionHero(data).state` (`lib/engine/decision-hero.ts`). Tom: attention / ok / info.
- **Comentário do João:** local, `localBlockComments().glance` (sem seção Gemini).

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| KPI "Mês de plantio" (sub: "mês de leitura") | `deriveDecisionHero(data).month` ← `data.nasaInsight.month` | NASA POWER (insight do mês) | nome do mês (Jan–Dez) | Resolvido: `nasaInsight` é calculado com `parsed.data.plantingMonth` (`lib/engine/index.ts`), ou seja, `input.plantingMonth`. |
| KPI "Sinal NASA" (valor, unidade; sub: período) | `deriveDecisionHero(data).observedValue`, `.unit`, `.period` ← `data.nasaInsight.observedValue`, `.unit`, `.period` | NASA POWER T2M (mediana mensal) | °C, 1 casa; período `início–fim` | N/D quando `metric` não é `temperature`. Formato `AAAAMMDD` (`NASA_POWER_PERIOD` em `lib/climate/nasa-power.ts`, 20110101–20251231), exibido sem separadores. |
| KPI "Dentro da faixa documentada" (n; sub "de N culturas dos cenários"; barra) | `items[].state === 'compatible'` contado sobre `items.length` | Catálogo de culturas (faixa térmica documentada) + NASA POWER | contagem inteira | N/D quando não há itens. |
| KPI "Meses com ET₀ acima da chuva" (n; sub "de N calculados") | `climate.waterBalanceByMonth[].balanceMedianMm < 0` sobre os não nulos | NASA POWER PRECTOTCORR + ET₀ FAO-56 | meses | N/D quando não há valores. |
| Medidor por cenário "A · <cultura>" (faixa e marcador) | `items[].scenarioId`, `items[].cropId`, `items[].cropName`, `items[].rangeC.min`, `items[].rangeC.max` | Catálogo de culturas (faixa térmica) | °C | Sem faixa: "N/D · sem faixa documentada". Ícone da cultura (`CropSprite`). |
| Valor do medidor por cenário | `items[].observedValueC` quando `items[].evaluatedMonth` está definido; senão `deriveDecisionHero(data).observedValue` | NASA POWER T2M | °C | Safrinha: o mês avaliado é `evaluatedMonth`. |

Bloco `DecisionHero` (dentro de `glance`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Estado: "Atenção" / "Compatível" / "N/D · evidência limitada" | `deriveDecisionHero(data).state` | Regra do motor (faixa térmica × mediana NASA) | texto | Ícone conforme estado. |
| Manchete (ex.: "<mês>: <cultura> (cenário X) fica sob atenção") | `state`, `month`, `items[]` (cultura, `scenarioId`), `unreadScenarioIds` | Derivado | texto | Textos para os três estados (atenção, compatível, sem leitura). |
| "Sinal NASA · <mês>": valor e unidade; período (`start–end`) | `deriveDecisionHero(data).observedValue`, `.unit`, `.period` | NASA POWER | °C; texto do período | N/D quando nulo. |
| "Faixa documentada": por item, nome, faixa `min–max °C`, e "lido em <mês>: <valor> °C" (safrinha) ou "mês da safrinha não informado" | `items[].rangeC`, `items[].evaluatedMonth`, `items[].observedValueC` | Catálogo de culturas; NASA POWER | °C | Só aparece o trecho de safrinha quando `ownWindow` é verdadeiro. |
| Motivo de evidência limitada (só quando estado é `unknown`) | `climate.status`; texto "Sem faixa térmica documentada…" | Regra do motor | texto | Duas variantes: clima indisponível ou sem faixa documentada. |
| Nota de cenário sem leitura ("Cenário X: N/D — sem faixa documentada, não conta como compatível.") | `unreadScenarioIds` | Derivado | texto | Só quando o estado não é `unknown`. |
| Destaques (lista "Em destaque": título e detalhe) | `deriveSeasonInsights(deriveRotationCalendar(nasaInsightByMonth), waterBalanceByMonth, plantingMonth)` sem `no_reading` | Derivado (`lib/engine/season.ts`) | texto | Só insights com leitura. |
| Regra (texto) "Temperatura mediana NASA POWER × faixa térmica documentada da cultura" | texto fixo | — | texto | — |
| Link "Fonte" (abre em nova aba) | `deriveDecisionHero(data).sourceUrl` ← `data.nasaInsight.sourceUrl` | NASA POWER (proveniência) | URL | Só quando há URL. |
| "Próxima verificação humana" (texto) | `deriveDecisionHero(data).nextCheck`; `strategies[].baselineAssumed` | Regra do motor | texto | Três variantes: confirmar linha de base; revisar com técnico; fornecer dados. |
| "Estados dos dados": chips por estado com nomes das fontes | `buildSourceHealth(data)` agrupado por `state` (`summarizeSourceStates`) | Ver bloco 9 (`quality`) | texto | Estados: Histórico disponível / Cache verificado / Cobertura parcial / N/D. |

Decorativo, sem dado: personagem de status (`StatusCharacter`).

---

### Bloco 2 — `scenarios`

- **Título exibido:** "Cenários A, B e C" (en: "Scenarios A, B and C")
- **Takeaway:** "Três hipóteses para comparar, não um ranking de sucesso."
- **Chip de status:** "3 cenários" (texto fixo), tom info.
- **Comentário do João:** Gemini, seção `overview` (fallback: texto embutido de `overview`).

Cartões dos cenários (uma coluna por `strategies[]`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Letra do cenário (A, B, C) | `strategies[].id` | Motor | letra | — |
| Chip de status: "Indisponível" / "Pede atenção" / "Tem evidência" / "Dados parciais" | `strategies[].unavailable`; `strategies[].indicators[].state` | Derivado | texto | Ordem: indisponível; algum `attention`; algum `compatible` ou `yes`; senão parcial. Tom via `scenarioTone`. |
| Nome da cultura (ícone) | `strategies[].proposedCrop.cropId`, `strategies[].proposedCrop.name` | Catálogo de culturas (nomes) | texto | "Sem cultura definida" quando `proposedCrop` é nulo. |
| Título do cenário (subtítulo) | `strategies[].title` (pt-BR); en via `scenarioDisplayTitle` (A: "Producer plan" / "Assumed continuity — confirm"; B: "Soil health"; C) | Motor | texto | — |
| Barra de indicadores: contagem "compatível ou presente" | `strategies[].indicators[]` com `state` em `compatible`, `yes` ou `observed` | Derivado | n | Cor ciano. |
| Contagem "atenção" | `strategies[].indicators[]` com `state === 'attention'` | Derivado | n | Cor âmbar. |
| Contagem "desconhecido" | total de `indicators` − compatíveis − atenção | Derivado | n | Cor cinza. |
| "N lacuna(s)" | `strategies[].missingData.length` | Motor | n | — |

Bloco `DecisionCards` (cartões de decisão):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Pergunta de título: "Qual rotação para os próximos 2 anos no seu talhão?" | texto fixo | — | texto | — |
| Chip "o que você faz hoje" e link "Editar linha de base" → `/farm/historico?edit=baseline` | `strategies[].baseline` | Declarado | texto | Chip só no cenário de linha de base; link só quando `baseline` é verdadeiro. |
| Sequência de 2 anos: "A1 · 1ª safra" / "A2 · 2ª safra" e cultura por posição (4 posições) | `strategies[].slots[]` ordenados por `slotIndex`: `year`, `season`, `cropId`, `cropName` | Calendário de safras (`lib/lab/assessment.ts`); catálogo | ano 1 ou 2; safra A ou B | N/D quando não há slots. Prefixo "Y" em inglês. |
| Mudanças em relação ao A ("A → X"): cultura anterior → nova, por posição | `strategies[]` do cenário comparado com `strategies[A].slots[]` via `buildCardDelta` (`lib/engine/decision-cards.ts`) | Derivado | texto | Vazio quando o cenário é A ou quando os slots são iguais. |
| "Ganha em (vs. A)" (até 3 itens) | `strategies[].tradeoffs.summary.gains` (en: `gainsEn`) | Motor de trade-offs (`lib/engine/tradeoffs.ts`) | lista de textos | Sem `tradeoffs`: N/D. |
| "Perde em (vs. A)" (até 3 itens) | `strategies[].tradeoffs.summary.losses` (en: `lossesEn`) | Motor de trade-offs | lista de textos | — |
| "Não sabemos" (até 3 itens) | `strategies[].tradeoffs.summary.unknowns` (en: `unknownsEn`) | Motor de trade-offs | lista de textos | — |
| Texto da linha de base: "Referência da comparação: os outros cenários são medidos contra ela." | `strategies[].baseline` | Motor | texto | Exibido no lugar das listas quando não há trade-offs. |
| "Suas prioridades": prioridade, nível e ícone | `strategies[].priorityAlignment[]` (`priority`, `level`) via `alignmentDisplay` | Declarado (prioridades do produtor) + regra do motor | texto | Prioridades: água, solo, operações. Níveis: apoia, neutro, conflita, desconhecido. |
| Faixa de honestidade: "O que sabemos", "O que falta", "O que validar" | `buildCardHonesty(strategy, locale)` (`lib/engine/decision-cards.ts`) | Derivado de `strategies[]` | listas de textos | Origem (`buildCardHonesty`): "O que sabemos" = células de `tradeoffs.cells` com nível diferente de unknown; "O que falta" = `tradeoffs.cells[].missing` mais `missingData`, humanizados (máx. 5); "O que validar" = eixos com nível unknown ou worse. Sem item: N/D. |
| "Pergunte ao técnico": "o cenário X serve para o meu solo, minhas máquinas e meu calendário local?" | Texto fixo com letra do cenário | — | texto | — |

Bloco `ScenarioComparisonTable` ("Comparar critérios"):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Linha "Thermal compatibility" (Compatibilidade térmica): estado e detalhe por cenário | `strategies[].indicators[id='thermal_compatibility']` (`state`, `detail`) | NASA POWER T2M × catálogo de faixas | texto | Ver nota de fontes abaixo. |
| Linha "Historical precipitation" (Precipitação histórica no mês) | `strategies[].indicators[id='historical_precipitation']` | NASA POWER PRECTOTCORR | texto | — |
| Linha "Historical rainfall distribution" (Distribuição histórica da chuva) | `strategies[].indicators[id='rainfall_distribution']` | GPM IMERG (dias com chuva) | texto | Resolvido: `lib/engine/indicators.ts` (linha de `rainfall_distribution`) usa `windowWater` (`lib/engine/slot-window.ts`) sobre `climate.waterContextByMonth[].medianRainDays`, que vem de dias com chuva na série GPM IMERG (`imergPrecipMm` diário). Sem janela, usa `climate.waterContext.medianRainDays`. |
| Linha "Relative root-zone wetness" (Umidade relativa da zona radicular) | `strategies[].indicators[id='root_zone_wetness']` | NASA POWER GWETROOT (`rootZoneWetness` diário → `rootZoneWetnessMedian`) | texto | Resolvido: `windowWater` em `lib/engine/slot-window.ts`. |
| Linha "P−ET0 balance over the window" (Balanço P−ET₀ na janela) | `strategies[].indicators[id='window_water_balance']` | NASA POWER PRECTOTCORR + ET₀ FAO-56 | texto | Resolvido: `windowWaterBalance` em `lib/engine/slot-window.ts`, sobre `climate.waterBalanceByMonth`. |
| Linha "Frost risk (screening)" (Risco de geada, triagem) | `strategies[].indicators[id='frost_risk']` | NASA POWER T2M_MIN (`climate.frostByMonth`); limiar de 2 °C (`FROST_SCREEN_THRESHOLD_C`, `lib/climate/indicators.ts`) | texto | Resolvido: `windowFrost` em `lib/engine/slot-window.ts`. Limiar genérico, sem dano por cultura. |
| Linha "Documented crop water response" (Resposta hídrica documentada da cultura) | `strategies[].indicators[id='documented_water_response']` | Catálogo de culturas | texto | Resolvido: `crop.kcStages` (Kc FAO-56, evidência em `data/crop-evidence.json`, via `verifiedCropEvidence`) combinado com a série de chuva e umidade da janela. `sourceRefs` inclui a URL da evidência Kc. |
| Linha "Cover potential" (Potencial de cobertura) | `strategies[].indicators[id='cover_potential']` | Catálogo de culturas (`crop.purposes` contém `cover`, `data/crops.json`) | texto | Resolvido em `lib/engine/indicators.ts`. |
| Linha "Functional diversity" (Diversidade funcional) | `strategies[].indicators[id='functional_diversity']` | Família botânica do catálogo (`crop.family`) versus família da cultura anterior (`lib/engine/indicators.ts`, `diversity`) | texto | Resolvido. |
| Linha "Soil context" (Contexto do solo) | `strategies[].indicators[id='soil_context']`; `origin` (`farmer` ou `regional_estimate`) | Declarado ou SoilGrids 2.0 | texto | Origem "estimativa regional" aparece no rótulo do estado. |
| Destaque de linha (fundo) para prioridades | `priorityHighlights[]` (`root_zone_wetness`, `cover_potential`, `functional_diversity`) | Declarado (prioridades) | — | Linha destacada quando o indicador está em `priorityHighlights`. |
| Linha "Alignment with your priorities" (Alinhamento com suas prioridades) | `strategies[].priorityAlignment[]` (`priority`, `level`, `reason` ou `reasonEn`) | Declarado + regra do motor | texto | N/D quando vazio. |
| Estados mostrados: compatível, atenção, desconhecido, presente, não catalogado, observação | `strategies[].indicators[].state` | Motor | texto | Tradução em inglês via `indicatorDisplay`. |
| Abas por cenário (versão móvel) | Mesmos dados acima, um cenário por vez | — | — | Só para telas pequenas. |
| Link "Explore seus futuros possíveis" → `/future-stories` | texto fixo | — | link | Componente `ScenarioComparisonShortcut`. |

Trade-offs (seção "Trade-offs" dentro de `ScenarioComparisonTable`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| "Ganha em", "Perde em", "Não sabemos" (por cenário, exceto A) | `strategies[].tradeoffs.summary.gains`, `.losses`, `.unknowns` (en: `gainsEn`, `lossesEn`, `unknownsEn`) | Motor de trade-offs | lista de textos | Mensagens vazias: "Nenhum ganho documentado.", "Nenhuma perda documentada.", "Nenhum eixo sem evidência." |
| Matriz de 6 eixos × cenário: água, solo, erosão, doenças, calendário, mercado | `strategies[].tradeoffs.cells[]` (`axis`, `level`, `summary` ou `summaryEn`) | Motor de trade-offs | níveis: referência, melhor que A, parecido com A, pior que A, não sabemos | Nota extra no eixo mercado quando "pior que A": "(perda de renda da safrinha)". |
| Texto do cenário A | texto fixo: "Referência para a comparação." | — | — | — |

Nota de fontes: cada indicador de `strategies[].indicators[]` traz `sourceRefs` (não exibido nesta tela). A origem de cada linha está indicada acima, resolvida em `lib/engine/indicators.ts` e `lib/engine/slot-window.ts`.

- **Comentário do João:** Gemini, seção `overview`.

---

### Bloco 3 — `climate`

- **Título exibido:** "Chuva e temperatura" (en: "Rain and temperature")
- **Takeaway (disponível):** "Histórico mensal NASA POWER de 2011 a 2025." (texto fixo com anos escritos no código; en: "Monthly NASA POWER history, 2011 to 2025.")
- **Takeaway (indisponível):** "Clima histórico indisponível." (en: "Historical climate unavailable.")
- **Chip de status:** "Disponível" ou "N/D", tom ok ou attention.
- **Comentário do João:** Gemini, seção `climate`.

KPIs (quatro cartões):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| "Chuva, mês de plantio" (sub: nome do mês) | `climate.plantingMonthPrecipitation.medianTotalMm` | NASA POWER PRECTOTCORR (mediana dos totais mensais, anos completos) | mm, 0 casas | N/D quando nulo. |
| "Temperatura, mês de plantio" (sub: "média diária, mediana") | `climate.monthly[month === input.plantingMonth].tmeanMedianC` | NASA POWER T2M | °C, 1 casa | N/D quando nulo. |
| "Mês mais chuvoso" (nome; sub: valor em mm) | Máximo de `climate.historicalPrecipitationByMonth[].medianTotalMm` | NASA POWER PRECTOTCORR | nome do mês; mm | Ignora meses nulos. |
| "Mês mais quente" (nome; sub: valor em °C) | Máximo de `climate.monthly[].tmeanMedianC` | NASA POWER T2M | nome do mês; °C | Ignora meses nulos. |

Gráfico mensal (`MonthlyChart`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Barras de chuva mensal (12 meses) | `climate.historicalPrecipitationByMonth[].medianTotalMm` | NASA POWER PRECTOTCORR | mm | Legenda fixa "mediana 2011–2025". |
| Linha de temperatura mensal (12 meses) | `climate.monthly[].tmeanMedianC` | NASA POWER T2M | °C | — |
| Mês de plantio destacado | `input.plantingMonth` | Declarado | mês | — |

Detalhes técnicos de clima e contexto regional (recolhido):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Município: nome (UF) · código IBGE | `regionalContext.municipality.name`, `.uf`, `.code` | IBGE malha municipal 2025 | texto | Só quando há município. |
| Safra ZARC | `regionalContext.zarc.safra` | MAPA ZARC | texto | — |
| Número de culturas P0 com registros | `Object.keys(regionalContext.zarc.crops).length` (ou `Object.values(...)`) | MAPA ZARC | n | Texto "culturas P0 com registros agregados". |
| Por cultura ZARC: nomes (`zarcCultures`), linhas-fonte (`rowCount`), ciclos (`cycleCodes`), solos (`soilCodes`), códigos de risco brutos (`riskCodes`) | `regionalContext.zarc.crops[].zarcCultures`, `.rowCount`, `.cycleCodes`, `.soilCodes`, `.riskCodes` | MAPA ZARC | códigos separados por vírgula; "N/D" sem código | Códigos não são convertidos em percentuais. |
| Links "Abrir Tábua ZARC" e "Abrir dicionário" | `regionalContext.zarc.sourceUrl`, `regionalContext.zarc.dictionaryUrl` | MAPA ZARC | link | — |
| Texto "Sem registro P0 no pacote ZARC carregado para este município." | `regionalContext.zarc` nulo | — | texto | Alternativa quando não há ZARC. |
| Fonte do clima: "NASA POWER · MERRA-2 + GPM IMERG" ou "cache NASA verificado de Rio Verde" | `climate.origin` (`live` ou outro) | NASA POWER | texto | Texto da demonstração quando o cache é usado. |
| Mês analisado | `input.plantingMonth` | Declarado | número | — |
| Temperatura média do ar (sub: "Mín./máx. medianas: X–Y °C") | `climate.monthly[planting].tmeanMedianC`; `tminMedianC`; `tmaxMedianC` | NASA POWER T2M, T2M_MIN, T2M_MAX | °C | Sub-texto "Amplitude histórica indisponível." se faltar mín. ou máx. |
| Precipitação mensal (sub: "POWER historical median; not crop demand.") | `climate.plantingMonthPrecipitation.medianTotalMm` | NASA POWER PRECTOTCORR | mm | Texto fixo: "não é demanda da cultura". |
| Distribuição da chuva: dias com chuva registrada | `climate.waterContext.medianRainDays` (mês de plantio) | GPM IMERG (via NASA POWER) | dias | `waterContext` é do mês de plantio (`engine/indicators.ts`). |
| Umidade da zona radicular | `climate.waterContext.rootZoneWetnessMedian` | NASA POWER GWETROOT (grade modelada; diário `rootZoneWetness` em `lib/climate/nasa-power.ts`) | índice 0–1 | Texto: "não é medição do talhão". Mediana de anos completos, mês de plantio. |
| Gráfico de 12 meses (temperatura média mediana) com destaque do mês de plantio | `climate.monthly[].tmeanMedianC` | NASA POWER T2M | °C | Só dentro de `<details>`. |
| Clima indisponível: texto e lacunas | `climate.gaps[]` (apenas quando `climate.status === 'unavailable'`) | Motor | texto | Quando disponível, `gaps` não é exibido. |

Bloco "Climate Risk Lab (previsão e estiagem)" (recolhido). **Observação:** estes dados não vêm de `AnalysisResult`. Vêm de `GET /api/climate-risk?lat=…&lon=…`, buscados no navegador.

| Dado exibido | Campo de origem (resposta da API) | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Fonte, emissão, modelo, fuso | `forecast.source`, `forecast.sourceUrl`, `forecast.issuedAt`, `forecast.model`, `forecast.timezone` | Open-Meteo Forecast API (modelo best_match) | texto; data e hora local | Linha: "<fonte> · emitida <data> · modelo <modelo> · <fuso> · fonte". |
| Estado de carregamento ou erro | Resposta com `status: 'error'` | — | texto | "Previsão futura indisponível." e "Serviço de previsão meteorológica não respondeu agora." |
| Risco de estiagem: por horizonte (`horizonDays`): probabilidade | `drySpell[].probability` (só quando `validationStatus === 'validated'`) | Modelo logístico treinado sobre NASA POWER (`trainLogisticDrySpellModel`, `lib/climate/dry-spell.ts`; artefatos em `data/dry-spell-models.json`; rota `app/api/climate-risk/route.ts`). **Achado:** na rota atual `probability` é sempre `null` (ambos os ramos), então a tela mostra "probabilidade de IA não divulgada". |
| Referência climatológica | `drySpell[].climatologyReference` | NASA POWER (climatologia) | %, 1 casa | N/D quando nulo. |
| Situação do modelo | `drySpell[].validationStatus` (validado, não validado frente à climatologia, indisponível) | — | texto | Dentro de `<details>`. |
| Brier (climatologia e modelo) | `drySpell[].evaluation.baseline.brierScore`, `drySpell[].evaluation.model.brierScore` | Avaliação interna | 3 casas | N/D quando nulo. |
| Pressão hídrica futura, 7 dias e 15 dias: chuva prevista | `waterPressure.sevenDays.precipitationTotalMm`; `fifteenDays.precipitationTotalMm` | Open-Meteo | mm | N/D quando nulo. |
| ET₀ prevista | `waterPressure.sevenDays.et0TotalMm`; `waterPressure.fifteenDays.et0TotalMm` | Open-Meteo (ET₀ calculada pelo provedor, FAO-56) | mm | — |
| Balanço climático (chuva − ET₀) | `…climateBalanceMm` | Derivado | mm | Texto: "não é umidade do solo, ETc, demanda da cultura…". |
| Dias de balanço negativo | `…negativeBalanceDays` | Derivado | dias | — |
| Comparação com a climatologia histórica | `…historicalComparison` (mais seco, mais úmido, semelhante, N/D) | NASA POWER (equivalente histórico) | texto | — |
| Equivalente histórico do balanço | `…historicalEquivalentBalanceMm` | NASA POWER | mm | — |
| Dias previstos completos | `waterPressure.*.validDays` / `waterPressure.*.expectedDays` | Open-Meteo | "válidos/esperados", texto "dias previstos completos" | — |
| "Estratégias A / B / C": texto de exposição | `strategyExposure.reason` (texto fixo na versão em português) | — | texto | Texto: nenhuma exposição futura específica por estratégia é inferida. |
| Nota "P − ET0 é balanço climático…" | texto fixo | — | texto | — |

- **Comentário do João:** Gemini, seção `climate` (dados enviados: `climate.monthly`, `rainySeasonMonths`, `status`, `period`).

---

### Bloco 4 — `water`

- **Título exibido:** "Chuva menos ET₀" (en: "Rain minus ET₀")
- **Takeaway:** "Barras mostram um indicador climático mensal." (en: "Bars show a monthly climate indicator, not crop water use.")
- **Chip de status:** "X de Y meses abaixo" (en: "X of Y months below") ou "N/D" quando não há valores. Tom info, ou attention quando não há valores.
- **Comentário do João:** Gemini, seção `water`.

Quando há valores (`knownBalance.length > 0`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| "Meses com ET₀ acima da chuva" (n; sub "de N calculados") | `climate.waterBalanceByMonth[].balanceMedianMm < 0` sobre os não nulos | NASA POWER PRECTOTCORR + ET₀ FAO-56 | meses | Barra de proporção. |
| "Maior sobra" (valor; sub: mês) | Máximo de `climate.waterBalanceByMonth[].balanceMedianMm` | NASA POWER + FAO-56 | mm, 0 casas; nome do mês | — |
| "Maior falta" (valor; sub: mês) | Mínimo de `climate.waterBalanceByMonth[].balanceMedianMm` | NASA POWER + FAO-56 | mm, 0 casas; nome do mês | — |
| Gráfico de barras por mês (positivo = chuva acima; negativo = ET₀ acima) | `climate.waterBalanceByMonth[].balanceMedianMm` | NASA POWER + FAO-56 | mm | Mês sem valor: "N/D", sem interpolação. |
| Texto explicativo sobre ET₀ (FAO-56) | texto fixo | FAO-56 | texto | — |

Tabela de valores mensais (recolhida):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Chuva mediana (mm) | `climate.waterBalanceByMonth[].precipMedianMm` | NASA POWER PRECTOTCORR (soma diária por ano completo, depois mediana) | mm | Ver nota abaixo. |
| ET₀ mediana (mm) | `climate.waterBalanceByMonth[].et0MedianMm` | FAO-56 Penman–Monteith diário (`et0Daily`, `lib/climate/et0.ts`), calculado a partir de NASA POWER. Simplificações (G = 0, UR média, albedo 0,23, elevação pela pressão) documentadas em `docs/METHOD.md`. | mm | Resolvido. |
| Chuva − ET₀ (mm) | `climate.waterBalanceByMonth[].balanceMedianMm` | Derivado | mm | — |

Nota: a precipitação do balanço hídrico é a soma diária de `precipMm` por ano completo, e depois a mediana entre anos. Não é a mediana mensal de `climate.monthly[].precipMedianMm`. Isso se confirma em `lib/climate/indicators.ts`.

Quando não há valores: "Data not available; no estimate was made up." / "Dado não disponível; nenhuma estimativa foi inventada." (componente `Unavailable`).

---

### Bloco 5 — `calendar`

- **Título exibido:** "Estação e calendário" (en: "Season and calendar")
- **Takeaway:** "Quais meses o histórico mostra como chuvosos e como a janela climática se move." (en: "Which months the history shows as rainy, and how the climate window moves.")
- **Chip de status:** "<mês início>–<mês fim>" da estação chuvosa, ou "N/D". Tom ok ou info.
- **Comentário do João:** local, `localBlockComments().calendar`.

Faixa de 12 meses (`MonthStrip`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Célula "estação chuvosa" (ciano), "fora da estação chuvosa" (âmbar) ou "não identificado (N/D)" (cinza), por mês | `climate.seasonality.rainySeason.months` (cada mês em `months` é "on"); `null` gera "nd" | Derivado do balanço P−ET₀ (`lib/climate/seasonality.ts`, método `positive_water_balance`) | 12 células | Estação: a maior sequência circular de meses com precipitação mediana acima de ET₀ mediana. |
| Anel no mês de plantio | `input.plantingMonth` | Declarado | mês | — |
| Texto explicativo sobre a estação | texto fixo | — | texto | — |

Recolhido: "Climate window by month, vegetation and NASA Insight" (dentro de `SeasonPanel` e `NasaInsightPanel`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Aviso sobre a janela climática | `seasonCaveat(locale)` (`lib/engine/season.ts`) | — | texto | Texto fixo do motor. |
| Controles "E se?" (variação de temperatura −3 a +3 °C; chuva −30% a +30%) | Estado local (`deltaC`, `rainPct`) | — | °C; % | Não é persistido e não altera a análise. Quando há ajuste, aparece aviso "Visão hipotética…". |
| Calendário térmico: uma linha por cenário (cultura) e 12 células (✓ dentro, ! fora, N/D sem leitura) | `deriveRotationCalendar(nasaInsightByMonth, deltaC)` → `rows[].scenarioId`, `cropId`, `cropName`, `cells[].state`, `valueC`, `rangeC.min`, `rangeC.max`, `marginC` | NASA POWER T2M (mediana mensal) × faixa documentada (catálogo) | °C; margem em °C | Margem negativa = fora da faixa. Tooltip por célula com valor e faixa. |
| Insights com ajuste hipotético (só quando há ajuste) | `deriveSeasonInsights(calendar, applyRainChange(waterBalanceByMonth, rainPct), plantingMonth)` | Derivado | texto | — |
| Gráfico chuva × ET₀ (barras e linha) | `climate.waterBalanceByMonth[].precipMedianMm` (barras) e `et0MedianMm` (linha), com ajuste de chuva aplicado quando há controle hipotético | NASA POWER + FAO-56 | mm | Mês de plantio destacado. |
| Tabela "Tabela de dados": chuva, ET₀, balanço e "Anos completos" | `waterBalanceByMonth[].precipMedianMm`, `.et0MedianMm`, `.balanceMedianMm`, `.validYears`, `.expectedYears` | NASA POWER + FAO-56 | mm; `válidos/esperados` | — |
| Vegetação (MODIS NDVI, mediana mensal): valor por mês (2 casas) | `climate.ndvi.months[].medianNdvi` e `.month` | MODIS MOD13Q1 NDVI (Planetary Computer), série municipal válida ou fixture verificado | adimensional, 2 casas | N/D por mês quando nulo. |
| Meses de menor vegetação (em relação à série do próprio ponto) | `relativeLowVegetationMonths(climate.ndvi.months)` (`lib/climate/ndvi.ts`) | Derivado do NDVI | meses | Texto: "leitura relativa, não diagnóstico de solo nu". |
| Período e cobertura do NDVI | `climate.ndvi.period.start`, `.end`; `climate.ndvi.coveragePct` | MODIS | período; % | Quando não há NDVI: "N/D — só existe onde há série municipal válida ou fixture verificado". |
| Seletor de mês do NASA Insight (padrão: mês de plantio) | `nasaInsightByMonth[]` (escolhido pelo select) | — | mês | Trocar o mês não altera culturas nem plano salvo. |
| NASA Insight do mês: título (contraste, sinal compartilhado, observacional ou desconhecido) | `nasaInsightByMonth[].status` | Motor | texto | Textos de `copy.nasaInsight*`. |
| NASA Insight do mês: valor observado, unidade, período e cobertura | `nasaInsightByMonth[].observedValue`, `.unit`, `.period.start`, `.period.end`, `.coveragePct` | NASA POWER T2M (temperatura mensal) | °C; período; % | "N/D" quando nulo. |
| Efeitos por cenário no mês: cenário, cultura, estado, regra, faixa | `nasaInsightByMonth[].effects[]`: `scenarioId`, `cropId`, `cropName`, `state`, `ruleId`, `documentedRangeC.min`, `.max` | Catálogo de culturas; regra do motor | estado; °C | Regras: faixa térmica documentada; só precipitação histórica; clima ausente. |
| Link de fonte do insight | `nasaInsightByMonth[].sourceUrl` | NASA POWER (proveniência) | URL | Só quando há URL. |

Nota: `NasaInsightPanel` lê `nasaInsightByMonth` (12 meses). O mês exibido é controlado por um seletor local.

---

### Bloco 6 — `soil`

- **Título exibido:** "Contexto do solo" (en: "Soil context")
- **Takeaway:** "Values reported by the producer." (quando há `input.soil`) ou "Estimativa regional; não é análise do talhão." (en: "Regional estimate; not a soil test of the field.")
- **Chip de status:** "Disponível" (quando `soilContext.status === 'available'`) ou "Parcial". Tom attention quando há `input.soilObservation`, senão info.
- **Comentário do João:** Gemini, seção `soil`.

Cabeçalho do solo (`SoilVisual`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Chip de origem: "Informado pelo produtor" ou "Estimativa regional" | Presença de `input.soil` | Declarado pelo produtor ou SoilGrids 2.0 | texto | `input.soil.origin` (farmer_lab, regional_estimate, unknown) não é usado aqui. |
| Medidor "pH em água" (escala 3,5 a 9; zonas ácido < 7 e alcalino > 7) | `input.soil.ph` ou, na falta, `soilContext.staticProfile.attributes.phh2o.value` | Declarado ou SoilGrids 2.0 (0–30 cm, 5 km) | pH | N/D quando nulo. |
| KPI "Carbono orgânico" | `input.soil.organicCarbonGKg` ou `soilContext.staticProfile.attributes.soc.value` | Declarado ou SoilGrids 2.0 | g/kg | N/D quando nulo. |
| KPI "Textura" (n/3 partes preenchidas) | Contagem de areia, silte e argila não nulos | Declarado ou SoilGrids 2.0 | n/3 | N/D quando nenhuma parte. |
| Barra de textura: "Areia", "Silte", "Argila" | `input.soil.sandPct`, `siltPct`, `clayPct` ou `soilContext.staticProfile.attributes.sand.value`, `silt.value`, `clay.value` | Declarado ou SoilGrids 2.0 | %, por parte | Barra só aparece com valores. |
| "Relato do produtor": rótulos das observações | `input.soilObservation.kinds[]` (`waterlogging`, `compaction`, `erosion`, `dry_cracked`, `salt_crust`, `discoloration`, `other`) | Declarado pelo produtor | lista | Rótulos em português (e em inglês). |
| Aviso "Você relatou algo estranho no solo" (`SoilObservationNote`) | `input.soilObservation.kinds[]` e `input.soilObservation.note` | Declarado pelo produtor | texto livre (até 200 caracteres) | Texto: "Registrado como você contou… não é usado em nenhum cálculo." |

Recolhido: "Soil context in detail and soil-health comparison":

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Cartão "Contexto do solo em 30 segundos": subtítulo "<município> (UF) · pré-carregado automaticamente" | `soilContext.municipality.name`, `.uf` | IBGE malha 2025 | texto | Cartão só aparece quando há município. |
| Textura (classe) | `soilContext.staticProfile.textureClass` (very_clayey, clayey, silty, sandy, medium → rótulos) | SoilGrids 2.0 (classe estimada) | texto | N/D quando nulo. |
| pH em água | `soilContext.staticProfile.attributes.phh2o.value` e `.unit` | SoilGrids 2.0 | pH | — |
| Carbono orgânico | `soilContext.staticProfile.attributes.soc.value` e `.unit` | SoilGrids 2.0 | g/kg | — |
| Umidade radicular: valor (2 casas) e percentil ("P") e período (MM/AAAA) | `soilContext.moistureSnapshot.latest.value`, `.percentile`, `.period` | NASA POWER GWETROOT (modelado) | índice 0–1; percentil | Período no formato `MM/AAAA`. |
| Texto "Contexto regional modelado, não medição do talhão. Sem prescrição…" | texto fixo | — | texto | — |
| Profundidade e resolução SoilGrids: "0–30 cm · 5 km" | `soilContext.staticProfile.status` (texto fixo) | SoilGrids 2.0 | texto | Texto fixo quando disponível; "N/D" caso contrário. |
| Areia, silte, argila | `soilContext.staticProfile.attributes.sand.value`, `silt.value`, `clay.value` (unidade `.unit`) | SoilGrids 2.0 | % | N/D quando nulo. |
| CTC (capacidade de troca) | `soilContext.staticProfile.attributes.cec.value` | SoilGrids 2.0 | cmol(c)/kg | — |
| Densidade do solo | `soilContext.staticProfile.attributes.bdod.value` | SoilGrids 2.0 | kg/dm³ | — |
| Retenção de água a 33 kPa e 1500 kPa | `soilContext.staticProfile.attributes.wv0033.value`, `wv1500.value` | SoilGrids 2.0 | % | — |
| Referência interior municipal (lat, lon) | `soilContext.staticProfile.referencePoint.latitude`, `.longitude` | SoilGrids 2.0 (ponto de referência municipal) | graus | Só quando há ponto. |
| Link "Documentação SoilGrids" | texto e URL fixos (docs.isric.org) | SoilGrids 2.0 | link | — |
| "NASA POWER GWETROOT": último período e percentil | `soilContext.moistureSnapshot.latest.period` (`AAAA MM`), `.percentile` | NASA POWER GWETROOT | MM/AAAA; P-percentil | "N/D" quando não há série. |
| "Climatologia mensal: 2015–2025" | texto fixo | NASA POWER | texto | `moistureSnapshot.monthlyClimatology` não é exibido. |
| Ponto da grade POWER (lat, lon) | `soilContext.moistureSnapshot.gridPoint.latitude`, `.longitude` | NASA POWER | graus | Só quando há ponto. |
| Link "Metodologia hidrológica NASA" | `soilContext.moistureSnapshot.source.methodologyUrl` | NASA POWER | link | — |
| Limitações do contexto regional (lista) | `soilContext.limitations[]` | Motor | texto | — |

Recolhido: tabela "Potential soil-health context" (`SoilHealthComparison`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Diversidade de espécies | `strategies[].soilHealth[id='species_diversity']` (`state`, `value`, `detail`, `missingData`, `origin`) | `lib/engine/soil-health.ts` (`assessSoilHealth`): espécies catalogadas na sequência observada e na hipótese | estado; contagem | Estados: Sim, Não, Atenção, N/D, Observado. |
| Repetição de família | `strategies[].soilHealth[id='family_repetition']` | `lib/engine/soil-health.ts`: família da hipótese versus família da última cultura do histórico (`history.at(-1)`) | estado | — |
| Presença de cobertura | `strategies[].soilHealth[id='cover_presence']` | `lib/engine/soil-health.ts`: `crop.purposes` contém `cover` na hipótese ou nas companheiras declaradas (catálogo) | estado | — |
| Fixação biológica de nitrogênio (potencial) | `strategies[].soilHealth[id='nitrogen_fixation_potential']` | `lib/engine/soil-health.ts`: `candidate.nitrogenFixationPotential` do catálogo | estado | — |
| Período potencialmente descoberto | `strategies[].soilHealth[id='bare_soil_interval']` | `lib/engine/soil-health.ts`: sempre desconhecido sem datas verificadas e manejo informado; não é inferido | estado; meses | Mostra "Estimativa regional" quando `origin = regional_estimate`. |
| Contexto de proteção contra erosão | `strategies[].soilHealth[id='erosion_protection_context']` | `lib/engine/soil-health.ts`: presença de cobertura, sem cálculo de perda de solo | estado | — |
| Condição inicial de carbono orgânico | `strategies[].soilHealth[id='organic_carbon_context']` | `lib/engine/soil-health.ts`: `input.soil.organicCarbonGKg` (ou `organicMatterGKg`) quando informado; senão valor regional (`regionalSoil.organicCarbonGKg`, SoilGrids 2.0) | estado; valor | — |
| Variação em relação ao cenário A | Diferença de `value` vs. A (com sinal), ou "sem mudança", ou "contexto diferente", ou N/D | Derivado | "+n", "sem mudança", "contexto diferente", N/D | Só para B e C. |
| Detalhe do indicador | `strategies[].soilHealth[].detail` (en via `soilHealthDetailEn`) | Motor | texto | — |
| "Falta: …" | `strategies[].soilHealth[].missingData` via `missingLabel` | Motor | texto | — |

Nota: o texto da seção diz que as diferenças não preveem carbono, fertilidade, oferta de N, perda de solo nem produtividade.

---

### Bloco 7 — `terrain`

- **Título exibido:** "Relevo e polígono" (en: "Relief and boundary")
- **Takeaway:** "Inclinação derivada de amostras NASA SRTM." (en: "Slope derived from NASA SRTM samples.") ou "Relevo indisponível." (en: "Relief unavailable.")
- **Chip de status:** "<média>% média" ou "N/D". Tom attention quando `hotspots.sharePct > 0`, senão info.
- **Comentário do João:** Gemini, seção `terrain`.

Cabeçalho do relevo (`TerrainVisual`, quando `terrain.status === 'available'`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| KPI "Inclinação média" | `terrain.slopePct.mean` | NASA SRTM GL1 v003 (1 arc-segundo), via OpenTopoData (srtm30m) | %, 1 casa | N/D quando nulo. |
| KPI "Inclinação máxima" | `terrain.slopePct.max` | NASA SRTM GL1 v003 | %, 1 casa | — |
| KPI "Amostras ≥ 8%" (valor: % das células; barra) | `terrain.hotspots.sharePct`; limiar `terrain.hotspots.minSlopePct` (8) | NASA SRTM GL1 v003 | %, 1 casa | Cor de alerta quando > 0. |
| KPI "Faixa de altitude" (valor: altitude média; sub: mínima–máxima) | `terrain.elevationM.mean`, `.min`, `.max` | NASA SRTM GL1 v003 | m, 0 casas | — |
| Medidor "Inclinação média na grade amostrada" (escala 0 até topo; zonas abaixo de 8% e 8% ou mais) | `terrain.slopePct.mean`, `terrain.slopePct.max` (topo calculado: máximo entre 30 e o máximo arredondado para múltiplo de 5) | Derivado | % | Zonas só descrevem a escala, não julgam aptidão. |

Polígono e ponto de água (bloco do polígono em `terrain`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Resumo do polígono: "Área aproximada" | `analyzeBoundary(input.fieldBoundary).areaHa` (cálculo local, `lib/engine/boundary-context.ts`) | Cálculo geométrico | ha | Não usa `data.boundaryAnalysis`. |
| "Centroide" (lat, lon, 5 casas) | `analyzeBoundary(input.fieldBoundary).centroid.latitude`, `.longitude` | Cálculo geométrico | graus | — |
| "Vértices" | `analyzeBoundary(input.fieldBoundary).vertexCount` | Declarado (desenho) | n | — |
| "SMAP L4 · 9 km: Série histórica: N/D" | Texto fixo; `data.boundaryAnalysis.smapHistorical` (interpretação `spatialInterpretation` define o texto de relação) | SMAP L4 (SPL4SMGP v8), requer pré-processamento Earthdata | texto | Não existe valor numérico. Imagem de mapa GIBS nunca é convertida em número. |
| Texto de relação com a célula SMAP | `boundaryAnalysis.smapHistorical.spatialInterpretation` (`coarser_than_boundary` ou outro) | Derivado | texto | Menor que célula de 9 km: "contexto regional, não umidade do talhão". |
| "Ponto de água informado pelo produtor": tipo, rótulo | `input.waterPoint.kind` (rótulo: Poço, Rio, Açude, Outro), `input.waterPoint.label` | Declarado | texto | Mostrado com o polígono ou sozinho. Texto: "Apenas contexto declarado." |
| Aviso sem polígono: "Sem polígono: a declividade é o valor local em torno do ponto (cerca de 180 m)…" | `terrain.mode` (`point` quando não há polígono) | NASA SRTM | texto | — |
| Texto "Polígono é contexto espacial; não comprova propriedade" | texto fixo | — | texto | — |

Recolhido: "Relief classes, erosivity and sources" (`TerrainPanel`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Elevação (faixa mínima–máxima, ou valor único) | `terrain.elevationM.min`, `.max` | NASA SRTM | m | N/D quando nulo. |
| Declividade (média / máx.) | `terrain.slopePct.mean`, `.max` | NASA SRTM | % | — |
| Hotspots de relevo (≥ 8%): número de células e % | `terrain.hotspots.count`, `terrain.hotspots.sharePct` | NASA SRTM | células; % | — |
| Malha de amostra: espaçamento e número de células | `terrain.gridSpacingM`, `terrain.sampledCells` | NASA SRTM | m; células | — |
| Mapa de hotspots (SVG; só com polígono) | `terrain.cells[]` (`lat`, `lng`, `slopePct`, `classId`, `hotspot`); contorno de `input.fieldBoundary` | NASA SRTM; Embrapa (classes) | mapa; % por célula | Contorno tracejado branco = hotspot. Linha ciano = polígono. |
| Classes de relevo (Embrapa): seis faixas, com % de cada uma | `terrain.classShares[].classId`, `.sharePct`; faixas do catálogo `RELIEF_CLASSES` | Embrapa (Weber et al., Embrapa Uva e Vinho, cap. 5, Tabela 5.3; `lib/terrain/terrain.ts`) | % | Classes: plano, suave ondulado, moderadamente ondulado, ondulado, forte ondulado, montanhoso. |
| Nota: erro do SRTM e malha ≥ 60 m; polígono grande gera malha grosseira | `terrain.coarse` | — | texto | Texto "Este polígono é grande, então a malha é grosseira." quando `coarse`. |
| Fonte do relevo: nome do conjunto de dados e link; citação | `terrain.source.dataset`, `terrain.source.url`; citação fixa "NASA JPL (2013), doi:10.5067/MEASURES/SRTM/SRTMGL1.003" | NASA SRTM GL1 v003 | link; texto | — |
| Erosividade da chuva (Índice de Fournier Modificado, Arnoldus): valor e classe | `climate.erosivity.mfi`, `climate.erosivity.classId` (very_low, low, moderate, severe, very_severe) | NASA POWER PRECTOTCORR diário (`precipMm`) → MFI = Σp²/P sobre os 12 totais mensais de um ano (Arnoldus, 1980), `lib/climate/erosivity.ts`; classes de Arnoldus/CEC (1992) | MFI, 1 casa; classe | N/D quando nulo. |
| Anos completos da erosividade | `climate.erosivity.validYears`, `.expectedYears` | NASA POWER | "válidos/esperados" (anos completos) | — |
| Classes da erosividade (texto fixo): <60, 60–90, 90–120, 120–160, >160 | texto fixo | Arnoldus (MFI) | texto | — |
| "Perda de solo (RUSLE): N/D" | texto fixo | — | texto | Não calculado: depende de K, C, P e comprimento de rampa, que o app não tem. |

---

### Bloco 8 — `rotation`

- **Título exibido:** "Rotação e sistemas de cultivo" (en: "Rotation and cropping systems")
- **Takeaway:** "O que você cultivou e as hipóteses que vêm depois." (en: "What you grew, and the hypotheses that follow it.")
- **Chip de status:** "<n> registro(s)" (en: "<n> record(s)") com `input.history.length`. Tom info.
- **Comentário do João:** Gemini, seção `rotation`.

Visual de rotação (`RotationVisual`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| "Você cultivou": cartões em sequência (cultura, ícone, período) | `input.history[]`: `cropId`, `otherLabel`, `startYearMonth`, `endYearMonth` (nome via `cropDisplayName`) | Declarado pelo produtor | texto; `AAAA-MM → AAAA-MM` | Ícone com `cropId ?? 'unknown'`. |
| "Hipóteses": cenário, cultura e subtítulo | `strategies[].id`; `strategies[].proposedCrop.cropId`, `.name`; `strategies[].baselineAssumed`; `strategies[].title` | Motor e catálogo | texto | Subtítulo "Continuação presumida — confirmar" quando `baselineAssumed`. Sem cultura: "N/D". |
| "Prioridades em destaque" (chips) | `data.priorityHighlights[]` → "contexto hídrico da zona radicular", "potencial de cobertura", "diversidade funcional" | Declarado (prioridades) | chips | "N/D" quando vazio. |
| "Último cultivo" (somente leitor de tela) | `input.history.at(-1)` (nome) | Declarado | texto | Não aparece visualmente. |

Recolhido: "Declared cropping systems" (`CroppingSystemsSummary`, usa `strategies[0].croppingSystems`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Identificador do talhão e tipo: cultivo solteiro, consórcio simultâneo, sucessão de cultivos, rotação de sistemas | `strategies[0].croppingSystems[].plotId`, `.type` (`single`, `intercrop`, `succession`, `rotation`) | Declarado pelo produtor | texto | — |
| Períodos: cultura e datas (`AAAA-MM → AAAA-MM`) | `strategies[0].croppingSystems[].periods[].cropId`, `.startYearMonth`, `.endYearMonth` | Declarado pelo produtor | texto | `purpose` dos períodos não é exibido. |
| Espécies e famílias | `strategies[0].croppingSystems[].speciesCount`, `.familyCount` | Catálogo de culturas | n | — |
| Perene presente | `strategies[0].croppingSystems[].hasPermanentCrop` | Catálogo | texto | — |
| "Aplicado a": cenários em que o sistema se aplica | `strategies[].croppingSystems[].appliesToStrategy` (com mesmo `plotId`) | Motor | letras; "nenhuma; somente contexto declarado" | — |
| Exemplo-fonte verificado ou sistema definido pelo produtor | `strategies[0].croppingSystems[].documentedExample` | Catálogo de exemplos-fonte | texto | Sem exemplo: "evidência não é inferida". |
| "Riscos / desconhecidos" | `strategies[0].croppingSystems[].risks[]` | Motor | texto | — |
| Limitações | `strategies[0].croppingSystems[].limitations[]` | Motor | texto | — |
| Fontes (links "Referência") | `strategies[0].croppingSystems[].sourceRefs[]` | Referência de catálogo | links | — |
| Texto quando não há sistema: "Nenhum sistema de cultivo foi declarado." | `strategies[0].croppingSystems` vazio | — | texto | — |

Recolhido: "Per-scenario detail" (`StrategyCards`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Nível de validação: "Exploração climática", "Contexto regional disponível", "Validação local rastreável" | `strategies[].validationLevel` | Motor | texto | — |
| Título do cenário | `strategies[].title` (en via `scenarioDisplayTitle`) | Motor | texto | — |
| "Continuação presumida — confirmar." | `strategies[].baselineAssumed` | Declarado | texto | — |
| Link "Editar linha de base" | `strategies[].baseline` | — | link | — |
| Cultura principal (ícone, nome) | `strategies[].proposedCrop.cropId`, `.name` | Catálogo | texto | — |
| Plantio: mês | `strategies[].proposedCrop.plantingMonth` | `lib/engine/index.ts` (`strategy()`, parâmetro `plantingMonth`, padrão `input.plantingMonth`) | mês; N/D | Texto fixo "duração: não documentada" (`durationDays` é sempre nulo). |
| Texto sem cultura proposta | texto fixo | — | texto | Quando `proposedCrop` é nulo. |
| "Sequência experimental · N/4 slots" | `strategies[].configuredSlots`; `strategies[].slots[]` (`year`, `season`, `cropId`, `cropName`) | Calendário de safras (`lib/lab/assessment.ts`) | n/4 | — |
| Diversidade por slot | `strategies[].slots[].indicators` com `id === 'functional_diversity'` (`state`) | Catálogo de culturas | estado | N/D quando ausente. |
| "Por que este cenário?": explicações | `strategies[].explanations[]` (`message` via `explanationDisplay`, `ruleId`) | Regras do motor (identificadas por `ruleId`) | texto | Sem explicação: "Sem explicação adicional além dos indicadores e lacunas." |
| "Falta": lacunas do cenário | `strategies[].missingData[]` via `missingLabel` | Motor | texto | Sem rótulo: "evidência adicional". |

---

### Bloco 9 — `quality`

- **Título exibido:** "Qualidade dos dados e fontes" (en: "Data quality and sources")
- **Takeaway:** "De onde veio cada dado e quão completo ele está." (en: "Where each piece of data came from, and how complete it is.")
- **Chip de status:** "<ok>/<total> fontes" (en: "… sources"). Tom ok se todas estão disponíveis; senão attention.
- **Comentário do João:** local, `localBlockComments().quality`.

Fontes (`SourcesVisual`; uma linha por fonte de `buildSourceHealth(data)`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| NASA POWER: estado; cobertura (%); período; falta (gap) | `climate.provenance.coveragePct.T2M`, `climate.provenance.period.start`/`.end`, `climate.origin`, `climate.status`, `climate.gaps` (gap: dias sem valor válido, ou clima indisponível) | NASA POWER (MERRA-2) | estado; %; período | Estado derivado da cobertura. Estado `cache_verified` para o cache verificado. |
| GPM IMERG: estado; cobertura; período; falta | `climate.provenance.coveragePct.IMERG_PRECTOT`; período; gap (`imerg_unavailable` ou dias sem valor) | GPM IMERG via NASA POWER | estado; %; período | — |
| MODIS NDVI: estado; cobertura; período | `climate.ndvi.coveragePct`, `climate.ndvi.period.start`/`.end`; estado `nd` sem NDVI, `partial` com cobertura < 100% | MODIS MOD13Q1 (Planetary Computer) | estado; %; período | — |
| SRTM: estado; período fixo "STS-99, 2000" | `terrain.status`, `terrain.gaps` (`some_cells_without_elevation`) | NASA SRTM GL1 v003 | estado; texto fixo | Cobertura não se aplica (N/D). |
| SMAP: sempre N/D; falta "requer pré-processamento Earthdata" | `boundaryAnalysis.smapHistorical.product`, `.version`, `.temporalCoverage` | SMAP L4 (SPL4SMGP v8) | estado N/D | — |
| ZARC: estado; safra; falta (sem registro ZARC ou fora do Brasil) | `regionalContext.zarc.safra`, `regionalContext.zarc` nulo, `regionalContext.country` | MAPA ZARC | estado; safra | — |
| PAM: estado; ano; falta (sem registro PAM ou fora do Brasil) | `regionalContext.pam.year`, `regionalContext.pam` nulo, `regionalContext.country` | IBGE PAM (SIDRA 5457) | estado; ano | — |
| IBGE malha: estado; versão; falta (fora do Brasil) | `regionalContext.municipalitySource.version`, `regionalContext.municipalitySource` nulo | IBGE malha municipal 2025 | estado; versão | — |
| Resumo de estados (barra com contagens: disponível, parcial, N/D) | Contagens de `buildSourceHealth(data)` por estado | Derivado | n | Cores de borda por estado. |

Nota: a URL de cada fonte (`SourceHealth.url`) não é exibida em `SourcesVisual`.

Outros dados desta seção:

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Contexto Brasil (nota): município e código IBGE, safra ZARC, número de culturas P0 | `regionalContext.municipality.name`, `.uf`, `.code`; `regionalContext.zarc.safra`; `Object.keys(regionalContext.zarc.crops).length` | IBGE malha 2025; MAPA ZARC | texto | Texto muda para "fora do Brasil" quando `country === null`. |
| Contexto Brasil: detalhe PAM ("Produção municipal observada — PAM <ano>") | `regionalContext.pam.year`, `.products[]` (`productLabel`, `harvestedAreaHa`, `caveat`), `.caveat`, `.sourceUrl` | IBGE PAM (SIDRA 5457) | ha colhidos; texto | Sem PAM: texto "PAM: sem observação positiva coberta…" (variante conforme `pamNoteState`). |
| Botão de mapa de evidências (quando há `evidenceManifest`): contagem de fontes disponíveis | `evidenceManifest.sources[].status === 'available'` | Derivado | n | Abre um painel com as seções abaixo. |
| Painel de evidências: "Source health" | `evidenceManifest.sourceHealth[]` | Derivado de `buildSourceHealth` | texto | — |
| Painel de evidências: alegações rastreáveis | `evidenceManifest.claims[]` (`slotIndex === null` na visão geral): `label`, `observation`, `result`, `status`, `validationLevel`, `sourceIds`, `missingData` | Regras do motor | texto | — |
| Painel de evidências: lacunas | `evidenceManifest.gaps[]` (`label`, `scenarioIds`) | Motor | texto | — |
| Painel de evidências: limites (salvaguardas) | `evidenceManifest.guardrails[]` | Motor | texto | — |
| Painel de evidências: fontes | `evidenceManifest.sources[]` (`title`, `kind`, `status`, `scope`, `url`, `period`, `coveragePct`) | Ver fontes acima | texto | Campos exibidos (`components/evidence/evidence-center.tsx`): título (`title`), escopo (`scope`), período (`period`), cobertura (`coveragePct`), situação (`status`) e link `url` ("Abrir fonte"). `kind` só serve de título em inglês. |

Recolhido: "Data status and derivations" (`DataQualityPanel`):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Cada registro: rótulo e classificação ("medido", "observado", "estimado", "derivado", "cenário", "desconhecido") | `dataQuality[].label`, `dataQuality[].classification` | Motor (`lib/engine/data-quality.ts`) | texto | Ex.: "Observação climática NASA", "Solo do produtor", "Solo regional (SoilGrids)", "Contexto de saúde do solo", "Hipóteses de rotação A/B/C". |
| "Método" (fórmula) | `dataQuality[].formula` | Motor | texto | Só quando há fórmula. |
| "Unidade" | `dataQuality[].unit` | Motor | texto | Só quando há unidade. |
| "Entradas" | `dataQuality[].inputs[]` | Motor | lista separada por vírgula; "N/D" se vazio | — |
| "Incerteza" | `dataQuality[].uncertainty` | Motor | texto | Só quando há incerteza. |
| Limitações do registro | `dataQuality[].limitations[]` | Motor | texto | Juntadas com espaço. |

- **Comentário do João (local):** `localBlockComments().quality`, com a contagem de fontes disponíveis (`available` ou `cache_verified`).

---

### Bloco 10 — `next`

- **Título exibido:** "Próximos passos" (en: "Next steps")
- **Takeaway:** "O que sabemos, o que falta e a quem perguntar." (en: "What we know, what is missing, and who to ask.")
- **Chip de status:** "Revisão" (en: "Review"), texto fixo, tom info.
- **Comentário do João:** local, `localBlockComments().next`.

Recolhido na forma de cartões ("Leve esta conversa adiante"):

| Dado exibido | Campo de origem | Fonte científica | Unidade/formato | Observação |
|---|---|---|---|---|
| Título e aviso: "Personagem fictícia; a revisão humana não é validação automática." | texto fixo | — | texto | Personagem decorativo (`DemoCharacter`). |
| "O que sabemos": clima disponível ou indisponível, e "três hipóteses comparadas sob a mesma janela" | `climate.status` | NASA POWER | texto | — |
| "O que falta": lacunas de todos os cenários, sem repetição | `strategies[].missingData[]` (união) via `missingLabel` | Motor | lista | Sem lacunas: "Nenhuma lacuna crítica catalogada." |
| "Próximo passo": confirmar linha de base, ou levar hipóteses a técnico local | `strategies[].baselineAssumed` | Motor | texto | Duas variantes. |
| Botão "Ver metodologia" → `/methodology` | texto e rota fixos | — | link | — |
| Comentário local: ponto sobre linha de base presumida (quando houver) | `strategies[].baselineAssumed` | Motor | texto | — |

---

## 4. Campos de `AnalysisResult` que não aparecem na tela avançada

Lista de verificação para a migração. Estes campos existem em `lib/engine/types.ts` mas não são exibidos pelos componentes desta tela (salvo indicação). Alguns são usados em outras telas, como a exportação ou "Explore seus futuros possíveis".

- `disclaimer` (usado na exportação de resumo, não nesta tela)
- `regionalContextAvailable`
- `boundaryAnalysis.areaHa` e `boundaryAnalysis.centroid` (a tela recalcula com `analyzeBoundary`)
- `climate.lastYear`, `climate.waterContextByMonth`, `climate.frostByMonth`, `climate.rootZoneByMonth`, `climate.calendarDayContext`, `climate.seasonality.drySpells`
- `climate.gaps` (só aparece quando o clima está indisponível)
- `climate.provenance.fetchedAt`, `.missingDays`, `.warnings`, `.rawParameterNames`
- `climate.ndvi.observations`, `.validObservations`, `.fetchedAt`, `.sourceUrl`, `.origin`, `.product`, `.band`
- `nasaInsight.limitations`, `nasaInsight.attentionDecision`, `nasaInsightByMonth[].limitations`
- `strategies[].bareSoil` (usado em "Explore seus futuros possíveis", não aqui)
- `strategies[].slots[].missingEvidence`, `strategies[].slots[].sourceRefs`, e os demais indicadores de cada slot além de `functional_diversity`
- `strategies[].indicators[].sourceRefs`, `.value`, `.origin` (a origem só aparece no rótulo de `soil_context`)
- `strategies[].tradeoffs.cells[].evidence`, `.sourceRefs`, `.missing`
- `strategies[].croppingSystems[].periods[].purpose`
- `strategies[].proposedCrop.family`, `.purposes`, `.durationDays`
- `terrain.gaps`, `terrain.cells` (usados apenas no mapa)
- `soilContext.moistureSnapshot.monthlyClimatology`, `soilContext.staticProfile.generatedAt`, `.artifactId`, `.source`
- `input.soil`: `phMethod`, `phosphorusMgDm3`, `potassiumMgDm3`, `organicMatterGKg`, `drainagePerception`, `depthCm`, `observedAt`, `origin`, `sourceRef`
- `input.fieldBoundaryOrigin` (`suggested` ou `drawn`)
- `input.farmerCrops`: não é exibido nesta tela; o motor (`lib/engine/index.ts`: `permittedCatalogCrops`, `isBlockedCrop`) o usa para filtrar as culturas alternativas.
- `dataQuality[].sourceRefs`
- `warnings` (enviado ao João, não exibido)

---

## 5. Componentes que deixam de ser usados no modo avançado

Nenhum arquivo foi apagado. Esta lista só indica o que a tela avançada deixa de usar.

**Exclusivos da tela avançada** (nenhum outro arquivo do projeto os importa; podem sair junto com o modo avançado):

| Arquivo | Papel na tela avançada |
|---|---|
| `components/results/results-blocks.tsx` | Monta os 10 blocos (`buildBlocks`) e define os visuais internos (`Glance`, `Scenarios`, `SoilVisual`, `TerrainVisual`, `RotationVisual`, `SourcesVisual`). |
| `components/results/block-comments.ts` | Lista de ids dos blocos, mapa bloco → seção Gemini e comentários locais (`localBlockComments`). |
| `components/results/climate-panel.tsx` | Painel "Clima histórico NASA" (dentro de `climate`). |
| `components/results/season-panel.tsx` | Janela climática, calendário térmico, balanço hídrico, NDVI e "E se?" (dentro de `calendar`). |
| `components/results/nasa-insight-panel.tsx` | NASA Insight mensal (dentro de `calendar`). |
| `components/results/decision-cards.tsx` | Cartões A/B/C com sequência, mudanças, prioridades e faixa de honestidade (dentro de `scenarios`). |
| `components/results/scenario-comparison-table.tsx` | Tabela "Comparar critérios" e trade-offs (dentro de `scenarios`). |
| `components/results/results-details.tsx` | `StrategyCards`, `CroppingSystemsSummary`, `RegionalContextDetails` e `DecisionSummary` (dentro de `rotation`, `climate` e `next`). |
| `components/results/regional-soil-panel.tsx` | "Contexto do solo em 30 segundos" (dentro de `soil`). |
| `components/results/soil-health-comparison.tsx` | Tabela de saúde do solo por cenário (dentro de `soil`). |
| `components/results/terrain-panel.tsx` | Relevo, erosividade e RUSLE N/D (dentro de `terrain`). |
| `components/results/climate-risk-lab.tsx` | Previsão e risco de estiagem, via `/api/climate-risk` (dentro de `climate`). |
| `components/results/data-quality-panel.tsx` | Status e derivações dos dados (dentro de `quality`). |
| `components/results/visuals.tsx` | Componentes de visualização: `KpiTile`, `StackedBar`, `MonthStrip`, `WaterVisual`, `RangeGauge`, `Meter`, `TechDetails` e `MONTH_NAMES`. **Atenção:** `MONTH_NAMES` também é importado por `block-comments.ts`. |
| `components/results/export-summary-button.tsx` | Botão "Exportar resumo técnico" (só no cabeçalho da tela avançada). |
| `components/future-stories/scenario-comparison-shortcut.tsx` | Atalho "Explore seus futuros possíveis" (só usado por `scenario-comparison-table.tsx`). |

**Compartilhados** (são usados também por outras telas; não remover):

| Arquivo | Outros importadores |
|---|---|
| `components/results/analysis-results.tsx` | `app/results/page.tsx`. Abriga também a visão simples; o modo avançado é só um ramo dele. |
| `components/results/simple-comparison.tsx` | Usado por `analysis-results.tsx` na visão simples. |
| `components/results/results-heading.tsx` | `app/results/page.tsx`. |
| `components/results3/joao-guide.tsx` | `joao-note` e `joao-figure` são usados em outros lugares. O próprio `joao-guide.tsx` (`JoaoRail`, `JoaoDock`, `useActiveBlock`) só é usado pela tela avançada e por `block-comments.ts` (apenas o tipo). Se a nova tela reutiliza o painel do João é decisão da nova tela; o código não determina isso. |
| `components/results/decision-hero.tsx` | `components/demo/guided-demo.tsx`. Continua necessário. |
| `components/results/soil-observation-note.tsx` | `components/farm/layouts/use-farm-insights.ts`, `components/farm/registration-summary.tsx`. |
| `components/results2/drawer.tsx` (`Chip`, `Tone`) | Usado por `decision-cards`, `visuals`, `analysis-results` e `results-blocks` (todos em `results/`). Nenhum outro importador no projeto: todos estão em `components/results/`. |
| `components/boundary/boundary-summary.tsx` | `components/demo/guided-demo.tsx`, `components/farm/farm-timeline.tsx`, `components/atlas/location-explorer.tsx`. |
| `components/brazil-context-note.tsx` | `components/farm/farm-timeline.tsx`, `components/lab/rotation-lab.tsx`. |
| `components/evidence/evidence-center.tsx` | `components/lab/rotation-lab.tsx`. |
| `components/atlas/monthly-chart.tsx` | `components/atlas/location-explorer.tsx`. |
| `components/joao/joao-note.tsx`, `components/joao/joao-figure.tsx` | Usados por `joao-panel`, `rotation-summary-card`, `scenario-stories`. |

**Lib usada somente por esta tela ou pela rota de explicação** (informativo):

- `lib/gemini/farm-explanation.ts`: usado por `app/api/explain-farm/route.ts`, por `analysis-results.tsx` e por testes. A rota continua existindo para o João se essa for a fonte de comentários da nova tela.
- `lib/export-summary.ts`: usado pelo botão de exportação (`components/results/export-summary-button.tsx`) e por testes (`tests/unit/export-summary.test.ts`, `soil-observation.test.ts`, `decision-hero.test.ts`).
