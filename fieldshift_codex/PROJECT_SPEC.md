# FIELD SHIFT — Especificação de projeto para GPT Codex

> Versão 1.0 · 12/11/2026 · NASA Space Apps Challenge 2026 · MVP de 48 horas
> Status: especificação de implementação, **não** validação agronômica.

## 0. Produto e decisões inegociáveis

**Problema:** agricultores precisam comparar estratégias de rotação sob variações climáticas, limitações do solo e prioridades individuais.

**Produto:** web app gamificado, responsivo e bilíngue (pt-BR/en) que recebe localização, três cultivos recentes e dados opcionais do solo, consulta/sumariza dados históricos reais da NASA e compara **três estratégias de rotação** para os próximos 24 meses (incluindo linha de base), exibindo benefícios potenciais, limitações e evidências.

**Proposta de valor:** “Built for the world. Contextualized with Brazilian sources. Powered by NASA.”

**Regra geográfica (MVP Brasil 1):** análise por coordenadas globais sempre retorna três cenários exploratórios, sem alegação de recomendação agronômica. Coordenadas no Brasil são associadas à malha municipal versionada do IBGE e cruzadas com a Tábua de Risco ZARC da safra carregada. Somente uma cultura com registro no município identificado pode receber `regionally_contextualized`; ausência de registro permanece lacuna, nunca inadequação. `locally_validated` continua reservado a futura validação humana/campo rastreável. A coordenada não confirma propriedade, talhão nem uso agrícola do solo.

**O que a aplicação NÃO faz:** previsão meteorológica, previsão precisa de produtividade, cálculo quantitativo de variação de NPK/SOC, prescrição agronômica, recomendação fitossanitária universal, previsão de preço, identificação da condição real de cada talhão por uma grade climática regional.

**Princípios:** dados NASA reais e rastreáveis; regras explícitas e testáveis; não inventar dados agronômicos; nenhuma variável ausente convertida em zero; incertezas visíveis; ranking comparativo ≠ probabilidade de sucesso; camadas climática e agronômica desacopladas.

## 1. Stack, arquitetura e configuração

- **Next.js App Router + TypeScript strict + React**; Tailwind CSS, shadcn/ui, Lucide, Recharts; Zod para entradas; Vitest para lógica e Playwright para fluxo E2E.
- **Sem banco de dados, login ou serviços com API key** no MVP. Persistir somente rascunho da sessão do navegador via `localStorage` com versionamento e botão “Limpar dados”. Não armazenar coordenadas em logs.
- **Backend mínimo** em `app/api/*` como proxy e orquestrador para NASA POWER; motor de recomendação como funções TypeScript puras (`lib/engine/*`) e serializáveis.
- **Deployment:** Vercel; URL pública HTTPS. Não depender de persistência em disco no servidor. Fixtures validadas no repositório e cache HTTP/Next para evitar chamadas repetidas; eventuais caches devem respeitar a infraestrutura do hosting.
- A primeira execução deve passar `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. Incluir `.env.example` se necessário; preferir zero secrets.
- Não criar microserviços, workers, IA generativa, banco vetorial, autenticação, mapas GIS pesados nem arquitetura de plugins abstratos.

### Estrutura sugerida

```text
app/
  page.tsx                         # landing + CTA
  explore/page.tsx                 # wizard 5 passos
  results/page.tsx                 # comparação de rotações
  methodology/page.tsx             # ciência e limitações
  api/climate/route.ts             # NASA POWER ou fixture autenticada
  api/analyze/route.ts             # análise validada (opcional; pode ser client-side)
components/
  wizard/LocationStep.tsx
  wizard/HistoryStep.tsx
  wizard/SoilStep.tsx
  wizard/PrioritiesStep.tsx
  crops/CropCard.tsx
  crops/CropDetailsDialog.tsx
  results/RotationComparison.tsx
  results/RotationTimeline.tsx
  results/EvidenceList.tsx
