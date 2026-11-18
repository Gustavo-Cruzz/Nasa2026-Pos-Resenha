# Inventário reproduzível de N/D

Gerado por `npm run audit:nd`. `inventory.json` traz as 224 combinações cultura × campo, fontes e contextos; também lista 272 linhas de código com N/D ou noData para revisão. Presença de fonte não garante aplicabilidade nacional ou valor projetado no motor. Ocorrência de texto no código não equivale a N/D visto pelo usuário; a origem deve ser confirmada em casos de execução.

Lote F31-1: 56 registros aguardam revisão agronômica; 24 trazem valor com fonte e 32 permanecem sem valor; 23 têm tipo divergente do campo de palhada. Eles não entram na contagem de registros verificados nem no motor.

Dataset contextual: 17 culturas, 9 faixas (incluindo 1 condicionada à hipótese de colheita) e 8 sem ciclo terminal único. Marcos preservados em `contextualCycle.milestones` não contam como ciclo terminal. As referências ainda não são selecionadas pelo motor.

| Campo | Registro verificado | Só não verificado | Sem registro |
| --- | ---: | ---: | ---: |
| cycleDaysRange | 20 | 0 | 8 |
| idealTempC | 6 | 0 | 22 |
| viableTempC | 12 | 0 | 16 |
| soilPhRange | 12 | 0 | 16 |
| kcStages | 9 | 0 | 19 |
| residuePotential | 8 | 0 | 20 |
| nitrogenFixationPotential | 5 | 0 | 23 |
| rootingClass | 0 | 0 | 28 |

| Família da ocorrência | Sprint | Linhas |
| --- | --- | ---: |
| catalog | F31 | 5 |
| ndvi | F33 | 1 |
| regional | F32 | 1 |
| soil_terrain | F34 | 20 |
| climate | F34 | 20 |
| rotation | F30 | 75 |
| producer_input | F30 | 27 |
| spatial | F34 | 22 |
| documentation | F35 | 19 |
| presentation | F35 | 80 |
| other | F29 | 2 |

NDVI: 5556/5571 municípios disponíveis; 10 com cobertura insuficiente; 5 indisponíveis. ZARC: safra 2026/2027, 5572 municípios no índice.
