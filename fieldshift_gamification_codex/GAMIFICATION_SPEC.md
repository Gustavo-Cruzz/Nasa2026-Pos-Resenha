# Field Shift — Especificação de UX gamificada e implementação pelo Codex

Versão: 2.0 | 12/11/2026 | Status: design/implementação; não é validação agronômica.

## 0. Decisão de produto e mudança em relação ao projeto anterior

**Substituir o wizard com 5 formulários sequenciais por uma experiência exploratória de mapa + cartas de culturas + linha do tempo agrícola + laboratório de rotações + comparação.** O produto atende o Brasil nacionalmente: o usuário deve poder clicar em qualquer coordenada brasileira e consultar o contexto disponível, com posição editável manualmente. Rio Verde é apenas um exemplo. O mapa pode manter inspeção ambiental global, mas fora do Brasil não há promessa de jornada agronômica ou contexto regional brasileiro.

**Distinção científica obrigatória:** escopo Brasil nacional ≠ fornecer recomendação agronômica validada para qualquer talhão brasileiro. O motor avalia a disponibilidade e aplicabilidade de cada evidência de cultura/regra **na coordenada, município, estação, tipo de solo e contexto de manejo selecionados**. Quando incompletos, apresentar carta informativa ou comparação parcial somente para indicadores sustentados; NÃO inventar adequação, classificação, Kc, janela de semeadura ou recomendação regional. Manter estados explícitos `supported`, `partial`, `insufficient_evidence`, `unavailable`.

**Objetivo da demo:** usuário seleciona ponto no mapa → vê perfil climático verificado → abre painel de culturas com indicadores suportados e incerteza → monta histórico → explora três estratégias (inclui linha de base) → muda prioridades → compara resultados e evidências.

## 1. Não objetivos

Não criar mundo 3D, personagens, loot, moedas, XP, rendimento de safra inventado, saúde do solo inferida diretamente de clima, ranking sem base, simulação NPK sem análise de solo, previsão de clima futuro, recomendação de fertilização/irrigação prescritiva, ranking agrícola brasileiro sem dados locais aplicáveis. Não insistir em drag-and-drop como única interação (touch/teclado precisam de alternativa).

## 2. Contexto do projeto existente

- Projeto original: Next.js App Router, TypeScript strict, Tailwind/shadcn, Zod, Recharts, Vitest/Playwright, API NASA POWER.
- Telas atuais: Localização, Histórico (1 obrigatório + até 2 opcionais), Solo, Prioridades, Revisar. **Reutilizar lógica e validação**; redesenhar a apresentação sem reimplementar o motor agronômico do zero.
- Catálogo ativo P0: soja, milho, sorgo granífero, girassol, feijão-caupi, *Urochloa ruziziensis*. P1: algodão, feijão-guandu (cartas de exploração opcionais; sem indicação automática se não habilitadas). Milheto e crotalária excluídos do escopo prioritário.
- Imagens: usar sprites existentes no projeto, PNG transparentes; fornecer fallback textual para imagens faltantes; `image-rendering: pixelated` e dimensões apropriadas.
- Atualizar instruções existentes que limitem recomendação ao piloto brasileiro. Substituir regra `location === Rio Verde` por `evidenceCoverageAssessment(location, crop, rotation, soil, season, management)`.

## 3. Stack proposta, sujeita à inspeção do repositório

- Mapa: MapLibre GL JS + react-map-gl/maplibre **ou** integração direta com MapLibre (escolher uma). Consultar versão instalada e compatibilidade com Next.js antes de adicionar. Componente client-only via import dinâmico; SSR do app permanece seguro.
- Estilo cartográfico de provedor com autorização e atribuição; configurar `NEXT_PUBLIC_MAP_STYLE_URL` para estilo/tiles permitidos. Não usar tiles públicos do OpenStreetMap em volume incompatível com a política de uso. Para demo, estilo público autorizado e atribuição sempre visível. Fallback sem tiles: seleção por latitude/longitude e entrada textual de coordenadas.
- Geocoding opcional; não depender de serviço gratuito sem SLA. Não enviar lat/long a serviços externos além daqueles necessários e consentidos para dados climáticos/mapa. Sem solicitação de localização do dispositivo por padrão.
- Manter motor agronômico como funções puras. Não transformar o mapa em fonte de scores.
- Se o mapa for bloqueador de prazo, implementar marcador em mapa leve ou coordenadas com visualização de contexto; não bloquear fluxo científico.