lib/
  schema.ts                        # Zod + tipos
  catalog.ts                       # carregamento e validação de datasets
  climate/nasa-power.ts            # URL, fetch, parsing, checagem de lacunas
  climate/indicators.ts            # séries => indicadores climáticos
  engine/constraints.ts            # inviabilidade e desconhecido
  engine/candidates.ts             # estratégias candidatas regionais
  engine/score.ts                  # avaliação multicritério
  engine/explain.ts                # explicações vinculadas a regras
  i18n.ts
  provenance.ts
  region.ts                        # registro de pilotos
  storage.ts                       # rascunho versionado
  fixtures/*.test.ts
 data/
  crops.json                       # 10 culturas, campos desconhecidos = null
  regional-rules-rio-verde.json    # restrições regionais com citações
  nasa-power-rio-verde.json        # fixture NASA real, somente se coletada
  nasa-power-rio-verde.meta.json   # URL, período, data, unidades, SHA256
  soil-rio-verde.json              # opcional, somente se licitamente obtido
 docs/
  METHOD.md
  SOURCES.md
  VALIDATION.md
  DEMO_SCRIPT.md
  SPRINT_LOG.md
 tests/
  unit/
  e2e/
 public/sprites/                      # artes licenciadas/originais
 AGENTS.md
 README.md
```

## 2. Cadastro e interface

### Jornada principal

1. **Selecionar localização:** atalho “Piloto: Rio Verde (GO)”, além de formulário de latitude/longitude para análise global. Não usar geolocalização obrigatória; coordenadas válidas: lat [-90, 90], lon [-180, 180]. Se escolher coordenadas externas, bloquear apenas o motor **regional**, nunca os dados climáticos.
2. **Histórico:** 3 eventos anteriores `{cropId, startYearMonth, endYearMonth}` em ordem cronológica; ano/mês obrigatórios. Aceitar “não sei” para culturas não catalogadas com `otherLabel`, mas marcar compatibilidade histórica como incompleta. Não confundir três eventos com três anos.
3. **Solo (opcional):** pH (0–14), areia/silte/argila (% somando ≈100, apenas quando todas informadas), carbono orgânico (g/kg), profundidade de amostragem e data. Origem `farmer_lab | regional_estimate | unknown`. Nenhum SOC/pH estimado deve ser rotulado como medição local. Entradas parciais são permitidas.
4. **Prioridades:** conservação de água, saúde do solo e adequação comercial/operacional. Usar pesos normalizados com presets “equilibrado”, “água”, “solo”, “operacional”; irrigação `rainfed | irrigated | unknown`; permitir restrição de culturas sem mercado local.
5. **Resultado:** 3 cenários exploratórios para horizonte de 24 meses: `A` continuidade, `B` foco em cobertura/solo, `C` resiliência hídrica. Um único mês de plantio (1–12) é a janela climática comum. Sem ciclo verificável, exibir mês e duração desconhecida, sem inventar datas. Para cada cenário: indicadores qualitativos, justificativa, alertas, fontes, nível de evidência e lacunas.

### Baseline obrigatório

A linha de base é a **intenção de rotação atual do agricultor**. Se não informada, criar uma **hipótese editável** de continuação com base na sequência recente; rotular “Continuação presumida — confirmar”. Nunca apresentar as três safras passadas como se fossem automaticamente o plano futuro. Comparar alternativas sempre contra a mesma janela temporal de 24 meses.

### Design

- Estética pixel art **somente na camada visual**: sprites estáticos SVG/PNG originais/licenciados, cartões acessíveis e barras de status calculadas dinamicamente.
- Cartão resumido: sprite, nome, família, finalidade, consumo relativo de água **no cenário**, função na rotação, nível de evidência.
- Modal detalhado: parâmetros, fonte, unidade, janelas, compatibilidade local e `unknown` quando não houver dado.
- Comparação: três colunas (desktop), cartões empilhados (mobile), timeline dos dois anos, barras individuais (sem esconder trade-offs em nota única), botão “Por que?”.
- Legendas que separem claramente **observação NASA**, **estimativa de solo** e **inferência baseada em regras**.
- `pt-BR` padrão, troca para `en`, sem textos hardcoded fora do dicionário; WCAG básico, navegação teclado, loading/empty/error states, reduced motion.

## 3. Catálogo agronômico e fontes

**10 espécies fixas:**

| ID | Espécie | Nome comum | Prioridade |
|---|---|---|---|
| `soybean` | Glycine max | soja | P0 |
| `maize` | Zea mays | milho | P0 |
| `sorghum` | Sorghum bicolor | sorgo granífero | P0 |
| `sunflower` | Helianthus annuus | girassol | P0 |
| `cowpea` | Vigna unguiculata | feijão-caupi | P0 |
| `pearl_millet` | Cenchrus americanus (sin. Pennisetum glaucum) | milheto | deferred |
| `ruziziensis` | Urochloa ruziziensis | braquiária-ruziziensis | P0 |
| `sunn_hemp` | Crotalaria juncea | crotalária-júncea | deferred |
| `cotton` | Gossypium hirsutum | algodão | P1 |
| `pigeon_pea` | Cajanus cajan | feijão-guandu | P1 |

**Cada registro:** `id`, `commonNames`, `scientificName`, `family`, `purposes[]`, `commercial`, `cycleDaysRange`, `idealTempC`, `viableTempC`, `soilPhRange`, `kcStages`, `residuePotential`, `nitrogenFixationPotential`, `rootingClass`, `regionalWindows[]`, `knownRisks[]`, `sourceRefs[]`, `parameterStatus` (`verified | provisional | missing`). Propriedades agronômicas com valores não disponíveis devem ficar `null` e ter fonte ausente, não defaults de conveniência. Não atribuir `Kc`, tolerância ou calendário por dedução de LLM sem documento científico verificável. Resolver sinônimos científicos via nomes estáveis.

**Para P0:** fichas científicas de seis culturas: soja, milho, sorgo granífero, girassol, feijão-caupi e *Urochloa ruziziensis*. Milheto e crotalária-júncea permanecem no catálogo/arte para versões futuras, mas ficam excluídos da pesquisa prioritária e das recomendações MVP. Evidência de outra localidade brasileira deve conservar sua localização e não validar calendário de Rio Verde. **Para P1:** algodão e guandu podem ser mostrados no catálogo, mas desativados para recomendação se calendário/parâmetros ainda não forem validados.

**Solo:** `SoilProfile` com pH, areia/silte/argila e SOC opcionais + `origin`, `depthCm`, `observedAt`, `sourceRef`. A API REST SoilGrids está pausada; dados regionais são arquivos pré-processados **somente quando realmente obtidos**, com licença CC BY 4.0 e metadados; se não, usar apenas preenchimento manual e `unknown`. Nunca inventar dados regionais.

## 4. Dados da NASA — contrato técnico

Documentação: https://power.larc.nasa.gov/docs/services/api/temporal/daily/

**Endpoint:** `https://power.larc.nasa.gov/api/temporal/daily/point`

**Consulta padrão (servidor):** `community=AG`, `format=JSON`, `time-standard=UTC`, `start=20110101`, `end=20251231`, `latitude`, `longitude`, `parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN`. Confirmar cada parâmetro no endpoint real e tratar indisponibilidade por parâmetro. Escolha de período: 15 anos completos, nunca misturar 2026 incompleto com anos completos.

**Resposta normalizada:** lista diária `{date, tmeanC, tmaxC, tminC, precipMm, rhPct, windMps, solarMjM2Day}` com nulos explícitos; `{source:'NASA_POWER', requestedCoordinates, period, fetchedAt, rawParameterNames, sourceUrl, timezone:'UTC', coveragePct, missingDays}`. Converter unidade de radiação **somente após verificar metadados da resposta**.

**Normalização e qualidade:** rejeitar lat/lon inválidas, rejeitar `-999`/sentinelas/nulos, valores fora de faixa física plausível e cobertura insuficiente; preservar dias ausentes como `null`; gerar percentis somente sobre períodos comparáveis. Cobertura mínima sugerida como regra de engenharia: pelo menos **80% dos dias válidos da variável na janela analisada**; rotular esse limiar como convenção de MVP, não padrão NASA.

**Indicadores:** climatologia mensal por mediana e faixas históricas; chuva acumulada por janela; frequência de períodos secos sob limiar documentado; dias acima de temperatura crítica por cultura/fase quando existir referência; distribuição histórica em anos equivalentes (sem previsão). Não declarar que o valor de grade é dado de talhão.

**Cache/fallback:** endpoint ao vivo com timeout e mensagens claras; cache de chamadas idênticas; script `scripts/fetch-nasa-fixture.ts` para baixar **dados reais** antecipadamente para o piloto, gerar JSON e sidecar com URL, timestamp e SHA-256. Se NASA estiver indisponível: usar fixture **somente na coordenada/período compatíveis** e exibir “Dados NASA históricos em cache (capturados em DATA)”; sem fixture verificada => erro recuperável e **nunca** usar séries simuladas como NASA. Não usar fixtures do piloto para outra coordenada.

## 5. Motor agronômico — regras e rastreabilidade

### Estrutura de cada decisão

1. **`validateInputs`** via Zod.
2. **`evaluateConstraints`**: calendário regional, duração do ciclo, compatibilidade térmica, incompatibilidade grave de pH quando comprovada, água/irrigação, equipamento/mercado e proibições documentadas. Estados `pass | warn | fail | unknown`. `unknown` reduz certeza e pode bloquear recomendação se afetar regra crítica; nunca transformar desconhecido em `pass`.
3. **`generateCandidates`**: templates regionais (incluindo consórcios predefinidos quando validados) para 24 meses; **não** combinar culturas livremente. Respeitar ordem e início/fim dos eventos, impedir sobreposições não declaradas, diferenciar consórcio e sucessão; incluir baseline confirmado/presumido.
4. **`computeMetrics`**: adequação térmica, risco hídrico histórico, cobertura potencial, diversificação funcional, possíveis alertas de nutrientes/fitossanidade e adequação operacional. Sempre retornar fonte da regra e tipo de evidência.
5. **`rankCandidates`**: normalizar somente métricas com comparabilidade e boa fundamentação; pesos do produtor; não somar métricas desconhecidas fingindo 0. Reponderar pesos presentes **e avisar**; não ranquear se informação essencial insuficiente. Notas 0–100 são **heurísticas relativas**, não estimativas físicas de produtividade, risco probabilístico ou saúde do solo.
6. **`explain`**: para cada benefício e risco: frase, `ruleId`, `inputsUsed`, `sourceRefs[]`, `certainty` (high/medium/low) e `missingData[]`.

### Água (escopo matemático)

Se houver ET₀ diário calculado de maneira válida/documentada e coeficientes Kc por fase verificados: `ETc(day) = Kc(day) × ET0(day)` (FAO-56). Não presumir ET₀ simplesmente porque há temperatura e chuva; implementá-lo apenas com equação e dados/unidades documentados, testes contra referência. Se não pronto, usar indicador comparativo **precipitação histórica na janela versus exigência hídrica publicada** e chamá-lo “triagem hídrica”, não “necessidade de irrigação”.

A primeira entrega *não* estima mudança exata de NPK, carbono, rendimento, economia em dinheiro ou erradicação de pragas.

### Exemplo de contrato de resultado

```ts
export interface RotationResult {
  id: 'A' | 'B' | 'C';
  titleKey: string;
  baseline: boolean;
  baselineAssumed: boolean;
  horizonMonths: 24;
  timeline: Array<{
    cropIds: string[];
    startYearMonth: string;
    endYearMonth: string;
    mode: 'single' | 'intercrop' | 'cover';
  }>;
  feasibility: 'pass' | 'warn' | 'fail' | 'unknown';
  score: number | null;
  metrics: Array<{
    id: string;
    value: number | null;
    unit?: string;
    labelKey: string;
    relative: boolean;
    evidenceRefs: string[];
  }>;
  explanations: Array<{
    kind: 'benefit' | 'risk' | 'limitation';
    messageKey: string;
    ruleId: string;
    sourceRefs: string[];
    certainty: 'high' | 'medium' | 'low';
  }>;
  missingData: string[];
}
```

**Regras exemplares** (codificar somente se há referência/região): calendário fora da janela => `fail/warn`; cultura de cobertura em período com risco de seca => apresentar simultaneamente possível proteção e consumo de água; fixação biológica N => mecanismo potencial, nunca “+N kg/ha”; família repetida => diversidade baixa, **não** diagnosticar patógeno específico; ausência de análise de solo => não afirmar deficiência ou reposição quantitativa.

## 6. Contratos de API

- `GET /api/climate?lat=<n>&lon=<n>` → `{status:'ok', origin:'live'|'verified_fixture', climateSummary, provenance, warnings}`; `400` entrada inválida, `503` NASA indisponível sem fallback autorizado. Implementar cache e limites básicos de requisições.
- `POST /api/analyze` com `{location, lastThreeCrops, futureBaseline?, soil?, priorities, irrigation}` → `{scope:'pilot_recommendation'|'global_climate_only', strategies, climateSummary, warnings, provenance}`; `422` campos inconsistentes. A função pura do motor deve poder ser usada sem API para testes.
- `GET /api/catalog` (opcional; ou import direto) → espécies e `parameterStatus`.
- Todos os erros com código legível, mensagem traduzível e sem expor stack trace ou dados privados.

## 7. Sprints e critérios de aceite (48 horas)

| Sprint | Janela | Objetivo e entregáveis | Critérios de aceite |
|---|---:|---|---|
| **S0 — Foundation** | 0–4 h | Scaffold, lint/typecheck/test/build, tokens de design, layout, AGENTS.md, schemas, README, mock navigation | Página inicial e wizard renderizam; comandos verdes; tipos sem `any` desnecessário |
| **S1 — NASA & provenance** | 4–12 h | Adaptador POWER, normalização, QA, fixture real do piloto + metadata, endpoint, indicadores | NASA usada de fato; 3 testes de parsing/ausências; fallback nunca usa fixture em outro local |
| **S2 — Catálogo & entrada** | 12–20 h | 10 fichas, 6 P0 priorizadas, 2 P1 exploratórias, wizard 5 passos, validação, solo opcional, presets de prioridade, rascunho | Formulário completo funciona no celular; entradas inválidas bloqueadas; dados ausentes preservados |
| **S3 — Engine** | 20–32 h | Baseline explícita/editável, 3 estratégias, filtros, ranking, explicações e `unknown` | 3 casos de validação agronômica; riscos e fontes por estratégia; fora do piloto sem recomendação regional |
| **S4 — Pixel art & polish** | 32–40 h | Sprites, CropCards, modal técnico, timeline, comparação, i18n, mobile/a11y | Status reais computados, sem números falsos; navegação teclado; visual pronto para demo |
| **S5 — Validation & ship** | 40–48 h | Testes unit/E2E, build, deploy, README, metodologia, ciência, fontes e roteiro de demo | Demo ponta a ponta sem incidentes críticos; URL pública; documentos e limites declarados |

### Gates (não seguir adiante sem estes pontos)

- **Gate A ao fim S1:** acesso a NASA real + uma fixture verificada para Rio Verde. Se indisponível, documentar bloqueio e priorizar análise manual com erro honesto; **não fabricar o dado**.
- **Gate B ao fim S3:** usuário compara baseline e duas opções defensáveis **ou** vê indisponibilidade justificada. Ranking sempre contém explicações e fontes.
- **Gate C ao fim S5:** fluxo funciona em navegador limpo, sem ambiente local e sem secrets.

### Critérios de corte se atrasar

1. Cortar mapa interativo (coordenadas continuam).
2. Cortar animações e ícones secundários (manter cards legíveis).
3. Cortar algodão/guandu das recomendações (manter catálogo).
4. Cortar ET₀ se não validado (manter triagem climática explícita).
5. Cortar segundo idioma **apenas** se o fluxo científico já estiver estável; manter nomes dos campos centralizados para tradução posterior.
6. **Nunca cortar** uso real de dados NASA, comparação de rotações, explicações, riscos, fontes e honestidade sobre incerteza.

## 8. Plano de testes (mínimo)

**Unitários:**
1. Coordenadas inválidas => `400`.
2. Resposta NASA com `-999`, `null` ou data faltante => ausente, não zero.
3. Agregação de chuvas usa apenas dias válidos e registra cobertura.
4. Latitude diferente da fixture não usa fixture regional.
5. Solo parcial é aceito e mantém `origin`/unidades.
6. Calendário fora da janela produz falha/alerta com evidência.
7. Peso do produtor muda ranking em um conjunto **sintético de testes**, sem atribuir valores fictícios às culturas reais.
8. Estrategia com métrica crítica desconhecida não recebe falso `100`.
9. Baseline presumida sempre tem marcador e pode ser alterada.
10. Exposição de risco hídrico de cultura de cobertura não desaparece pela vantagem de biomassa.
11. Sequências sobrepostas só são aceitas quando explicitamente definidas como consórcio.
12. Renderização bilíngue preserva unidades e labels.

**E2E:** (a) piloto Rio Verde -> histórico -> solo desconhecido -> prioridade água -> três estratégias e fontes; (b) coordenadas fora do piloto -> dados climáticos e aviso de indisponibilidade regional; (c) falha de API -> fallback verificado com indicação, ou erro honesto.

**Validação científica manual:** três cenários documentados: maior exposição à seca; repetição de culturas; trade-off cobertura × água. Revisar com fonte e, se possível, especialista local. Não dizer “validado em campo” sem validação real.

## 9. Definição de pronto (DoD) e demonstração

- Implementação e testes ligados a requisitos; sem botões inertes, placeholders disfarçados de resultado, ou saídas com dados inventados.
- Pelo menos um fluxo com NASA real e metadados exibidos; linha de base + duas alternativas interpretáveis (ou limitação explícita onde inviável); 8 cartas principais; design responsivo.
- Toda estimativa separada de observação, unidades corretas, datas/períodos informados, método e fontes acessíveis.
- `README.md` com execução/deploy, arquitetura, escopo, limitações, dados, licenças, decisões de design; `METHOD.md` com fórmulas/pesos/limiares; `SOURCES.md` com URLs; `VALIDATION.md` com cenários; `DEMO_SCRIPT.md` com apresentação de 2–3 minutos.

**Roteiro de demo (2–3 minutos):** abrir Rio Verde → inserir histórico soja/milho/soja (datas plausíveis e explicitamente de exemplo) → solo opcional → alternar objetivo água/solo → comparar linha de base + alternativas → abrir “Por quê?” → mostrar NASA POWER e data do dado → finalizar com potencial de expansão global e limites locais.

## 10. Instruções obrigatórias para o GPT Codex

1. Ler `PROJECT_SPEC.md` e `AGENTS.md` antes de editar.
2. Implementar **um sprint por vez**; não iniciar o seguinte antes de testes e commit.
3. Antes de escrever código: listar arquivos-alvo, suposições, riscos, tarefas; não interromper a implementação por detalhes já resolvidos nesta spec.
4. Priorizar funções puras e tipos fortes; contratos Zod; desacoplar dados NASA, regras de cultura, UI e pontuação.
5. **Não preencher parâmetros agronômicos ausentes com estimativas próprias**. Pesquisar fonte original e guardar metadados ou deixar `null`, com comportamento de degradação honesto.
6. Se utilizar modo demo, indicar claramente data e fonte do fixture, jamais rótulo “ao vivo”.
7. Não alterar prioridades/escopo sem registrar `docs/DECISIONS.md`.
8. Ao terminar cada sprint: executar lint, typecheck, testes e build, reportar o que passou, o que falhou, pendências, cobertura e arquivos alterados; criar commit `sprint-N: ...` quando Git estiver disponível.
9. Se uma dependência externa estiver indisponível, implementar fallback explícito ou estado de erro, **nunca simular silenciosamente**.
10. Evitar arquitetura excessiva; deixar app pronto para demonstração antes de polimento.

## 11. Referências técnicas verificadas

1. NASA Space Apps Challenge 2026 — Field Shift: https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/
2. NASA POWER Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
3. SoilGrids data e indisponibilidade da API: https://docs.isric.org/globaldata/soilgrids/index.html
4. SoilGrids propriedades, unidades e profundidades: https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html
5. FAO-56, cálculo de evapotranspiração da cultura: https://www.fao.org/4/X0490E/x0490e0a.htm
6. FAO-56, coeficientes Kc: https://www.fao.org/4/X0490E/x0490e0b.htm

**Uso das referências:** documentos de arquitetura e método devem citar URL e data de acesso. Fontes agronômicas específicas para cada parâmetro ainda precisam ser preenchidas e verificadas pelo sprint S2. A disponibilidade de uma espécie no catálogo **não** prova sua aptidão em Rio Verde.
