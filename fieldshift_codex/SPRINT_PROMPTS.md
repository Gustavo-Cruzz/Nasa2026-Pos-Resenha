# Prompts de implementação — executar em sequência no GPT Codex

> Instrução: coloque `PROJECT_SPEC.md` e `AGENTS.md` na raiz do repositório. Peça ao Codex para concluir um sprint de cada vez. Cada prompt pressupõe o código do anterior.

## Prompt inicial — bootstrap

Leia integralmente `PROJECT_SPEC.md` e `AGENTS.md`. O objetivo é implementar o MVP Field Shift para o Space Apps 2026. Não inicie todos os sprints de uma vez. Confirme uma decomposição de arquivos para S0, identifique dependências e riscos, depois execute S0 conforme critérios de aceite. Faça testes, anote decisões em `docs/DECISIONS.md` e registre os resultados em `docs/SPRINT_LOG.md`. Não crie dados agronômicos fictícios.

## S0 — Foundation (0–4 h)

Implemente apenas S0 de `PROJECT_SPEC.md`: scaffold Next.js App Router + TypeScript strict, Tailwind, shadcn/ui, Zod, Vitest e Playwright; páginas vazias mas navegáveis (`/`, `/explore`, `/results`, `/methodology`); componentes base responsivos; schemas Zod; dicionário pt-BR/en; scripts lint/typecheck/test/build; README. Crie AGENTS.md no repo a partir do arquivo fornecido. Os contratos de domínio devem existir sem números ou recomendações falsas. Execute checks e relate as evidências; commit `sprint-0-foundation`.

## S1 — Dados NASA (4–12 h)

Implemente somente S1: servidor NASA POWER Daily Point em `lib/climate/nasa-power.ts` e `/api/climate`, com parâmetros/período da spec; parsing, checagem de sentinelas, unidades, cobertura e erros. Crie script para coletar fixture NASA real de Rio Verde com URL completa, timestamp e SHA-256; se a API não responder, **não** preencha arquivo fictício. Implemente fallback exclusivo do piloto com selo ‘cache histórico’ e testes de URL/limites/faltantes/origem do fixture. Gere indicadores básicos de climatologia mensal e chuva por janela. Não misture dados climáticos em cálculo de recomendação ainda. Teste e faça commit `sprint-1-nasa`.

## S2 — Catálogo e wizard (12–20 h)

Implemente somente S2: 10 espécies e campos científicos com validação, sem inventar parâmetros; priorize 8 fichas P0 e deixe espécies P1 não elegíveis quando faltar validação; insira fontes dos parâmetros que conseguir verificar e registre lacunas. Implemente as cinco etapas do wizard com Zod, salvamento local versionado, solo opcional, pesos, histórico com mês/ano e baseline futuro confirmável. Exibir recorte regional piloto vs global. Criar testes de entrada e mobile. Commit `sprint-2-catalog-wizard`.

## S3 — Motor de decisão (20–32 h)

Implemente somente S3 usando funções TypeScript puras: `validateInputs`, `evaluateConstraints`, `generateCandidates`, `computeMetrics`, `rankCandidates`, `explain`; baseline editável ou presumida sinalizada; duas alternativas regionais apenas quando fontes/regras sustentarem; timeline 24 meses e bloqueio de datas conflitantes; não calcular NPK, rendimento nem irrigação precisa. Todas as estratégias devem exibir benefícios, riscos, lacunas, `ruleId`, fontes e certeza qualitativa. Fora do piloto: clima apenas e aviso honesto. Faça pelo menos 8 testes determinísticos e 3 cenários descritos em VALIDATION.md. Commit `sprint-3-engine`.

## S4 — Design e gamificação (32–40 h)

Implemente somente S4: cards pixel art com sprites originais/licenciados, barras de status derivados da análise (sem números hardcoded), modal agronômico com unidades e fontes, comparador de três estratégias, timeline e troca de prioridade em tempo real. Refinar pt-BR/en, smartphone, teclado, contraste, estados de carregamento e erros. Não alterar o motor para encaixar a UI. Usar sprites placeholder estilizados apenas se identificados como assets visuais, não dados agrícolas. Commit `sprint-4-ui`.

## S5 — Verificação e lançamento (40–48 h)

Implemente somente S5: testes unitários de limite, API, score e ausência de evidências; Playwright E2E para (a) Rio Verde com 3 estratégias, (b) fora do piloto clima only, (c) API offline com fixture válida ou erro; lint/typecheck/build; preparar deploy Vercel; escrever docs METHOD, SOURCES, VALIDATION, DEMO_SCRIPT, README final. Confirmar licença das imagens e atribuição SoilGrids. Gerar checklist de entrega com todos os critérios de aceite da spec, distinguindo OK/Parcial/Pendente. Commit `sprint-5-ship`.

## Prompt de auditoria final

Audite o projeto entregue contra `PROJECT_SPEC.md`, o enunciado NASA Space Apps Field Shift, `AGENTS.md` e os testes. Para cada promessa científica, indique fonte real, parâmetro, unidade, resolução, período e limitações; encontre números hardcoded, dados simulados disfarçados, métricas sem fonte, atribuições indevidas de NPK, erros de regionalização e inconsistências das janelas. Corrija problemas críticos e execute lint, typecheck, testes e build. Escreva um relatório final com riscos residuais — não declare validação de campo.