## 4. Modelo de domínio e contratos

### 4.1 Tipos a acrescentar / adaptar

```ts
type GeoPoint = { latitude: number; longitude: number; label?: string };
type EvidenceStatus = 'supported' | 'partial' | 'insufficient_evidence' | 'unavailable';
type DataOrigin = 'nasa_power' | 'soilgrids_prepared' | 'user_lab' | 'zarc' | 'embrapa' | 'fao' | 'peer_review' | 'user_input';
type EvidenceRef = {
  id: string; title: string; institution: string; url: string;
  publicationDate?: string | null; accessDate: string;
  pageOrSection?: string | null; excerpt?: string | null;
  applicableRegions?: string[]; cultivars?: string[];
};
type MeasuredIndicator = {
  id: string; label: string; value: number | string | null; unit?: string;
  status: EvidenceStatus; explanation: string; sources: EvidenceRef[];
  spatialResolution?: string | null; temporalCoverage?: string | null;
};
type CropCardModel = {
  cropId: string; displayName: string; imageUrl: string;
  roles: Array<'commercial' | 'cover' | 'forage'>;
  status: EvidenceStatus; indicators: MeasuredIndicator[];
  warnings: string[]; missingEvidence: string[];
};
type RotationSlot = { id: string; year: number; seasonId: string; cropIds: string[]; startMonth?: string; endMonth?: string };
type RotationScenario = {
  id: string; kind: 'baseline' | 'suggested' | 'custom'; label: string;
  slots: RotationSlot[]; eligible: boolean; indicators: MeasuredIndicator[];
  warnings: string[]; missingEvidence: string[];
};
type AnalysisSession = {
  schemaVersion: 2; point: GeoPoint | null;
  cropHistory: Array<{ cropId: string; start: string; end: string; management?: string }>;
  soil: { provenance: 'user_lab' | 'regional_estimate' | 'unknown'; ph?: number | null; phMethod?: string | null; texture?: string | null; soc?: number | null };
  priorities: { water: number; soil: number; operations: number };
  irrigation: 'yes' | 'no' | 'unknown';
  scenarios: RotationScenario[];
};
```

Não confundir `missingEvidence` com zero. Edição de históricos pode conter cultura não cadastrada: armazenar como `other` com rótulo do usuário, sem inferir atributos.

### 4.2 Contratos API / funções

- `GET /api/climate?lat={...}&lon={...}` → `{ location, source, datasetVersion?, observationPeriod, spatialResolution?, status, metrics[], warnings[] }`. Implementar proxy NASA POWER existente, com validação Zod, timeout, caching e rate limiting razoável. Dados devem ser reais; fixtures testadas e identificadas se houver fallback de demonstração. Coordenadas válidas `[-90,90]`, `[-180,180]`. Click em oceano: perfil climático possível, **sem indicação de cultivo terrestre**.
- `POST /api/evaluate-location` com `{ point, season?, soil?, cropIds? }` → `{ locationStatus, crops: CropCardModel[], missingEvidence, warnings }` baseado no catálogo e regras de aplicabilidade, nunca por proximidade arbitrária de município.
- `POST /api/rotation-scenarios` com `{ session }` → `{ scenarios, comparisonStatus, caveats, evidenceRefs }`. Garantir linha de base, mais até 2 estratégias justificadas se viáveis. Se faltarem dados: preservar baseline e fornecer cartões de alternativas exploratórias sem nota, ou mensagem “não há evidência suficiente”; nunca preencher três recomendações fictícias.
- Se existente motor no cliente, rotas são apenas adaptadores; evitar duplicação de lógica. Resposta deve identificar API offline, falta de parâmetros, janela não validada, e erro de dados.

