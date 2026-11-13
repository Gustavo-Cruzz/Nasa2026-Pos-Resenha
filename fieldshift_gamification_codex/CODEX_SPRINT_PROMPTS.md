# Field Shift — Prompts de execução para Codex

**Prompt inicial:**

Leia `GAMIFICATION_SPEC.md`, `UX_WIREFRAMES.md`, os documentos atuais do projeto e `AGENTS.md`. Faça a migração incremental da interface wizard para mapa + painel de culturas + timeline + laboratório + comparação. O ponto selecionado pode estar em qualquer local do mapa mundial. Não implemente uma geofence brasileira, mas respeite a aplicabilidade regional das evidências agronômicas. Não invente scores, ciclos, janelas ou Kc. Execute **somente** o Sprint G0, registre as descobertas e pare ao concluir.

---

## G0 — Auditoria
Inspecione rotas, componentes, modelos, dados, schemas, APIs e testes existentes. Localize todos os condicionais que restringem localização a Rio Verde/GO e a lógica que pressupõe estação brasileira. Produza `docs/GAMIFICATION_MIGRATION.md` com arquivos a mudar, riscos, decisão de biblioteca de mapas, migração de `localStorage`, cobertura de evidência e plano de testes. Não redesenhe todo o app ainda. Rode validações disponíveis.

## G1 — Atlas
Implemente `/explore` com mapa global MapLibre (ou alternativa compatível aprovada), pin click/drag, lat/lon, botão exemplo Rio Verde, painel lateral com dados climáticos NASA existentes, loading/erro, fallback sem tiles. Não ative heatmap sem dataset geoespacial real. Não crie bloqueio fora do Brasil. Valide seleção por coordenadas de Brasil, Gana e Índia; liste resultados e testes.

## G2 — Deck contextualizado
Implemente `CropCard`, `CropDeck`, `CropDetailDrawer` e `EvidenceStatus`; use seis P0 e sprites disponíveis; preserve as P1 como informativas se já existirem. Mostre indicadores comprovados com fonte, outros como N/D; não classifique cultura como boa para região sem regra aplicável. Integre ao painel da localização. Teste keyboard/mobile, estados e links de fonte.

## G3 — Linha do tempo
Reaproveite o estado e validações de formulário para construir `/farm` com um evento histórico obrigatório e até dois opcionais em timeline, seleção por cards, campo outra cultura, solo opcional, irrigação e sliders. Converta versões antigas de draft, sem destruir dados. Verifique datas, sobreposição e editabilidade em 375px.

## G4 — Laboratório
Implemente `/lab` com três cenários (baseline + 2 alternativas), 2 anos e temporadas configuráveis; deck para seleção por modal acessível. Reuse engine atual; adaptações com testes para `supported`/`partial`/`insufficient_evidence`. Respeite eventos de manejo e regras de consórcio. Sem DnD obrigatório. Não gere três rotações fictícias para satisfazer UX.

## G5 — Resultados/QA
Implemente `/results` com comparação dos indicadores disponíveis, explicação, riscos, fontes e pesos. Quando dados faltarem, remover ranking agregado e exibir comparação parcial. Ajuste landing, navegação, i18n, mobile e metodologia. Rode lint, typecheck, unit, Playwright e build. Documente decisões e capturas de tela. Não afirme que o produto recomenda globalmente sem evidência.
