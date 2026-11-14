# Field Shift — Wireframes textuais completos (desktop + mobile)

Versão 2.0 | Layouts conceituais, não imagens finais. Todos os valores abaixo são placeholders de UI **sem valores científicos inventados**.

## I. Fluxo geral

```text
[Landing / Iniciar exploração]
       |
       v
[ATLAS BRASIL /explore] -- clicar no mapa --> [PIN + PAINEL REGIONAL]
       |                                      |
       |                                      +-- [Carta de cultura] --> [Ficha detalhada]
       v
[MINHA FAZENDA /farm] -- histórico (3 cultivos) + solo + prioridades
       |
       v
[LABORATÓRIO /lab] -- baseline + alternativa 1 + alternativa 2
       |                 alterar cartas, períodos, prioridades
       v
[COMPARAÇÃO /results] -- indicadores suportados / N-D + evidências
       |
       +------------------------------------> [METODOLOGIA /methodology]
```

Todos os passos podem ser revisitados sem perder os dados. Nenhum ponto do mapa é bloqueado por país. Sem evidências agronômicas locais, o laboratório permanece exploratório, e a comparação mostra lacunas em vez de recomendações.

## II. Tela 0 — Entrada / landing

```text
+------------------------------------------------------------------------------------+
| sprout FIELD SHIFT                         Explorar  Minha fazenda   Metodologia    |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  DADOS NASA  ->  DECISÕES AGRÍCOLAS                                               |
|  Explore condições climáticas e compare rotações com evidências                    |
|                                                                                    |
|  [ EXPLORAR O MAPA ]      [ TESTAR EXEMPLO: RIO VERDE ]                             |
|                                                                                    |
|  [mini visuais de culturas pixel art]                                              |
|  Clima no Brasil  •  Diferentes estratégias  •  Incerteza explícita                |
+------------------------------------------------------------------------------------+
```

**Ações:** clicar mapa abre `/explore`; exemplo preenche somente localização demonstrativa; não afirma validação de talhão no Brasil.

## III. Tela 1 — Atlas Brasil /explore

```text
+------------------------------------------------------------------------------------+
| FIELD SHIFT             Explorar*   Minha fazenda   Laboratório   Comparar   [?]   |
+------------------------------------------------------------------------------------+
| [Buscar local opcional...]  [Lat ____] [Lon ____] [Ir] [Exemplo Rio Verde]         |
+------------------------------------------------------+-----------------------------+
|                                                      | LOCAL SELECIONADO            |
|   MAPA INTERATIVO MUNDIAL                            | [Nome quando disponível]     |
|                                                      | Lat: __ / Lon: __            |
|             [+] [-]                                  | [Dados NASA: carregando...]  |
|                                                      | --------------------------- |
|                         * PIN SELECIONADO            | CLIMA HISTÓRICO              |
|                                                      | Chuva: [valor ou N/D]        |
|   [alterar camada: dados pontuais]*                  | Temperatura: [valor/N/D]    |
|                                                      | Período / fonte / resolução  |
|                                                      | --------------------------- |
|   [attribution]                                      | CULTURAS PARA EXPLORAR       |
|                                                      | [sprite] Soja [status]       |
|                                                      | [sprite] Milho [status]      |
|                                                      | [sprite] Sorgo [status]      |
|                                                      | [ver todas / filtros]        |
|                                                      | [ USAR ESTE LOCAL ]          |
+------------------------------------------------------+-----------------------------+
| *não ativar layer raster sem dados geográficos reais                               |
+------------------------------------------------------------------------------------+
```

**Estados:** sem seleção: painel instrucional; loading: skeleton; erro NASA: ação tentar novamente + fonte indisponível; oceano: aviso de uso não agrícola; sem dado agronômico: cards apenas informativos e `Evidência local insuficiente`.

**Interações:** click, pan, zoom, pin arrastável; lat/lon alternativos; carta abre ficha; link `Ver evidência` abre painel com fonte e período; CTA salva coordenadas e vai a `/farm`.

