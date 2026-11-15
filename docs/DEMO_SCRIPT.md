# Demo

1. Open Atlas and select a **Brazilian municipality** (Rio Verde remains a reproducible example). Show POWER temperature/rain, GPM IMERG rain days and root-zone context.
2. Enable **NASA SMAP**. State: dated 2025-06-30, 9 km, model value-added visual evidence—not field measurement; historical numeric SMAP needs authenticated Earthdata preprocessing.
3. Draw an exploratory boundary and carry it into the farm. Show its approximate area and whether the 9 km SMAP grid is coarser than the boundary; the sketch still does not prove ownership or agricultural use.
4. Compare Brazilian coordinates independently; emphasize that municipal context, ZARC and soil artifacts remain coordinate-specific and explicit N/D is preferable to transfer between municipalities.
5. Continue to A/B/C. First show the concrete attention sentence: month + hypothesis + NASA value outside the documented crop range. Present C as **Contexto hídrico**, not a drought-resilience claim. Show “Resposta hídrica documentada”: NASA describes historical rain days and root-zone context, while the crop catalog contributes the verified Kc peak and stage. The app does not calculate ETc, water demand or irrigation.

1. On the home page, use “Ver demonstração do Brasil”; explain that the prefilled farm is fictional and exists only to shorten the demo.
2. Show the compact journey menu and the prefilled historical crops, priorities and common planting month.
3. Explain that the planting month is a shared historical climate window, not a calendar prescription.
4. Open Laboratory; change one crop slot and show the immediate before/after delta. Emphasize that it reports changed evidence, remaining unknowns and an undo action—not a score or winner.
5. Use “Ver evidências” from that delta to open the Evidence Center already filtered to the edited scenario and slot. Show NASA, farmer input, catalog/regional sources, rule IDs and gaps in one place.
6. Open Results. The first block is the decision: "Qual rotação para os próximos 2 anos no seu talhão?" with three cards, A/B/C. Each card shows the 2-year sequence, an A → B (or C) delta such as "B troca X por Y", "Ganha em (vs. A)", "Perde em (vs. A)", "Não sabemos", the priorities, the honesty strip ("O que sabemos / O que falta / O que validar") and "Pergunte ao técnico". Confirm that the sequence matches the saved laboratory state. The criteria table (mobile tabs or desktop table) comes after the cards, and "Detalhes técnicos" (climate, NDVI, data quality, sources) stays collapsed until the audience asks.
7. Explain that Brazilian sources contextualize the catalog nationally through municipality-level records; neither is field validation nor a universal suitability rule, and raw codes are not percentages.
8. End with the decision handoff: what is known, what remains unknown and what should be reviewed with technical assistance. State: no forecast, yield, NPK, irrigation prescription, aggregate ranking, or field validation.

## Simulação do tempo no mapa para o pitch

Uso interno, não listado na navegação. Em `/explore`, acrescente `?simular=` à URL para forçar um efeito de tempo sobre o perímetro da fazenda (polígono desenhado ou exemplo marcado), independentemente do clima real:

| Valor | Efeito exibido |
|---|---|
| `chuva` | chuva |
| `vento` | vento |
| `calor` | calor |
| `nuvens` | nuvens |
| `calmo` | sem efeito marcante |

Exemplo: `/explore?simular=vento`. Valores desconhecidos voltam ao tempo real (Open-Meteo).

- A legenda mostra "[sim.]" e "Simulação do protótipo": diga isso ao público.
- O efeito é só contexto visual. Não é previsão, medição de campo nem alerta.
- Se o público perguntar pelo tempo real, desative a URL e use a leitura ao vivo (Open-Meteo, sem `simular`).
