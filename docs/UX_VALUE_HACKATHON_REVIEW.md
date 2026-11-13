# Field Shift — revisão de UX, valor ao produtor e estratégia NASA Space Apps

Data: 2026-11-12  
Escopo: estado atual de `main` (`3652658`), comparação com o fluxo anterior a P0 (`ceb05f8`), inspeção visual local em 1440 px e 390 px, contratos científicos, testes e documentação.

## 1. Veredito executivo

O novo fluxo é claramente melhor: datas são compreensíveis, salvamento tem confirmação, a navegação mostra a etapa atual, a paleta passou a comunicar agricultura e os cards deixaram de esmagar sprite, nome e evidência. A aplicação também é cientificamente mais responsável do que muitos protótipos de hackathon: usa NASA POWER real, preserva proveniência, não transforma ausência em zero e não promete produtividade, irrigação ou validação de campo.

Ainda assim, o produto atual gera sobretudo **valor de exploração e educação**, não valor suficiente para uma decisão agrícola operacional. Ele ajuda o produtor ou técnico a organizar perguntas — “o que ocorreu historicamente?”, “quais evidências faltam?”, “como três hipóteses diferem?” — mas não sustenta sozinho a escolha do que plantar. Faltam uma evidência clara de mudança climática, alternativas materialmente distintas, contexto operacional/local e validação com usuários reais.

Conclusão: **há uma proposta de valor real, mas ainda não validada e com baixa acionabilidade**. O melhor usuário inicial não é o produtor sozinho; é o técnico de extensão ou agrônomo conduzindo uma conversa com o produtor. Para competir globalmente, Field Shift deve trocar amplitude global superficial por uma história local comprovável e uma demonstração de 60–90 segundos que leve de dado NASA a uma decisão de teste em pequena escala.

## 2. Evidências examinadas