### Painel de cultura (overlay / drawer)

```text
+--------------------------------------+
| [X] SOJA   Glycine max               |
| [PIXEL ART em destaque]              |
| Comercial  •  Fixação biológica N    |
| -----------------------------------  |
| Clima da localidade: [status + fonte] |
| Água: [valor/unidade ou N/D]         |
| Solo: [dados do usuário / estimativa]|
| Janela local: [período validado/N/D]  |
| -----------------------------------  |
| Potenciais: ...                      |
| Riscos e limites: ...                |
| Evidências: [abrir documentos]       |
| [ ADICIONAR À ESTRATÉGIA ]           |
+--------------------------------------+
```

Se contexto insuficiente, trocar CTA para `CONSIDERAR COMO HIPÓTESE` e exigir revisão antes de usar em comparação.

## IV. Tela 2 — Minha fazenda /farm

```text
+------------------------------------------------------------------------------------+
| < Voltar ao mapa                SUA ÁREA: [local + lat/lon]       [Alterar local]   |
+------------------------------------------------------------------------------------+
| HISTÓRICO DE CULTIVOS (1 obrigatório + até 2 opcionais)                             |
| [1] [sprite] [Selecionar cultura / Outra] [Início ___] [Fim ___] [editar]          |
|  |                                                                                 |
| [2] [sprite] [Selecionar cultura / Outra] [Início ___] [Fim ___] [editar]          |
|  |                                                                                 |
| [3] [sprite] [Selecionar cultura / Outra] [Início ___] [Fim ___] [editar]          |
|                                                                                    |
| [ + OUTRO EVENTO (futuro) ]        [Validar períodos]                               |
|                                                                                    |
| +---------------------------------+ +--------------------------------------------+ |
| | SOLO (OPCIONAL)                 | | MINHAS PRIORIDADES                          | |
| | ( ) Não sei                    | | Água        [----o------]                   | |
| | ( ) Análise laboratorial       | | Solo        [------o----]                   | |
| | ( ) Estimativa regional        | | Operações   [---o-------]                   | |
| | pH [__] método [__]            | | Irrigação   [Sim | Não | Não sei]          | |
| | textura [__] SOC [__]          | | Valores visíveis / explicação               | |
| +---------------------------------+ +--------------------------------------------+ |
| [Salvar rascunho]                      [ IR AO LABORATÓRIO ]                        |
+------------------------------------------------------------------------------------+
```

**Interações:** selecionar culturas via grid de cartas, não select obrigatório; digitar cultura livre para histórico; validação de datas, ordem e sobreposição (consórcio explícito); “solo não informado” continua funcional com limitações.

## V. Tela 3 — Laboratório /lab

```text
+------------------------------------------------------------------------------------+
| LABORATÓRIO DE ROTAÇÕES    Sua área: [local]   [Dados disponíveis: parcial/suporte] |
+------------------------------------------------------------------------------------+
| DECK DE CULTURAS      [Comercial] [Cobertura] [Filtrar] [Ver todas]                 |
| [sprite Soja] [sprite Milho] [sprite Sorgo] [sprite Girassol] [Caupi] [Braquiária] |
| [status fonte] [status]   [status]    [status]           [status] [status]          |
+------------------------------------------------------------------------------------+
| HORIZONTE: Ano 1 / Ano 2   [Ajustar temporadas e meses]                            |
|                                                                                    |
|  A. ATUAL (baseline)       B. ALTERNATIVA 1        C. ALTERNATIVA 2                |
|  +-------------------+    +-------------------+   +-------------------+             |
|  | Temporada A       |    | Temporada A       |   | Temporada A       |             |
|  | [sprite] cultura  |    | [+ Escolher]      |   | [+ Escolher]      |             |
|  +-------------------+    +-------------------+   +-------------------+             |
|  | Temporada B       |    | Temporada B       |   | Temporada B       |             |
|  | [sprite] cultura  |    | [+ Escolher]      |   | [+ Escolher]      |             |
|  +-------------------+    +-------------------+   +-------------------+             |
|  | Água: N/D ou ...  |    | Água: N/D ou ...  |   | Água: N/D ou ...  |             |
|  | Solo: N/D ou ...  |    | Solo: N/D ou ...  |   | Solo: N/D ou ...  |             |
|  | Riscos: [...]     |    | Riscos: [...]     |   | Riscos: [...]     |             |
|  +-------------------+    +-------------------+   +-------------------+             |
|  [Ver base]               [Duplicar A] [Editar]   [Duplicar A] [Editar]            |
|                                                                                    |
| [GERAR ALTERNATIVAS JUSTIFICADAS]   [ REVISAR COMPARAÇÃO ]                           |
+------------------------------------------------------------------------------------+
```

