# Como usar este pacote no Codex

1. Copie `GAMIFICATION_SPEC.md`, `UX_WIREFRAMES.md` e `CODEX_SPRINT_PROMPTS.md` para a raiz do projeto ou `docs/`.
2. Atualize o `AGENTS.md` existente: **substitua** a regra antiga `climate_only fora de Rio Verde` por uma avaliação por disponibilidade/aplicabilidade de evidências. Não mantenha dois requisitos conflitantes.
3. Comece com o prompt G0 de auditoria; execute um sprint por vez. Não altere dados científicos sem fonte.
4. Verifique em cada sprint `lint`, `typecheck`, `test` e `build` (e teste E2E quando aplicável).
5. O escopo de produto é Brasil nacional: coordenadas brasileiras recebem contexto municipal quando houver evidência. A exploração ambiental global é técnica e não significa recomendações agronômicas verificadas fora do Brasil.

Não sobrescreva a documentação existente sem inspecionar incompatibilidades. Os arquivos deste pacote descrevem uma evolução do produto.