- Rotas atuais: `/`, `/explore`, `/farm`, `/lab`, `/results`, `/methodology`.
- Capturas locais: landing desktop/mobile, fazenda mobile, laboratório desktop e resultados mobile.
- Histórico Git: comparação `ceb05f8..3652658`.
- Suite existente: 35 testes unitários e 12 E2E; último ciclo documentado passou em lint, typecheck, unitários, Playwright e build.
- Mapa: `NEXT_PUBLIC_MAP_STYLE_URL` não está configurado; seleção manual por coordenadas continua funcional.
- Referência oficial: o desafio pede uma ferramenta de apoio à decisão que combine observações da NASA, solo local, características das culturas e prioridades do agricultor para explorar rotações adaptativas ([Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/)).
- Critérios usados por páginas oficiais do evento: Impact, Creativity, Validity, Relevance e Presentation. As categorias globais também incluem Best Use of Science, Best Use of Data, Galactic Impact, Best Use of Storytelling, Global Connection e Local Impact ([Global Awards](https://www.spaceappschallenge.org/2025/awards/)).

## 3. Fluxo anterior versus fluxo atual

| Dimensão | Antes de P0 | Estado atual | Resultado |
|---|---|---|---|
| Entrada de datas | Mensagem global “Use YYYY-MM”; campo não era identificado | `type="month"`, rótulo mês/ano, erro junto ao campo e foco no primeiro erro | Grande melhoria |
| Salvamento | “Salvar rascunho” também navegava; confirmação ambígua | Salvar local e salvar/continuar são ações separadas; hora e handoff visíveis | Grande melhoria |
| Cards no atlas | Sprite pequeno, nome comprimido e selo dominante | Cards mais altos, sprite 64 px, finalidade traduzida e selo compacto | Melhoria clara |
| Cor e identidade | Navy + verde-lima genérico de SaaS | Verde-floresta, tons de solo/cultivo e cena agrícola | Melhoria clara |
| Tipografia | Textos auxiliares pequenos e baixa hierarquia | Base e textos pequenos maiores; contraste melhor | Melhoria moderada |
| Orientação | Links soltos; usuário não sabia onde estava | Trilha Explorar → Fazenda → Laboratório → Comparar e rota ativa | Melhoria clara |
| Imersão | Apenas sprites isolados | Cena agrícola na landing e feedback curto de troca de slot | Melhoria moderada |
| Fazenda mobile | Conteúdo legível, mas um formulário longo | Continua com mais de duas telas de rolagem e três cards quase idênticos | Pendente |
| Laboratório | Estrutura funcional, pouca linguagem visual | Três colunas claras, mas deck e slots ainda não usam sprites; muitos vazios | Pendente |
| Resultados mobile | Tabela horizontal funcional | Ainda mostra uma coluna por vez sem pista forte de scroll; termos internos aparecem | Pendente |
| Internacionalização | Parcial | Header, landing e metodologia alternam; fluxo principal permanece em pt-BR | Pendente/crítico para “global” |

O novo fluxo reduz erros e aumenta confiança, porém não reduz suficientemente o esforço cognitivo. A jornada ficou mais explicável, não mais curta.

## 4. Auditoria visual em seis pilares

Escala: 1 = frágil, 2 = funcional, 3 = bom, 4 = excelente/pronto para competição.

| Pilar | Antes | Atual | Diagnóstico |
|---|---:|---:|---|
| Copywriting | 2 | 3 | Limites e ações são claros. Perde pontos por jargão (`regionally_contextualized`, IDs de indicadores, `cycle_duration`) e pelo slogan contraditório. |
| Visuals | 1 | 2 | Sprites e cena criam identidade, mas mapa sem tiles, laboratório sem sprites e resultados muito textuais impedem uma narrativa visual forte. |
| Color | 1 | 3 | A paleta agrícola é coerente e tem bom contraste. Estados ainda dependem bastante de variações próximas de verde. |
| Typography | 2 | 3 | Leitura melhorou. Em mobile, header, trilha e conteúdo competem por atenção; textos técnicos continuam densos. |
| Spacing | 2 | 2 | Desktop respira bem. Fazenda mobile é excessivamente longa; cards repetidos e controles consomem espaço sem resumo progressivo. |
| Experience design | 1 | 2 | Orientação e feedback melhoraram, mas o fluxo exige muita entrada antes do primeiro insight e o laboratório começa majoritariamente vazio. |
| **Total** | **9/24** | **15/24** | Evolução relevante, ainda abaixo de um produto memorável para júri. |

### Achados críticos de UX

1. **Promessa inconsistente:** “Built for the world. Validated locally.” conflita com a regra implementada de que Rio Verde é apenas `regionally_contextualized`; `locally_validated` está reservado. Sugestão: **“Built for the world. Contextualized in Rio Verde. Powered by NASA.”**
2. **Insight demora demais:** o usuário precisa selecionar local, preencher três eventos e atravessar o laboratório antes de receber uma comparação. Um modo demo precisa entregar o primeiro insight em menos de 30 segundos.
3. **Fazenda mobile longa:** transformar os três eventos em cards colapsáveis com um resumo (“soja · jan–jun/2023”) após preenchimento; manter apenas o evento ativo aberto.
4. **Laboratório pouco imersivo:** o deck mostra nomes e selos, mas não os sprites que já existem; os 12 slots vazios dominam a tela. Exibir primeiro um resumo de A/B/C e expandir a edição detalhada sob demanda.
5. **Resultados técnicos:** traduzir níveis e chaves internas. “Contextualização regional”, “precipitação histórica”, “diversidade funcional” e “duração não documentada” são mais úteis do que tokens de implementação.
6. **Comparação mobile sem direção:** adicionar tabs A/B/C e uma pista “deslize para comparar”; manter a tabela completa como visão secundária.
7. **Global apenas parcialmente bilíngue:** o seletor de idioma cria expectativa de tradução integral que não é atendida nas telas decisórias.

## 5. A aplicação gera valor real ao produtor?

### Valor já entregue

- Traduz uma coordenada em climatologia histórica NASA com período, cobertura e proveniência.
- Separa observação climática, contexto regional e entrada do usuário.
- Força explicitação do histórico, prioridades e intenção de continuidade.
- Compara hipóteses sem mascarar lacunas com score arbitrário.
- Pode melhorar a qualidade da conversa entre produtor, técnico e agrônomo.

### Valor ainda não comprovado

- Não há entrevistas, teste de tarefa, piloto de campo ou validação humana rastreável no repositório.
- A comparação não demonstra economia, redução de risco, mudança de solo ou decisão operacional; corretamente, porque faltam dados.
- B e C podem convergir para a mesma cultura, reduzindo a utilidade percebida.
- A duração é desconhecida e a maior parte dos slots fica vazia; portanto não há um plano de rotação aplicável de 24 meses.
- Mercado, equipamento, sementes, área, custo de mudança e tolerância a risco não entram na decisão.
- Medianas mensais históricas mostram contexto, mas não mostram claramente **o que mudou**, que é o centro do problema de adaptação.

### Hipótese de valor recomendada

> Para técnicos de extensão e produtores de Rio Verde que precisam revisar uma rotação diante de chuva e calor variáveis, Field Shift combina histórico NASA, histórico da fazenda e evidências regionais para comparar hipóteses e preparar uma conversa agronômica rastreável — sem fingir precisão de talhão.

### Como validar valor em 48 horas

Testar com 3 produtores e 2 agrônomos/técnicos. Dar uma tarefa: “compare a continuidade com duas hipóteses e diga qual pergunta levaria ao agrônomo”. Medir:

- tempo até o primeiro insight;
- conclusão sem ajuda;
- compreensão de observação versus recomendação;
- capacidade de explicar a diferença A/B/C;
- confiança calibrada (não “você confia?”, mas “o que faria antes de agir?”);
- informação ausente mais citada;
- intenção de usar numa reunião de planejamento.

Meta mínima: 4/5 concluem em até 5 minutos, 5/5 reconhecem que não é prescrição e 4/5 identificam uma decisão ou pergunta útil. Não usar “validado com produtores” antes desse teste.

## 6. Potencial competitivo no NASA Space Apps

Avaliação interna, não nota oficial:

| Critério | Atual (0–5) | Por quê | Alvo |
|---|---:|---|---:|
| Impact | 2.5 | Problema enorme, mas benefício prático ainda não medido nem acionável | 4.0 |
| Creativity | 3.0 | Exploração honesta e gamificação sem score falso são diferenciadas; interação ainda convencional | 4.0 |
| Validity | 3.8 | Proveniência, nulls e isolamento do fixture são fortes; falta validação humana/local | 4.5 |
| Relevance | 4.0 | Responde diretamente ao desafio, mas solo local e prioridades ainda influenciam pouco | 4.8 |
| Presentation | 2.8 | Visual melhor, porém a demo é longa e não possui um momento “NASA mudou a decisão” | 4.5 |
| **Total diagnóstico** | **16.1/25** | Bom protótipo científico; ainda não é apresentação campeã | **21.8/25** |

### Categoria a perseguir

O melhor posicionamento é **Best Use of Data + Local Impact**, com Storytelling como multiplicador. Tentar parecer uma plataforma global completa dilui a vantagem. Um piloto de Rio Verde, rastreável e replicável, é mais forte do que dez países sem evidência local.

### O que falta para ser candidata forte

#### P0 — antes da apresentação

1. Criar “Demo Rio Verde” de um clique, com sessão completa e rótulo explícito de demonstração.
2. Mostrar um insight de mudança derivado do fixture real: comparação entre dois períodos, tendência ou variabilidade, com teste estatístico/engenharia documentado. Se não for defensável, não mostrar.
3. Garantir que B e C sejam materialmente diferentes ou explicar que não há duas alternativas distintas com evidência suficiente.
4. Substituir todos os tokens internos por linguagem humana.
5. Corrigir o slogan para “contextualized”, não “validated”.
6. Criar um cartão final de decisão: “o que sabemos / o que falta / próximo passo com o agrônomo”.
7. Ensaiar uma demo de até 90 segundos sem digitação extensa.

#### P1 — evidência e utilidade

1. Executar o teste com produtores/técnicos e documentar achados, não depoimentos genéricos.
2. Escolher um único usuário primário: recomendação atual é **técnico de extensão junto ao produtor**.
3. Adicionar uma segunda observação NASA apenas se ela responder a uma pergunta concreta. GPM para distribuição/temporização da chuva ou SMAP para contexto de umidade são candidatos melhores que acumular feeds sem uso.
4. Tornar prioridades causais e explicáveis: mostrar exatamente qual destaque mudou e por quê; nunca reordenar quando a evidência não permite.
5. Incluir restrições operacionais mínimas: disponibilidade de semente, uso comercial/forrageiro/cobertura e mercado/equipamento como entrada declarada, não inferida.

#### P2 — continuidade após o hackathon

1. Resumo imprimível/compartilhável para conversa com assistência técnica.
2. Modo baixo consumo/offline com último pacote de dados identificado pela data.
3. Framework de novos pilotos: evidência regional, revisão humana, versão e responsável.
4. Validação de campo rastreável para, no futuro, habilitar legitimamente `locally_validated`.

## 7. Assets e imersão

Os dez sprites atuais são suficientes para identificar culturas. Gerar mais culturas agora não melhora a decisão. O que falta é um **sistema visual narrativo**, não volume de ilustrações:

- transição visual órbita → grade climática → fazenda;
- ícones consistentes para observação NASA, dado do produtor, contexto regional e lacuna;
- miniaturas de cenário A/B/C com as culturas escolhidas;
- estado visual “evidência insuficiente” que não pareça falha ou reprovação;
- gráfico de mudança temporal que seja o herói da demo.

Todo asset de clima/campo deve ser rotulado como decorativo ou ligado a dado real. Não gerar imagens de “solo saudável”, “seca”, “maior produtividade” ou “cultura adequada” como se fossem resultados medidos.

## 8. Storytelling recomendado

### Tese

**“Antes de mudar a lavoura, mude a qualidade da decisão.”**

Linha de apoio:

> O histórico da fazenda mostra o que foi feito. A NASA mostra o clima observado. Field Shift conecta os dois para comparar o próximo passo — e deixa claro o que ainda precisa de um agrônomo.

### Protagonista

Use uma personagem explicitamente fictícia: **Marina, produtora em Rio Verde**. Ela não “recebe uma recomendação da NASA”. Ela precisa decidir se repete a sequência recente ou leva duas hipóteses para revisão técnica. Sua prioridade é água, mas ela não quer perder função comercial.

### Arco em cinco atos

1. **Tensão:** o calendário herdado já não basta; chuva e temperatura variam e a decisão precisa ocorrer antes do plantio.
2. **Evidência:** Marina escolhe sua coordenada e vê o histórico NASA, período e limitações da grade.
3. **Contexto humano:** registra o que plantou, o que sabe do solo e o que mais importa agora.
4. **Exploração:** compara continuidade, saúde do solo e resiliência hídrica. O sistema mostra diferenças e também recusa conclusões sem evidência.
5. **Ação responsável:** Marina sai com uma hipótese, uma lista de lacunas e perguntas para o agrônomo — não com uma falsa certeza.

### Roteiro de pitch de 3 minutos

- **0:00–0:20 — Hook:** “A decisão de plantio acontece meses antes de sabermos como a próxima estação virá. E repetir o calendário anterior pode ser uma aposta invisível.”
- **0:20–0:45 — Problema:** apresente Marina e uma decisão concreta, não estatísticas genéricas.
- **0:45–1:05 — NASA:** mostre POWER, período, coordenada e o insight climático real. Explique resolução em uma frase.
- **1:05–1:55 — Demo:** um clique carrega Rio Verde; histórico e prioridades já estão preenchidos; compare A/B/C e abra “Por quê?”.
- **1:55–2:20 — Confiança:** mostre proveniência, lacunas e por que Field Shift não inventa score.
- **2:20–2:40 — Valor:** “Em vez de recomendar à distância, preparamos uma decisão melhor para produtor e assistência técnica.”
- **2:40–3:00 — Escala:** Rio Verde é o primeiro pacote regional; a arquitetura global recebe novos pacotes revisados, mantendo evidência e responsabilidade.

### Momento memorável da demo

O momento campeão não deve ser “temos um mapa”. Deve ser:

> “Quando Marina muda a prioridade para água, Field Shift não troca silenciosamente a cultura. Ele mostra quais evidências climáticas passam a importar, quais alternativas continuam distintas e qual informação falta antes de agir.”

Se o produto não conseguir demonstrar essa causalidade de forma visível, a prioridade selecionada parecerá cosmética.

## 9. Decisão recomendada

Prosseguir, mas com reposicionamento: **não vender como recomendador global**. Vender como uma camada explicável de preparação de decisão entre NASA, produtor e assistência técnica, começando por Rio Verde. O diferencial competitivo não é ter mais dados ou mais sprites; é ser o protótipo que consegue dizer “não sabemos” sem abandonar o usuário — e ainda conduzi-lo ao próximo passo útil.

Próximo marco recomendado: implementar o P0 competitivo acima e realizar cinco sessões de validação antes de ampliar datasets ou animações.