**Progressão por exploração:** selecionar/trocar uma cultura mostra diferenças nos indicadores sustentados. Se nenhuma das 3 alternativas pode ser calculada, demonstrar alternativas como hipóteses, com aviso claro, sem inventar notas.

**Botão sem DnD:** cada slot tem `[Escolher/Trocar]` que abre modal acessível de cards. Desktop DnD opcional. Bloqueios críticos explicados no próprio slot, não por erro genérico.

**Timeline visual:** usar `Jan–Dez` somente como meses numéricos localizados; não assumir estação chuvosa ou safra agrícola brasileira em outros hemisférios.

## VI. Tela 4 — Comparação /results

```text
+------------------------------------------------------------------------------------+
| COMPARAÇÃO DE ESTRATÉGIAS     [Voltar ao laboratório]  [Alterar prioridades]       |
+------------------------------------------------------------------------------------+
| Evidência: [Parcial / adequada]  Condições históricas NASA: período [...]           |
|                                                                                    |
| Critério                  A. Atual             B. Alternativa 1   C. Alternativa 2  |
| Água (estimativa)         [N/D ou índice]     [N/D ou índice]   [N/D ou índice]  |
| Potencial de cobertura   [N/D ou índice]     [N/D ou índice]   [N/D ou índice]  |
| Diversidade funcional    [N/D ou índice]     [N/D ou índice]   [N/D ou índice]  |
| Risco documentado        [contexto]           [contexto]         [contexto]        |
| Viabilidade operacional  [contexto/N/D]       [contexto/N/D]     [contexto/N/D]    |
|                                                                                    |
| [Ver por que A]         [Ver por que B]       [Ver por que C]                        |
|                                                                                    |
| [Benefícios] [Riscos] [Dados ausentes] [Fontes]                                    |
|                                                                                    |
| Nota: indicador relativo não é produtividade nem probabilidade.                   |
+------------------------------------------------------------------------------------+
```

**Alterar pesos:** se há score agregado válido recalcular e explicar, caso contrário não renderizar ranking. Exportação opcional JSON/PDF fora do essencial.

## VII. Tela 5 — Metodologia /methodology

```text
+------------------------------------------------------------------------------------+
| COMO CHEGAMOS A ESSES RESULTADOS?                                                   |
| [1] Fonte de clima NASA (dados históricos, limites espaciais/temporais)             |
| [2] Solo: usuário / estimativa regional / indisponível                              |
| [3] Características das culturas e fonte por campo                                 |
| [4] Método de comparação e pesos                                                    |
| [5] Níveis de evidência, riscos e o que não é possível concluir                     |
| [6] Referências clicáveis                                                          |
+------------------------------------------------------------------------------------+
```

## VIII. Mobile (<768px)

### Atlas

```text
+--------------------------------------+
| FIELD SHIFT             [menu]        |
| [Buscar ou coordenadas...]            |
|                                      |
|         MAPA (~50vh)                 |
|         [PIN] [+][-]                  |
|                                      |
|         [atribuição]                 |
+--------------------------------------+
| ┌─ arraste para expandir ───────────┐ |
| | Local • dados NASA • status        | |
| | [sprite] [sprite] [sprite]         | |
| | [Ver culturas] [Usar local]        | |
| └───────────────────────────────────┘ |
+--------------------------------------+
```