### 4.3 Cobertura brasileira e níveis de avaliação

1. **Clima no Brasil**: série NASA POWER para coordenadas brasileiras; apresentar período, unidade, resolução/limitações. A consulta global pode permanecer como ferramenta técnica separada.
2. **Dados locais opcionais**: solo laboratório e histórico fornecidos pelo usuário; solo regional brasileiro estimado somente quando produto/arquivo confiável disponível. Nunca inventar propriedade do talhão.
3. **Viabilidade de cultura**: por cultura e local, verificar (a) evidência climática aplicável, (b) ciclo/fenologia e calendário aplicáveis, (c) limitações de solo relevantes, (d) compatibilidade entre cultivos e manejo, (e) fontes. Sem validação de calendário/região, exibir `partial`/`insufficient_evidence`.
4. **Estratégias**: comparativo somente para dimensões com dados. Nunca normalizar ausência como zero ou gerar score agregado quando faltam dimensões críticas. Exibir “comparação parcial” e quais variáveis faltam.
5. **Rótulos de interface**: “Compatibilidade com dados disponíveis”, não “Melhor cultura da região” sem base; “Condições históricas”, não “Previsão”; “Indicador relativo”, não “probabilidade”.

## 5. IA de interação e etapas (novo fluxo)

### 5.1 Navegação

Rotas sugeridas: `/explore` (mapa inicial), `/farm` (histórico/solo/prioridades em drawer/abas), `/lab` (deck e montador), `/results` (comparador), `/methodology` (fontes, limitações). Preservar URLs atuais mediante redirecionamento ou link contextual. Navegação persistente `Explorar | Minha fazenda | Laboratório | Comparar | Metodologia` com indicação de progressão, mas sem bloqueio em wizard.

### 5.2 Tela A — Atlas / mapa do Brasil

- Mapa ocupa maioria da viewport e permite pan/zoom/click, pino movível.
- Busca de cidade é opcional; entrada manual lat/lon sempre disponível; botão “Usar exemplo” seleciona Rio Verde **apenas como exemplo**, nunca filtro obrigatório.
- Painel direito mostra local, métricas climáticas históricas, status de evidência e cartas de cultura (visual compacto). Antes de consulta, instrução clara.
- Categorias de painel: `Clima observado` e `Culturas para explorar`; não inventar ranking. Cartas não habilitadas exibem `Dados insuficientes` com explicação.
- Camadas `Precipitação`/`Temperatura` só se houver raster/tiles ou geodados reais; senão usar gráficos temporais de ponto e alternância de indicador, nunca pintar um heatmap sintético como observação NASA.
- CTA: `Usar este local` → mantém pin + leva à Minha fazenda.

### 5.3 Tela B — Minha fazenda

- Linha do tempo de um a três eventos históricos editáveis (cartas de cultura + início/fim); campo de cultura “Outra”; detecção de sobreposição com mensagem clara.
- Solo opcional em painel expansível com indicação de origem e método de pH. Irrigação e prioridades com sliders e valores numéricos.
- Preview de clima por janela selecionada; se faltarem datas, “sem janela definida”.
- Salvar rascunho versionado localmente; limpar/restaurar rascunho com confirmação.

### 5.4 Tela C — Laboratório de rotações

- Deck de 6 cartas P0; P1 apenas informativas se presentes; cada carta abre ficha com evidência e riscos.
- Três colunas: `Atual (linha de base)`, `Alternativa 1`, `Alternativa 2`.
- Horizonte sugerido: dois anos agrícolas, slots por estação/janela em função da localidade; **não assumir “safra/safrinha” globalmente**. Rótulos genéricos `Temporada A/B` configuráveis pelo usuário; onde dados locais verificados permitam, exibir nomes regionais.
- Arrastar e soltar é enhancement opcional; **obrigatório** botão `Adicionar/Trocar cultura`, acessível por teclado e celular.
- Ações `Duplicar atual`, `Gerar opções com evidências`, `Desfazer`, `Limpar alternativa`, `Comparar`.
- Atualizar indicadores com debounce se necessário; estados `calculando`, `parcial`, `insuficiente`. Nunca apresentar ganho de 20% sem modelo validado.
- Consórcio milho + braquiária apenas se regra específica estiver presente/aplicável; não habilitar combinações livres sem evidência.

