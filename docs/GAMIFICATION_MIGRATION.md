# G0 — Auditoria de migração Field Shift 2.0

Data: 2026-11-12. Escopo: auditoria e plano. Nenhuma interface, regra agronômica, contrato público ou dado científico foi alterado neste sprint.

## Diagnóstico atual

| Área | Estado atual | Reaproveitamento / ação posterior |
|---|---|---|
| Rotas | Existem `/`, `/explore`, `/results` e `/methodology`. `/explore` é um wizard de cinco etapas; não existem `/farm` nem `/lab`. | G1 transforma `/explore` em atlas. G3 cria `/farm`; G4 cria `/lab`. `/results` mantém a comparação atual até que o laboratório entregue estado compatível. |
| Dados climáticos | `lib/climate/nasa-power.ts` resolve NASA POWER para coordenadas globais, com timeout, normalização, cobertura/proveniência e fixture SHA-validada exclusiva das coordenadas exatas de Rio Verde. | Reutilizar `resolveClimateContext` no painel do atlas; nunca reutilizar fixture para outro ponto. |
| Motor | `lib/engine/index.ts` é puro, retorna A/B/C, indicadores qualitativos e lacunas. Não calcula score, produtividade, ET0/ETc, irrigação ou calendário. | Manter puro. G4 adapta cenários/slots sem criar resultados agronômicos onde a evidência é incompleta. |
| Catálogo | `lib/catalog.ts`, `data/crops.json` e `data/crop-evidence.json` preservam fontes e campos nulos; sprites P0 existem em `public/assets/crops`. | G2 monta deck/ficha usando este catálogo; P0 são interativos. P1 só informativos, se expostos. |
| Entrada e rascunho | `lib/schema.ts` valida coordenadas globais, três eventos, solo parcial, prioridades, irrigação e baseline. `lib/storage.ts` persiste somente `version: 1`. | G3 introduz versão 2 e migração não destrutiva de V1 antes de adicionar timeline/sessão. |
| UI | `ExploreWizard` mistura localização, histórico, solo, prioridades e revisão; `AnalysisResults` já possui painel climático e fontes expansíveis. | Extrair componentes gradualmente; não reimplementar validações nem proveniência. |
| Testes | 24 unitários e 4 E2E cobrem clima, engine, rascunho, baseline, fonte, mobile de resultados e falha NASA. | Acrescentar testes por sprint; manter os existentes como regressão. |

## Restrições geográficas encontradas

1. `lib/region.ts:isPilotLocation` identifica exclusivamente a coordenada de referência de Rio Verde.
2. `lib/climate/nasa-power.ts:readVerifiedPilotFixture` só permite a fixture NASA para essa coordenada — regra correta e obrigatória.
3. `lib/engine/index.ts:level`, `strategy` e `regionalContextAvailable` usam `isPilotLocation` para elevar somente culturas com linha ZARC a `regionally_contextualized` e anexar contexto ZARC. Isso não bloqueia coordenadas globais; deve continuar sendo escopo regional, nunca ser extrapolado.
4. `ExploreWizard` rotula o botão de exemplo como “Usar piloto Rio Verde (GO)”. Em G1 ele deve virar exemplo, sem semântica de bloqueio.
5. Os dados ZARC contêm nomes `Safra`/`2ª Safra`; são fonte regional e não podem nomear temporadas globais. G4 usa `Temporada A/B` por padrão.

Não foi encontrado bloqueio de latitude/longitude fora dos limites globais no schema ou nas rotas climáticas. O risco real é semântico: B/C hoje podem exibir hipóteses globais a partir de finalidade/família e faixas documentadas não locais. G2–G4 devem expor isso como `partial` ou `insufficient_evidence`, não como adequação regional.

## Decisões G0

### Mapa

