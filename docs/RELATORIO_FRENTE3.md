# Relatório: Frente 3 da auditoria do Desafio 3

**Data:** 15/11/2026 · **Branch:** `feat/frente-3-decisao` · **Base:** `AUDITORIA_DESAFIO3_FIELDSHIFT.md` (seção 3, Frente 3; seções 4 e 5, pendências)

Objetivo da Frente 3: experiência de decisão e diferencial para o pitch.

## 1. O que foi entregue

| # | Tarefa | Depois |
|---|---|---|
| 3.1 | Decisão primeiro | O `/results` abre com o título "Qual rotação para os próximos 2 anos no seu talhão?" e 3 cartões A/B/C lado a lado. Cada cartão traz a sequência de 4 slots com sprites, até 3 itens de "Ganha em" e 3 de "Perde em" e as lacunas, todos vindos da matriz de trade-offs. Traz também o alinhamento com as prioridades e "Pergunte ao técnico". O view-model fica em `lib/engine/decision-cards.ts` e o componente em `components/results/decision-cards.tsx`. Climate Risk Lab, herói, estação, relevo, NDVI, qualidade de dados e solo foram para "Detalhes técnicos" (recolhido). Resolve Q5 e P8. |
| 3.2 | Jargão | Mapa único `missingLabel` (pt-BR/en) em `lib/presentation.ts`. RuleIds, `not_validated` e Brier ficam atrás de "Ver detalhes". Strings em inglês no pt-BR (Climate Risk Lab) foram traduzidas, e o detalhe de solo e carbono orgânico ganhou versão em inglês (P9). No eixo mercado, "pior" para cobertura agora diz "perda de renda da safrinha" (Q4). |
| 3.3 | Atual × alternativa | Os cartões B e C mostram o delta A→B / A→C por slot alterado ("B troca X por Y"). |
| 3.4 | Fazenda futura | Os 4 ciclos vêm do plano real. Cada ciclo mostra P − ET0 da janela, geada e ZARC (N/D quando falta). Chuva e seca aparecem na cena quando o balanço passa de ±20 mm (`WATER_TOLERANCE_MM`), com a legenda "clima histórico, não previsão". Cada cenário traz "Ganha / Perde / Não sabemos" e a nota de solo descoberto. |
| 3.5 | Chat João | A confirmação termina com um resumo da decisão (`decisionSummary`). O chat não roda o motor nem pergunta prioridades, então o cenário apontado é inferido: problema de solo relatado → B, cultura repetida → C, nos outros casos → A. |
| 3.6 | Pitch e submissão | Inglês passou a ser o idioma padrão (a escolha salva vale). O README cita Leaflet e traz a tabela de rotas. O `/results2` redireciona para o `/results` (o mock foi apagado). Código morto foi removido. O roteiro de pitch (7 slides e vídeo de 30 s) está em `docs/PITCH.md`, e `docs/DEMO_SCRIPT.md` foi atualizado. |
| 3.7 | Honestidade como feature | Cada cartão tem a faixa "O que sabemos / O que falta / O que validar". |

## 2. Pendências

| # | Pendência | Onde resolver |
|---|---|---|
| R1 | O chat do João não coleta prioridades, e as prioridades enviadas à análise continuam iguais. | Pergunta extra no fluxo do chat |
| R2 | Textos do catálogo de culturas (ex.: potencial de fixação de N) seguem em pt na UI em inglês. | Tradução do catálogo |
| R3 | O deploy com o último commit e a gravação do vídeo ficam com a equipe. | Submissão |
| R4 | `components/results2/visuals.tsx` tem exports sem uso (CalendarVisual, NdviVisual, ScaleVisual, SoilVisual). | Limpeza |
| P5, Q3 | Kc do FAO-56 e limiares de triagem: revisão com agrônomo. | Agrônomo |
| Q1, Q2 | Sorgo e braquiária sem ciclo; ZARC com "qualquer solo". Ambos mantidos por decisão do produto. | — |