### 5.5 Tela D — Comparador

- Três estratégias lado a lado desktop; vertical com seletor de cenários mobile.
- Métricas água, cobertura/potencial de solo, diversidade, risco, operação/comercial **somente quando sustentadas**; `N/D` caso contrário.
- Marcas contextualizadas `Menor demanda hídrica estimada`, `Mais diversidade funcional` somente com cálculos reais; evitar selo “campeão” absoluto.
- Mostrar “Por quê?” expandable com fontes, unidades, janelas, metodologia, limitações. Alternar pesos das prioridades e recálculo com explicação do ranking.
- Diferenciar `baseline`, `partial` e `eligible`; em localização sem evidência, comparação deve ensinar por que não é possível concluir, mas manter exploração de cartas e clima.

### 5.6 Tela E — Metodologia

- Fontes NASA, Embrapa/FAO/MAPA, metodologia, classes de evidência, data de obtenção, tratamento de dados ausentes, resolução e alertas científicos.
- Linha clara: observação histórica vs inferência agronômica vs dado informado pelo usuário.

## 6. Sistema visual / gamificação

- Dark navy já existente + verde-lima de ação, pixel art apenas nas culturas e elementos pontuais; não tornar textos científicos pixelados.
- Cartas: sprite, nome, finalidade, indicadores contextualizados com unidade e estado; cor nunca única via de comunicação; legenda para barras e `N/D`.
- Microinterações 150–250 ms: hover, seleção, mudança de slot e mini-animacão do resultado. Respeitar `prefers-reduced-motion`.
- Três estados dos cards: `Explorável`, `Análise parcial`, `Sem evidência local` (não confundir com inadequação real).
- A satisfação vem de experimentar cenários, não de moedas, XP ou recompensas falsas.

## 7. Acessibilidade, responsividade e comportamento nacional

- Desktop ≥1024px: mapa ~65% + painel ~35%; tablet: drawer; mobile <768px: mapa topo e bottom sheet; controles sticky sem obstruir atribuição do mapa.
- Teclado: pino por coordenadas, seleção das cartas por botões, edição por dialog, rotação sem DnD; foco visível, labels, contraste, aria-live para resultados sem excesso de anúncios.
- i18n pt-BR/en preservado, nomes botânicos consistentes; coordenadas numéricas decimais e unidades explícitas; datas para hemisférios diferentes sem assumir mês de plantio brasileiro.
- Estado de erro de rede, carregamento, dados ausentes, terreno não agrícola, rejeição de seleção, falha de tiles e sessão de rascunho migrada.
- Privacidade: coordenadas e histórico em `localStorage` somente se o usuário aceitar rascunho; botões de apagar e não logar coordenadas arbitrárias no backend.

## 8. Critérios de aceite verificáveis

**Brasil nacional:** clicar em pelo menos três pontos geograficamente distantes em UFs diferentes salva coordenadas e consulta NASA POWER; a resposta informa cobertura, município e fonte. Não inventar adequação agrícola fora da evidência aplicável.

**Atlas:** click/pin atualiza localização, mostra loading/erro, panel coerente, acessível sem mapa via coordenadas; mapas com atribuição e fallback.

**Cartas:** seis culturas P0 visíveis, com pixel art/fallback; dados sem evidência aparecem como `N/D`, indicação de origem e expansão de fontes.

**Histórico:** um evento obrigatório e até dois opcionais com datas; mensagens para datas inválidas; local e inputs sobrevivem à navegação e migração de rascunho.

**Lab:** baseline imutável por padrão (edição apenas em cópia), duas alternativas editáveis; troca por botão em mobile/teclado; nenhuma combinação inválida silenciosa; recálculo sem scores fictícios.

**Resultados:** cada métrica tem origem; comparação parcial apresentada como parcial; alterar prioridade só muda ranking onde computável; `/methodology` acessível.