Escolha planejada para G1: integração direta de `maplibre-gl`, carregada somente no cliente por import dinâmico. A dependência não existe hoje e **não será adicionada no G0**. G1 só pode ativar tiles quando `NEXT_PUBLIC_MAP_STYLE_URL` apontar para um estilo autorizado com atribuição visível. Sem essa configuração, `MapFallbackCoordinates` continuará sendo a forma completa e acessível de escolher coordenadas; sem tiles não haverá heatmap, raster sintético ou falsa observação espacial.

### Cobertura de evidência

Criar em G2 uma função pura `evidenceCoverageAssessment(location, crop, rotation, soil, season, management)`. Ela deve produzir `supported`, `partial`, `insufficient_evidence` ou `unavailable` com fontes/lacunas. A presença de NASA global não promove evidência brasileira/ZARC a outra região. `regionally_contextualized` continua como proveniência do motor atual; `locally_validated` permanece reservado e nunca emitido.

### Navegação e estado

`/explore` deixa de ser wizard bloqueante; a navegação alvo é `Explorar → Minha fazenda → Laboratório → Comparar → Metodologia`. A migração V1→V2 deve: ler a chave atual; validar V1; converter `location` para `point`, `history` para três slots de timeline, `soil`, `priorities`, `irrigation` e baseline; preservar campos desconhecidos em vez de apagá-los; manter a chave V1 até que a gravação V2 tenha sucesso; oferecer limpeza explícita. Não há autorização para armazenar coordenadas no servidor.

## Plano incremental

| Sprint | Alterações mínimas | Verificação exigida |
|---|---|---|
| G1 — Atlas | `WorldMap` client-only, fallback por coordenadas, marcador/seleção, exemplo Rio Verde, painel NASA e erro/loading. | Brasil, Gana e Índia por coordenadas; fixture nunca fora de Rio Verde; teclado e fallback sem tiles. |
| G2 — Deck | `EvidenceStatusPill`, `CropDeck`, ficha/drawer e avaliação de cobertura pura. | Seis P0, sprites/fallback, N/D explícito, fontes clicáveis, mobile/teclado. |
| G3 — Fazenda | `/farm`, timeline, seleção de carta/outra cultura, solo/prioridades, migrador V1→V2. | Sobreposição/data inválida, 375px, rascunho preservado/migrado. |
| G4 — Laboratório | `/lab`, baseline + duas alternativas, slots configuráveis e modal acessível de troca. | Sem DnD obrigatório, sem ciclos/janelas inventados, evidência parcial explícita. |
| G5 — Comparação | Adaptar `/results`, navegação, metodologia e testes finais. | Comparação parcial sem ranking agregado, fontes/metodologia, desktop/mobile/E2E. |

## Riscos e mitigação

- **Tiles/licença:** não usar OSM público em volume; exigir URL de estilo autorizado e fallback por coordenadas.
- **SSR/WebGL:** mapa é client-only; página continua renderizável sem WebGL/tiles.
- **Dados globais vs. regionais:** NASA é observação de grade histórica; ZARC e fontes brasileiras seguem contextuais. Nada converte ausência em zero.
- **Migração de draft:** introduzir schema discriminado e testes com V1 real antes de mudar a chave de escrita.
- **Oceano/terreno não agrícola:** permitir painel climático quando houver dado, mas marcar contexto agrícola indisponível e impedir laboratório de alegar viabilidade.
- **Escopo:** não criar geocoding, heatmaps, drag-and-drop ou ranking como pré-requisito do fluxo científico.

## Plano de testes G1–G5

- Unitários: avaliação de evidência, migrador de rascunho, regras de slots/overlap e isolamento de fixture.
- Integração: painel climático em coordenada global disponível/indisponível e retorno de cobertura por cultura.
- Playwright: Rio Verde como exemplo; Gana; Índia; coordenadas manuais sem tiles; oceano; NASA indisponível; edição keyboard; mobile 375px.
- Em cada sprint: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; `npm run test:e2e` quando rota/interação mudar.

## Resultado G0

G0 está pronto para G1. A decisão de mapa está documentada, mas a dependência e as telas novas aguardam autorização do próximo sprint. A lógica climática, catálogo, engine, proveniência e testes existentes são a base a preservar.
