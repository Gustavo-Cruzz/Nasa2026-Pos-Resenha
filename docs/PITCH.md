# Pitch: Field Shift (Plantaê)

Audience: Desafio 3 jurors and the mentor. Language: English (the app runs in pt-BR by default; the demo can be switched with the locale control).

The pitch answers the mentor's three questions in order. Each slide and each line of the video script names the question it answers.

1. Which rotation decision does the tool help the farmer make?
2. How do NASA data combine with soil, crops and priorities?
3. Can the farmer compare strategies with benefits, limitations and risks?

## 7-slide outline

**Slide 1 · Title and the decision**
- Title: "Field Shift: which crop sequence for the next 2 years on my field?"
- One line: NASA Earth data, a farmer's own history, and honest gaps, in one decision view.
- Visual: the results page heading, exactly as the farmer reads it: "Qual rotação para os próximos 2 anos no seu talhão?"

**Slide 2 · Question 1: which decision?**
- The decision is the next two years of crops on one field: keep the current sequence (A, "o que você faz hoje") or switch to B or C.
- The tool does not pick a winner and does not forecast yield. It frames three exploratory hypotheses to discuss with a technician.
- Visual: the three scenario cards side by side, with the four-slot sequence (2 years × 2 seasons) under each.

**Slide 3 · Question 2: how NASA combines with the farm**
- NASA POWER: temperature and rain, historical monthly window.
- NASA GPM IMERG: rain days. NASA SMAP: root-zone moisture (9 km, shown as model value-added evidence, not field measurement).
- Farm inputs: the farmer's history of crops, the planting month, soil pH (typed by the producer; SoilGrids as regional context), and priorities (water, soil, operations).
- Crop catalog: FAO-56 crop coefficients (Kc) and documented thermal ranges, with ZARC municipal context in Brazil.
- Visual: a flow from the inputs into one engine, with each NASA source labelled.
- Honest limit: priorities change the alignment and the wording of each card. Today the catalog has one documented candidate per role in some regions, so a priority change does not always change the crop.

**Slide 4 · Question 3: benefits, limits and risks**
- Each card lists "Ganha em (vs. A)", "Perde em (vs. A)" and "Não sabemos", measured against the farmer's current sequence.
- The A → B delta shows the exact swap, for example "B troca X por Y", per season.
- Visual: one real card from the Brazil demonstration (Rio Verde), with its delta strip.

**Slide 5 · Honesty as the feature**
- The honesty strip on every card: "O que sabemos / O que falta / O que validar".
- Missing evidence is shown as N/D, never filled with a guess.
- Visual: the honesty strip under a card, with its N/D entries visible.

**Slide 6 · The farmer's journey and the story of the future farm**
- The João chat collects the farm in a few questions and opens the results. The demo button "Ver demonstração Brasil" starts from a prefilled, fictional farm.
- The laboratory lets the farmer change one crop slot and see the before/after delta, with an undo action.
- "Histórias da fazenda futura" (`/future-stories`) plays the same scenarios as a story over the cycles, illustrated.
- Visual: three screenshots in sequence: chat → results → laboratory delta.

**Slide 7 · What it does not do, and the ask**
- Does not calculate yield, NPK, irrigation or ETc. Does not validate a field, and does not confirm ownership of a boundary.
- Next: agronomist review of the declared thresholds and Kc choices, and more verified crop cycles for Brazil.
- The ask: try the demo, and tell us which of the three answers you would challenge.

## 30-second video script

Target: about 75 words, spoken at a calm pace. Scene notes are in brackets.

[0:00–0:05 · Title card, results heading]
"Which crop sequence should a farmer plant over the next two years? Field Shift helps answer that question."

[0:05–0:12 · Scenario cards A, B, C] (Question 1)
"Our results page compares three scenarios on the farmer's own field: keep today's sequence, or switch to B or C. It is a decision view, not a forecast."

[0:12–0:19 · Climate and soil inputs flowing into the cards] (Question 2)
"It combines NASA rain, temperature and root-zone moisture with the farm's history, its soil and its priorities, and with documented crop coefficients."

[0:19–0:27 · One card: "Gains", "Loses", "We don't know", honesty strip] (Question 3)
"Every card shows what it gains, what it loses against today, and what we do not know. Missing data is marked N/D, not guessed."

[0:27–0:30 · Title card]
"Field Shift. Honest comparisons for the next crop, not a promise of yield."

## Presenter notes

- The demo path: home → "Ver demonstração Brasil" → `/results?demo=brasil` (Rio Verde, fictional prefilled farm). Then open the laboratory and change one slot to show the delta.
- Optional, weather context on the map only: `/explore?simular=vento` (or `chuva`, `calor`, `nuvens`, `calmo`). This is a hidden demo switch that forces a weather effect on the farm area regardless of the real weather. It is documented in `docs/DEMO_SCRIPT.md`. Always say it is a prototype simulation; it is not a forecast, field measurement or alert. Remove the parameter to return to live Open-Meteo weather.
- Do not show `/results2`: it is hidden and redirects to `/results`.
- If a juror asks about real-time weather, drop the `simular` parameter and use the live reading.
