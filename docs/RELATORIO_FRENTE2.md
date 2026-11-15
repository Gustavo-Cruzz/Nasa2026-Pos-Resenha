# Relatório: Frente 2 da auditoria do Desafio 3

**Data:** 15/11/2026 · **Branch:** `feat/frente-2-dados` · **Base:** `AUDITORIA_DESAFIO3_FIELDSHIFT.md` (seção 3, Frente 2, e seção 4, pendências da Frente 1)

Objetivo da Frente 2: fazer os dados NASA **diferenciarem** as estratégias e materializar os trade-offs do desafio (água × solo, erosão, doenças, calendário, mercado).

## 1. O que foi entregue

| # | Tarefa | Antes | Depois |
|---|---|---|---|
| 2.1 | Janela por slot | A safrinha era lida no mês da safra (outubro). IMERG e zona radicular existiam só no mês de plantio. | Cada slot é avaliado na **janela da própria cultura** (`lib/engine/slot-window.ts`). A janela usa o ciclo documentado (`ceil(máx/30)` meses) ou uma janela **presumida e declarada** de 4 meses. Por janela: temperatura mês a mês contra a faixa da cultura, **P − ET0 acumulado** (soma das medianas mensais, contexto climático e não ETc), dias de chuva IMERG e zona radicular para os 12 meses (`waterContextByMonth`). O herói e o NASA Insight leem a cultura da safrinha no mês da safrinha (P1 e P2). |
| 2.2 | ZARC interpretado | Códigos brutos "não interpretados". | Legenda **20/30/40 % de risco** citada do *Manual do Painel do Zarc* (MAPA, p. 4). Decêndio → mês pela Portaria SPA/MAPA 386/2025. O índice guarda a tábua por município × cultura × (solo, grupo de ciclo). `lib/brazil/zarc.ts` expõe `zarcWindowStatus` (indicado / não indicado / desconhecido, com o melhor e o pior risco), `zarcYearCalendar` e `zarcSafraMonths`. Cada slot do laboratório leva sua leitura ZARC. |
| 2.3 | Matriz de trade-offs | Não existia. | `lib/engine/tradeoffs.ts`: 6 eixos (água, solo, erosão, doenças, calendário, mercado). Cada célula tem um nível relativo ao A (melhor / parecido / pior / não sabemos), as evidências com números e as fontes. Por cenário há um bloco **"Ganha em / Perde em / Não sabemos"**, com os eixos das prioridades dominantes primeiro (só ordem, sem nota). A matriz aparece na tabela de comparação. |
| 2.4 | Solo descoberto × erosão | "Período potencialmente descoberto" era sempre N/D. | `lib/engine/bare-soil.ts` monta um calendário de 24 meses a partir das janelas dos 4 slots. Os meses sem cultura são cruzados com a erosividade mensal (Fournier) e com a declividade SRTM. Os indicadores `bare_soil_interval` e `erosion_protection_context` passaram a ter valor. |
| 2.5 | NDVI dos polos | NDVI só em 3 centros urbanos. | Fixtures MODIS MOD13Q1 v061 (2010–2025, 335/335 composições) em **lavoura** (ESA WorldCover classe 40) em Rio Verde, Sorriso, LEM e Cascavel, com sha256 e proveniência. |
| 2.6 | Geada | Não existia. | `frostByMonth`: fração de anos com pelo menos um dia de Tmin ≤ 2 °C e a mediana de dias, por mês. O limite de 2 °C é declarado como "limiar de triagem", e o dano específico de cada cultura não é modelado. Se houver geada na janela, aparece um alerta no slot. |
| 2.7 | Cenário C | (resolvido na Frente 1) | O título reflete o critério usado. |
| — | Seleção de B/C | Com o catálogo novo, a demo escolhia soja→caupi e soja→feijão (repetição de Fabaceae). | B e C dão preferência a culturas de **família diferente da cultura da safra** e evitam as culturas que o ZARC **não indica** no mês da safrinha. Uma cultura sem ZARC (ex.: cobertura) não é penalizada, mas o calendário fica "não sabemos". |

### Pendências da Frente 1 resolvidas

