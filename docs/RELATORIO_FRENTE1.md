# Relatório: Frente 1 da auditoria do Desafio 3

**Data:** 15/11/2026 · **Branch:** `feat/frente-1-decisao` · **Base:** `AUDITORIA_DESAFIO3_FIELDSHIFT.md` (seção 3, Frente 1)

Objetivo da Frente 1: passar no primeiro corte provando que o Plantaê é uma **ferramenta de decisão de rotação** que **integra** as 4 dimensões do desafio (observações NASA, solo local, características das culturas e prioridades do produtor).

## 1. O que foi entregue

| # | Tarefa | Antes | Depois |
|---|---|---|---|
| 1.1 | Prioridades com efeito | `priorities` só gerava uma frase de destaque. `rankCandidates` e `computeMetrics` não faziam nada. | A prioridade dominante escolhe B e C: com **solo**, fixação de N documentada e depois palhada; com **água**, menor pico de Kc FAO-56 e depois ciclo mais curto; com **operação**, ciclo mais curto, usando a cultura comercial como aproximação declarada. Sem dado, o critério não é aplicado e a tela diz isso. Nova linha **"Alinhamento com suas prioridades"** (apoia / neutro / conflita / sem dado, com o motivo), sem nota numérica. O título de C passou a refletir o critério realmente usado ("Menor exposição hídrica documentada", "Ciclo mais curto documentado" ou "Diversificação"). |
| 1.2 | Metodologia | "Não são verificados e não entram em nenhum cálculo." | Explica como o histórico (cenário A), as restrições, as prioridades (B/C) e a análise de solo entram no cálculo. |
| 1.3 | Rotação como sequência de 2 anos | 1 cultura por cenário, "1/4 slots" no laboratório, e A = última cultura repetida. | O padrão safra→safrinha é detectado no histórico (`lib/lab/sequence.ts`). A = padrão atual ×2 (ex.: soja→milho, soja→milho); B = safra→cobertura; C = safra→alternativa de safrinha. O laboratório e o `/results` mostram 4/4 slots. Os indicadores de cada cenário agregam os 4 slots (`lib/engine/aggregate.ts`), e cada slot é avaliado no seu mês (`lib/engine/slot-season.ts`: safrinha no mês observado no histórico, nunca inferido). Há migração de planos antigos e botão "Restaurar sugestão". |
| 1.4 | Demo realista | Plantio em abril, soja jan→jun, milho jul→dez. | Plantio em outubro: soja 2023-10→2024-02, milho safrinha 2024-02→06, soja 2024-10→2025-02. Prioridades: solo 3, água 2, operação 1. A cultura base deixou de ser forçada. |
| 1.5 | Solo regional no motor | O SoilGrids era exibido, mas o motor mostrava "desconhecido". | O SoilGrids entra como parâmetro separado `regionalSoil`, sem ser gravado como dado do produtor, com o rótulo "Estimativa regional (SoilGrids, média municipal 0–30 cm), não é análise do talhão". A qualidade de dados ganhou um registro `regional_soil` próprio. |
| 1.6 | Catálogo | Kc de pico 1,5 (estudos de campo), "Fixação biológica de N: N/D" para soja e doenças não usadas. | **Kc pelo FAO-56** (Tabela 12, com fases da Tabela 11) para soja (1,15), milho (1,20), sorgo, girassol, feijão-comum, caupi, milheto e algodão; os registros antigos foram mantidos com `supersededBy`. **Fixação de N pela Embrapa** para soja (alta), caupi e feijão-comum (parcial), crotalária (67%) e guandu (59%), todos com URL, página e trecho literal. As notas de doença verificadas passaram a ser usadas. Os ciclos totais do FAO-56 **não** foram projetados, por decisão de produto (misturam climas). |
| 1.7 | Sair do "app de clima" | O CTA principal abria um painel de tempo real (Open-Meteo). | "Ver demonstração Brasil" virou o CTA principal. O `/explore` virou "Explore uma região": o clima NASA POWER aparece **dentro do mapa** em pixel-art (cena do mês, termômetro e barra de 12 meses), há um perímetro da fazenda (de exemplo ou desenhado) com **um** efeito de tempo atual dentro dele (chuva, vento, calor, nuvens ou calmo; só contexto), e o **chat do João** fica à direita. O zoom máximo é 17, e os tiles foram verificados em LEM e em Rio Verde. Existe uma simulação escondida, `?simular=vento\|chuva\|calor\|nuvens\|calmo`, para o pitch. |
| — | Mapa ↔ chat | O chat ignorava o mapa. | Ao escolher um local no mapa, o João pergunta "É aí a sua fazenda?" com "Sim, é aqui" / "Não". O "Sim" segue o mesmo caminho de quem digita a cidade. Depois do passo de local, um novo ponto só oferece "Quer trocar o local para X?". Ponto e perímetro são salvos (`field-shift:atlas-point` e `field-shift:atlas-polygon`) para o `/farm`. O ponto inicial padrão é ignorado, para não incomodar. |

