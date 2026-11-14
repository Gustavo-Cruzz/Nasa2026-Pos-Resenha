# Plano de implementação — Field Shift rumo a 10

> Historical implementation plan. The current product scope is Brazil nationwide; no local plan artifact is generalized beyond its stated evidence.

Base: avaliação externa (a NASA não diferencia os cenários, leitura só qualitativa, campos vazios, sem sliders nem vulnerabilidade). Decisões aprovadas em 2026-11-14: (1) liberar ET0 como indicador **climático** (P − ET0), (2) NDVI MODIS numérico, (3) SMAP numérico continua fora (exige Earthdata autenticado).

## Ajuste de escopo (descoberto na investigação)
- **NDVI via ORNL DAAC não é viável ao vivo.** O serviço `modis.ornl.gov/rst/api/v1/.../subset` limita 10 datas por chamada (≈35 chamadas por ponto para 2011–2025) e respondeu 502/503 nos testes. Plano: pipeline **offline** (`scripts/fetch-modis-ndvi.ts`, com retry e blocos de 10 datas) que gera um fixture com hash para pontos exatos; o app lê o fixture e mostra **N/D** onde não houver. Nenhum valor é inventado. O fixture só entra no repositório quando o serviço responder.
- **SRTM / hotspots de erosão** ficam fora: sem fonte de solo e relevo verificada, o app mostra N/D explícito (regra do projeto: nada de dado inventado).
- **Completar culturas (fase 4)** exige fonte primária por parâmetro; não será preenchido sem fonte.

## Fase A — Pendências técnicas (rápido, baixo risco)
1. `ClientOnly` (useSyncExternalStore) em `/lab` e `/farm`: elimina o erro de hidratação por leitura de `localStorage` na renderização.
2. Worker do MapLibre 6: `setWorkerUrl('/maplibre-gl-worker.mjs')` + cópia em `public/` via `predev`/`prebuild`.
3. Checar a possível inconsistência do PAM (texto "nenhuma observação" vs. "PAM 2025" na demo).

## Fase 1 — A NASA passa a diferenciar os cenários
1. **ET0 FAO-56 Penman–Monteith diário** (`lib/climate/et0.ts`), a partir de T2M_MAX/MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN e **PS** (pressão, novo parâmetro POWER; a elevação sai da pressão). G = 0, RH média (eq. 19). Validado contra o Exemplo 18 do FAO-56 (3,88 mm/dia).
2. **Balanço hídrico climático mensal** `P − ET0` (mediana por mês entre anos completos) em `ClimateContext.waterBalanceByMonth`. Rótulo fixo: contexto climático; não é demanda da cultura, irrigação nem previsão.
3. **Calendário de 12 meses** por hipótese (compatível / atenção / N/D) derivado das faixas térmicas documentadas (`lib/engine/calendar.ts`).
4. **Insight por regra** (`lib/engine/season-insight.ts`): meses em que as hipóteses divergem, com valor NASA, faixa, fonte e ressalva; meses de déficit climático. Aparece no herói e no export.
5. UI: gráfico SVG mensal (chuva × ET0) com tabela acessível, calendário no Comparar; export Markdown com calendário e balanço.
6. Regras e docs: exceção explícita no `AGENTS.md`, `docs/METHOD.md`, `docs/SOURCES.md`.
7. Recapturar o fixture de Rio Verde com `PS` (hash e metadados novos).

## Fase 3 — Cenários "e se"
- Sliders de temperatura (−3…+3 °C) e chuva (−30…+30 %) que recalculam o calendário, o insight e o balanço (`lib/engine/what-if.ts`, função pura). ET0 não é recalculado (dito na tela). Rótulo "hipotético, não é previsão"; botão de reset. O herói segue mostrando a leitura histórica real.

## Fase 2 — NDVI (infra honesta)
- Tipos, leitor de fixture com hash e coordenadas exatas, linha de NDVI no calendário e "meses de menor vegetação" **relativos à própria série** (sem limiar absoluto sem fonte), script de coleta. Sem fixture → N/D e lacuna na Saúde das fontes.

## Fase 5 — Fechamento
- Testes unitários de tudo acima, lint, typecheck, build, verificação no navegador com dados reais (Rio Verde, Acra, Nova Délhi), `SPRINT_LOG`, commit.

## Critérios de aceite
- Na demo, ao menos um mês mostra estados diferentes entre os cenários e o insight aparece no herói.
- ET0 bate com o FAO-56 Exemplo 18 (±0,06 mm/dia); dado ausente → N/D, nunca zero.
- Nenhum texto afirma previsão, recomendação, irrigação ou produtividade.
- Sliders mudam calendário e balanço, e resetam.

## Atualização (2026-11-14, segunda rodada)
- **NDVI:** coletado via Microsoft Planetary Computer (cópias COG do MOD13Q1 v061 da NASA LP DAAC) para Rio Verde, Accra e Nova Délhi (335 composites válidos cada). O serviço do ORNL continuou fora do ar.
- **Relevo e erosão:** SRTM GL1 v003 (via OpenTopoData), classes de relevo da Embrapa, hotspots de relevo (declividade ≥ 8%) e erosividade (Índice de Fournier Modificado, Arnoldus). Perda de solo (RUSLE) segue N/D por falta de K, C, P e comprimento de rampa.
- **Culturas:** 7 registros verificados adicionados (sorgo, milho, soja, girassol, feijão). Ainda abertos: viabilidade térmica do feijão-comum, arroz de terras altas, pH do feijão-caupi e ciclo da soja.