| # | Resolução |
|---|---|
| P1, P2 | Pela tarefa 2.1. |
| P3 | `residuePotential` vem da Embrapa (Arroz e Feijão cap. 8; Algodão CT 132) para milho, arroz, milheto, guandu, braquiária e sorgo. As classes são uma regra do projeto (alta ≥ 7 t/ha, a referência da Embrapa para proteção total). Soja e crotalária ficam como "baixa" e não entram como candidatas a palhada. |
| P4 | O ciclo do caupi (60–90 dias) vem da Embrapa. Faixas térmicas e de pH do FAO ECOCROP (base atualizável) para feijão-comum, arroz, milheto, braquiária, crotalária, guandu e algodão. |
| P7 | `global-nasa-comparison.tsx` foi removido. |
| P11 | A simulação `?simular=` está documentada em `docs/DEMO_SCRIPT.md`. |
| P12 | Os exemplos do `/explore` agora são pontos de lavoura. |

### Resultado na demo (Rio Verde, prioridade solo 3 / água 2 / operação 1, verificado via `/api/analyze`)

| Eixo | A · Plano atual | B · Saúde do solo | C · Diversificação |
|---|---|---|---|
| Sequência | soja → milho (×2) | soja → sorgo (×2) | soja → braquiária (×2) |
| Água (P − ET0 na janela da safrinha) | referência (−169 mm) | **melhor** (+101 mm) | **melhor** (+101 mm) |
| Solo | referência | **melhor** (cobertura) | **melhor** (cobertura) |
| Erosão | referência | parecido (meses descobertos fora do pico de erosividade) | parecido |
| Doenças | referência | parecido (sem repetição de família) | parecido |
| Calendário (ZARC) | referência (risco 20 %) | parecido | **não sabemos** (braquiária não está no ZARC) |
| Mercado local (PAM) | milho: 352 mil ha | parecido (sorgo: 34 mil ha) | **pior** (sem área de braquiária no PAM) |

## 2. Verificação

- `npx tsc --noEmit`, `npm run lint` e `npm run build`: ok. O índice ZARC (26 MB) fica só no servidor: nenhum chunk do cliente passa de 200 KB.
- `npx vitest run`: 52 arquivos, **356 testes** (eram 310).
- Playwright: 24–25 de 25. O teste "keeps coordinate entry available when the map is unavailable" é intermitente sob carga paralela no servidor de dev (passa 3 de 3 isolado). Os 3 testes desatualizados do `/explore` foram corrigidos (seletores ambíguos e a aba do chat), sem afrouxar asserções.

## 3. Como os modelos foram usados

| Trabalho | Modelo |
|---|---|
| 2.1 + 2.6 + P1/P2 (motor climático por janela) | Sonnet |
| 2.2 ZARC (pesquisa da legenda oficial, reconstrução do índice, API) | Sonnet |
| Catálogo P3/P4 (pesquisa Embrapa/ECOCROP) | Sonnet |
| 2.3 + 2.4 + ZARC por slot + seleção B/C por família e ZARC | Sonnet (com 2 rodadas de revisão) |
| 2.5 NDVI, P7, P11, P12 | Haiku |
| Correção dos testes e2e do `/explore` | Haiku |
| Plano, divisão, revisão agronômica da demo, eixo calendário "não sabemos", verificação, commits e documentação | Opus |

## 4. Limitações e próximos passos

- **Água de B e C igual (+101 mm):** sorgo e braquiária usam a janela presumida de 4 meses, porque não há ciclo verificado para o Brasil. Ainda faltam ciclos para soja, sorgo, girassol, feijão-comum, arroz, milheto, braquiária e algodão (buscar na Embrapa).
- **Mercado "pior" para a braquiária:** o PAM não registra cobertura. Isso reflete a perda da renda da safrinha, mas o texto pode deixar mais claro que é uma cultura de cobertura.
- **Textura do solo para o ZARC:** não é inferida do SoilGrids, porque os limites de argila do Tipo 1/2/3 não foram citados de fonte primária e a safra 2026/27 usa sobretudo as classes AD1–AD6. Sem análise do produtor, a leitura usa "qualquer solo" (melhor e pior risco).
- **Limiares de triagem declarados**, não agronômicos: tolerância de 20 mm no eixo água, erosividade "alta" (termo de Fournier acima da média mensal) e declividade de 8 % ou mais.
- **Palhada após a colheita** não é modelada no calendário de solo descoberto.
- **Frente 3 (UX):** a matriz precisa subir para o topo do `/results` (3.1), e o jargão e as strings em inglês precisam sair (3.2).