### Fazenda

```text
+--------------------------------------+
| < Mapa      Minha fazenda            |
| [Timeline vertical, um evento/linha] |
| [Solo opcional (acordeão)]           |
| [Prioridades (sliders)]              |
| [Continuar para laboratório]         |
+--------------------------------------+
```

### Lab e comparação

```text
+--------------------------------------+
| Laboratório                          |
| [Deck horizontal com scroll]         |
| [A Atual|B Alt 1|C Alt 2] (tabs)     |
| [Slots de safra/cultura]             |
| [+ Trocar cultura]                    |
| [Indicadores e alertas]              |
| [Comparar 3 estratégias]             |
+--------------------------------------+
```

Na comparação usar seletor de estratégia, mas garantir ação de contraste `Comparar critérios` para ver pelo menos dois cenários lado a lado numa tabela horizontal rolável sem perder cabeçalhos.

## IX. Biblioteca de componentes

- `WorldMap`, `MapFallbackCoordinates`, `SelectedLocationMarker`, `LocationExplorerPanel`.
- `ClimateMetric`, `EvidenceStatusPill` (sem cor isolada), `SourcePopover`, `DataGapMessage`.
- `CropSprite`, `CropCard`, `CropDetailDrawer`, `CropDeck`.
- `HistoryTimeline`, `HistoryEventCard`, `SoilPanel`, `PriorityControls`.
- `RotationBoard`, `RotationScenarioColumn`, `RotationSlotCard`, `CropSelectionDialog`.
- `ScenarioComparisonTable`, `RiskDisclosure`, `MethodologySourceList`.

## X. Microinterações e estados

| Gatilho | Feedback | Condição de segurança |
|---|---|---|
| Clique no mapa | Pin e loading no painel | Só exibir indicador após resposta válida |
| Seleciona cultura | Card destaca e abre fonte | Dados ausentes = N/D, nunca nota inventada |
| Troca slot | Pequeno highlight e atualização | Se não suportado, aviso de comparação parcial |
| Muda prioridade | Rerank quando válido | Sem dados críticos, não ranquear |
| NASA fora do ar | Banner + retry/fonte | Fixture somente se real e claramente identificada |
| Região sem evidência local | Painel de lacunas | Não confundir com solo/cultura inviável |
| Oceano | Aviso e sem rotação | Permitir explorar clima se houver dados |

## XI. Textos UX recomendados

- “Escolha qualquer ponto do mapa para explorar o clima histórico.”
- “Estas culturas estão disponíveis para exploração. A adequação local depende de evidências adicionais.”
- “Não há dados suficientes para estimar este indicador nesta localização.”
- “Esta comparação é parcial: [quais campos faltam].”
- “NASA POWER apresenta informações climáticas de uma grade regional, não medições específicas da sua parcela.”
- “Os resultados ajudam a explorar opções, não substituem avaliação agronômica local.”

## XII. Testes de experiência (cenários E2E)

1. Seleção no Brasil: selecionar Rio Verde por botão; pin e painel aparecem; usar como exemplo, não padrão obrigatório.
2. Seleção em UFs distintas: coordenadas persistem; o retorno NASA e o contexto municipal são resolvidos independentemente, sem extrapolar ZARC, solo ou artefato de uma UF para outra.
3. Seleção remota: coordenadas digitadas; funciona sem interagir com tiles.
4. Oceano: informa que o ponto não corresponde a área agrícola terrestre; sem roteiros de rotação.
5. NASA indisponível: erro, retry, sem falso indicador.
6. Histórico de três culturas: datas ordenadas, cartas, exclusão/alteração preservando estado.
7. Laboratório: duplicar baseline, alterar alternativa por teclado; rerender e justificativas.
8. Sem Kc para cultura selecionada: água = N/D; sem pontuação agregada inadequada.
9. Mobile 375px: mapa + bottom-sheet, cartas sem corte, alternativas editáveis sem DnD.
10. Metodologia: fonte por indicador e ressalva observação vs inferência visível.