### Resultado na demo (verificado no navegador)

| | A · Plano atual | B · Saúde do solo | C · Diversificação |
|---|---|---|---|
| Sequência | soja → milho (×2) | soja → feijão-caupi (×2) | soja → sorgo (×2) |
| Cobertura | não | caupi | sorgo |
| Fixação de N | soja: alta | soja: alta; caupi: parcial | soja: alta |
| Repetição de família | nenhuma | soja→caupi (Fabaceae) | nenhuma |

Com prioridade de água dominante (5/0/0), B passa a ser soja→sorgo e C soja→girassol.

### Correção feita no meio do caminho
Quando as sequências foram ligadas ao motor, a página de resultados passou a comparar "soja × soja × soja", porque as 3 sequências começam com soja e o motor só olhava o 1º slot. Isso foi corrigido: os indicadores passaram a ser agregados por sequência, e o herói e o NASA Insight usam a cultura que diferencia cada cenário (milho × caupi × sorgo).

## 2. Verificação

- `npm run lint`, `npm run typecheck` e `npm run build`: ok.
- `npm run test`: 45 arquivos, **267 testes** passando (eram 241).
- `npx playwright test`: navegação e histórias futuras passando. Os testes da UI antiga foram atualizados para a UI atual, e os de funções que não existem mais foram removidos (seletor Noite/Dia, sprites no atlas, comparação de 3 regiões). Foi adicionado um teste do fluxo mapa → João.
- Novos testes unitários: `priorities.test.ts`, `sequence-aggregate.test.ts`, `crop-evidence-fao.test.ts`, mais casos em `lab.test.ts` (detecção do padrão, inclusive soja→milho→soja), `analyze-route.test.ts` (solo regional sem alterar `input.soil`) e `chat-flow.test.ts`.
- Os 4 testes legados (`decision-hero`, `future-farm`, `nasa-insight`, `season`) passaram a usar o calendário do Cerrado, com a mesma intenção e a aprovação do produto.

## 3. Como os modelos foram usados

| Trabalho | Modelo |
|---|---|
| Estudo inicial: convenções, catálogo, home/explore/metodologia | Haiku |
| Estudo inicial: motor/solo, sequências/demo | Sonnet |
| Protótipos e versão final do `/explore` (HUD pixel-art, perímetro, efeitos) | Sonnet |
| Motor: 1.1, 1.5 e correção da agregação por sequência | Sonnet |
| Laboratório: 1.3 | Sonnet |
| Catálogo: 1.6 (pesquisa de fontes FAO/Embrapa) | Sonnet |
| Ligação mapa ↔ chat | Sonnet |
| 1.2, 1.4 e CTA da home; remoção de ciclos FAO e testes legados; testes e2e | Haiku |
| Coordenação, decisões, verificação no navegador, commits e documentação | Opus |

## 4. Commits

1. `feat(catalog)`: Kc FAO-56 e fixação de N Embrapa (1.6)
2. `feat(lab)`: sequências de 2 anos a partir do padrão detectado (1.3)
3. `feat(engine)`: prioridades, indicadores por sequência, solo regional (1.1, 1.3, 1.5)
4. `feat(home)`: demo do Cerrado, CTA da demo, texto da metodologia (1.2, 1.4, 1.7)
5. `feat(explore)`: HUD de clima no mapa, perímetro com tempo, chat do João (1.7)
6. `docs`: sprint F14 no `SPRINT_LOG.md`
7. `feat(explore)`: mapa ligado ao chat do João + este relatório

## 5. Pendências

As pendências estão na seção **"4. Pendências após a Frente 1"** do `AUDITORIA_DESAFIO3_FIELDSHIFT.md` (P1 a P12). As principais:

- **P1/P2:** o herói e o NASA Insight ainda avaliam a safrinha no mês da safra. Resolve-se na tarefa 2.1.
- **P3:** em Sorriso, as prioridades não trocam as culturas, porque falta dado no catálogo (palhada).
- **P4/P5:** lacunas e escolhas de faixa no catálogo, a revisar com agrônomo.
- **P12:** os exemplos do `/explore` caem no centro urbano.