**Qualidade:** lint, typecheck, testes unitários da cobertura/evidência/slots, Playwright ponta a ponta desktop e mobile, build; sem token embutido nem dependência de API no teste unitário.

## 9. Plano de sprints para Codex (incremental, preservar dados reais)

### Sprint G0 — Auditoria e arquitetura (2–3 h)
- Inspecionar repositório, componentes, dados, rotas e estrutura antiga. Mapear regras de Rio Verde hardcoded. Escrever ADR curta (map, navigation, coverage). Não quebrar lógica atual.
- Aceite: diagnóstico de arquivos + plano de migração e testes atuais verdes.

### Sprint G1 — Atlas Brasil (5–7 h)
- Implementar mapa client-only, pino click/drag, busca opcional, coordenadas, fallback, painel climático NASA e exemplo Rio Verde sem geofence.
- Aceite: pontos em 3 continentes, eventos de clique e erro, fonte e período, testes de componentes/integração.

### Sprint G2 — Deck e painel lateral (4–5 h)
- Integrar sprites reais, cards e fichas; classificar evidências por local/cultura; retirar “fortes na região” de cards sem suporte; UX loading/partial/unknown.
- Aceite: seis P0, N/D não vira zero, fontes clicáveis, navegação por teclado.

### Sprint G3 — Fazenda em timeline (4–5 h)
- Transformar histórico em slots de timeline; solo e prioridades em painéis; migrar draft antigo; preservar validações.
- Aceite: um a três eventos, adição/remoção mobile, datas válidas e estado persistente.

### Sprint G4 — Laboratório interativo (6–8 h)
- Três cenários (baseline + 2), slots de ano/temporada, menus trocar/adicionar, replicar base, regras do motor existente e faltas de evidência. Drag-and-drop somente se sobrar tempo.
- Aceite: atualização imediata sem falsos scores e sem combinações não validadas.

### Sprint G5 — Comparação e acabamento (5–7 h)
- Comparação, rótulos de cobertura, fontes, prioridades, demo guiada, responsive, i18n, Playwright e build/deploy.
- Aceite: fluxo completo ponta a ponta; estado regional brasileiro insuficiente é honesto e útil; sem quebra de navegação.

**Prioridades de corte:** primeiro mapa + seleção brasileira + cards contextualizados + timeline + baseline/2 alternativas + comparação honesta. Cortar em ordem: layers geoespaciais, geocoding, DnD, animações, modos de jogo, estilo avançado. Nunca cortar proveniência/validação.

## 10. Riscos e decisões de produto

- `MapLibre` exige estilo e tiles de provedor autorizado; se offline, fallback coordenadas mantém aplicativo operante.
- NASA POWER possui resolução regional; clique não equivale a medição da parcela. Não desenhar precisão de talhão.
- Localização mundial não implica calendários agrícolas globais; interface deve suportar "desconhecido" e exigir entrada local no caso necessário.
- Dados SoilGrids preparados podem não cobrir todas as coordenadas; nunca criar pH/CTC genérico.
- Fontes de Rio Verde ou ZARC não devem ser aplicadas fora da região de validade; avaliações exploratórias não são recomendações locais.
- O usuário pode selecionar mar/oceano; mensagem de contexto e continuar explorando clima se disponível, mas desabilitar rotação agrícola naquele ponto.

## 11. Instrução pronta para o Codex

> Leia `GAMIFICATION_SPEC.md`, `UX_WIREFRAMES.md`, `AGENTS.md` e os arquivos de especificação atuais. Preserve a implementação existente sempre que possível. O objetivo é transformar o wizard em um atlas interativo do Brasil com cartas pixel art, timeline agrícola, laboratório de três rotações e comparador explicável. Remova o geofence Rio Verde da seleção, mas NÃO trate evidências de um município, UF ou lote de solo como válidas em outro. Comece **somente** pelo Sprint G0. Antes de codificar, reporte os componentes existentes, regras hardcoded e plano de migração. A cada sprint, implemente alterações mínimas, valide lint/typecheck/test/build e reporte arquivos alterados e lacunas. Não invente dados científicos, indicadores regionais ou notas.
