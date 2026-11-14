# Relatório de fit — Field Shift × NASA Space Apps 2026

Data: 2026-11-14 · Desafio: *Field Shift: Adapting Farms with NASA Data* · Estado do código: commit `7cc8a61` + trabalho local da rodada 10b (sem commit).

Fontes consultadas: [Judging & Awards Guide 2026](https://www.spaceappschallenge.org/resources/judging-awards-guide), [página do desafio e aba Resources](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/), [vencedores globais de 2025](https://www.spaceappschallenge.org/2025/meet-the-2025-global-winners/). Notas de 1 a 5 e probabilidades relativas são **julgamento meu**, não dados oficiais.

---

## 1. Veredito

- O projeto responde ao desafio de ponta a ponta e é **tecnicamente raro** no que importa para "Validity" e "Relevance": quatro conjuntos de dados NASA entram como números (POWER, GPM IMERG, MODIS NDVI, SRTM), mais um quinto como camada visual (SMAP). Tem rigor de fonte, N/D explícito e testes (129).
- O maior risco **não é científico: é operacional.** A URL antiga (`nasa-2026-one.vercel.app`) está em 404, mas a URL atual, **`https://nasa2026-field-shift.vercel.app/`, está no ar** (verificada em 2026-11-14: `/demo`, `/settings`, manifest, service worker e worker do mapa respondem 200). O prazo de submissão é **amanhã, domingo 15/11, 23:59 (horário local do seu evento)**, e a página de submissão e os materiais precisam estar **em inglês**.
- Realismo estatístico: em 2025 houve **18.860 equipes e 10 prêmios globais**; a chance base de qualquer equipe ganhar um prêmio é inferior a 0,1%. A meta realista e valiosa é **vencer o julgamento local → Global Nominee (3/12) → Finalist (17/12)**. Abaixo, o ranking dos prêmios onde o Field Shift tem mais chance *se chegar à rodada executiva*.

## 2. Prazos e exigências de submissão (crítico)

| Item | Regra oficial | Situação |
|---|---|---|
| Prazo | submeter antes de domingo 15/11, 23:59 local | **faltam ~1 dia** |
| Demo | slides (máx. 7, incluindo título/intro) **ou** vídeo de até **30 s** | **não existe ainda** |
| Idioma | página de submissão e materiais em **inglês** (vídeo pode ser em outro idioma com legendas em inglês) | app abre em pt-BR por padrão |
| Referências | todos os recursos externos (código, texto, imagens, dados) listados no campo *References* | lista pronta abaixo (§7) |
| Originalidade | declarar trabalho original; sem material com copyright sem permissão | assets pixel-art têm registro de proveniência no repositório |
| Equipe | 1–6 pessoas, todas registradas no mesmo evento local | verificar |
| Link funcional | juízes precisam abrir o projeto | no ar em `nasa2026-field-shift.vercel.app`; **confirmar que o deploy tem o último commit** |
| Cronograma | Nominees 3/12 · Finalists 17/12 · Winners 26/01/2027 | — |

Critérios (cada um de 1 a 5 em todos os níveis de julgamento): **Impact, Creativity, Validity, Relevance, Presentation**. A guia destaca Presentation como o critério que as equipes mais negligenciam.

## 3. Cobertura do desafio (o que o texto oficial pede)

| O desafio pede | Status | Onde está |
|---|---|---|
| Ferramenta de apoio à decisão (não substitui o agricultor) | Atende bem | herói de decisão, "próxima verificação humana", exportação |
| Comparar ≥ 3 estratégias, incluindo a atual | Atende | cenários A/B/C; A = plano do produtor |
| Por que foi sugerida, evidência, benefícios, lacunas, riscos | Atende, benefícios são o ponto mais fraco | Centro de Evidências, "O que falta", calendário, insights |
| Períodos de solo exposto / épocas vulneráveis | Atende **só nos 3 pontos da demo** | NDVI MODIS + meses de menor vegetação; calendário térmico em qualquer ponto |
| Prioridades do agricultor | Atende | sliders de água/solo/operação, ponto de água declarado |
| Sliders de cenário (chuva/temperatura) | Atende | painel "E se?" (±3 °C, ±30%), hipotético e resetável |
| Mapas interativos / hotspots de campo | Atende em parte | Atlas global + SMAP visual + polígono; **mapa de hotspots de relevo** no polígono |
| Explicar ET, NDVI, anomalias, frost, balanço hídrico | Parcial | metodologia e rótulos; falta glossário na tela |
| Satélite × medição de campo | Atende | avisos "não é medição do talhão", N/D |
| Harmonizar resoluções numa grade comum | Parcial | harmoniza em série mensal no ponto; não há grade espacial comum |
| Incerteza e onde validar com especialista | Atende bem | cobertura %, N/D, "revisão técnica local" |
| SI/IA e comparar abordagens | **Não** | motor é por regras, sem modelo estatístico/IA |

## 4. Dados NASA recomendados na aba Resources × uso real

| Recurso NASA | Uso no app | Nota |
|---|---|---|
| NASA POWER | **Numérico**: T2M/Tmax/Tmin, chuva, UR, vento, radiação, pressão; **ET0 FAO-56** e balanço P − ET0 mensal | falta usar para *frost risk* (Tmin ≤ 0 °C), citado no texto do desafio |
| GPM / IMERG | **Numérico**: dias de chuva e total mensal (via POWER) | falta frequência de tempestades extremas |
| MODIS NDVI | **Numérico** em 3 pontos (Rio Verde, Acra, Nova Délhi), 2011–2025, 335 composites | pontos são centros de cidade (NDVI absoluto baixo); só vale a forma sazonal; **não cobre pontos arbitrários** |
| SRTM | **Numérico, ao vivo, qualquer coordenada**: elevação, declividade, classes Embrapa, hotspots de relevo | via OpenTopoData (1 chamada/s, 1000/dia) |
| SMAP | **Só camada visual** (GIBS); série numérica exige Earthdata | declarado N/D; `GWETROOT` (MERRA-2) cobre umidade de raiz como contexto modelado |
| Landsat / VIIRS | não usado | — |
| ECOSTRESS | não usado | hotspots de estresse térmico/ET ficam de fora |
| GLDAS/NLDAS, USDA, GAEZ | não usado | USDA é centrado nos EUA; GAEZ seria o melhor complemento global |

**Leitura:** 4 de 6 conjuntos NASA citados como centrais entram como número. Os que faltam (SMAP numérico, ECOSTRESS, Landsat) são os que exigem Earthdata ou pipeline pesado — um juiz da NASA vai notar, então a narrativa deve dizer isso de forma ativa ("declaramos N/D em vez de simular").

## 5. Auto-avaliação pelos 5 critérios

| Critério | Hoje | Teto em 24 h | Por quê |
|---|---|---|---|
| Impact | 3–4 | 4 | problema real (rotação sob clima instável), contexto brasileiro (ZARC, PAM, IBGE), mas sem usuário real validando |
| Creativity | 4 | 4 | identidade pixel-art, calendário mês a mês, "N/D em vez de ok", sliders hipotéticos; o precedente de 2025 (ver §6) reduz a novidade só do visual |
| Validity | 4 | 4–5 | ET0 reproduz o exemplo FAO-56, fontes verificadas com trecho e página, 129 testes; falta validação com agrônomo/produtor |
| Relevance | 4 | 4 | NASA é o núcleo (POWER, IMERG, MODIS, SRTM); faltam ECOSTRESS/SMAP numérico |
| Presentation | **2–3** | 4 | sem vídeo/slides, app em pt-BR por padrão, URL fora do ar: **é aqui que mais se ganha em 24 h** |

## 6. Prêmios globais: onde há mais chance

Os 10 prêmios (descrições oficiais) e a leitura de fit. "Chance relativa" compara os prêmios **entre si** para este projeto, condicionada a chegar à rodada executiva.

| # | Prêmio | Chance relativa | Fit | O que decide |
|---|---|---|---|---|
| 1 | **Art & Technology** ("combina habilidades técnicas e criativas") | **Alta** | Pixel-art + motor científico real; personagem reativo, calendário, mapa de hotspots | **Precedente:** em 2025 esse prêmio foi para *Zumorroda-X*, um jogo pixel-style de fazenda com dados NASA. Posicione como *ferramenta de decisão com ciência por trás*, não como jogo |
| 2 | **Best Use of Data** ("torna dados espaciais acessíveis ou os usa numa aplicação única") | **Alta** | 4 conjuntos NASA numéricos fundidos em calendário, balanço hídrico, relevo e vegetação; N/D honesto | Mostrar a fusão numa tela (1 ponto → 4 satélites) e assumir os limites (SMAP/ECOSTRESS) |
| 3 | **Best Use of Science** ("melhor uso válido do método científico") | **Média–alta** | ET0 validado, fontes com citação literal, incerteza explícita | Falta um "resultado": uma comparação mostrando que a leitura bate com a realidade (ex.: ZARC de Rio Verde × calendário) |
| 4 | **Local Impact** ("maior potencial para fazer diferença na comunidade local") | **Média** | Goiás/Rio Verde, ZARC, extensionistas | Precisa de **um técnico ou produtor** citado/validando, mesmo que numa frase |
| 5 | **Best Use of Technology** ("uso mais inovador de tecnologia") | **Média–baixa** | pipeline ao vivo, PWA offline, SRTM/POWER em tempo real | Sem IA/ML o "inovador" é difícil; o diferencial é engenharia de honestidade (N/D), não tecnologia nova. O vencedor de 2025 (*Twisters*) era um app de decisão com NASA, mas com previsão probabilística |
| 6 | **Best Storytelling** | **Média (depende só da demo)** | personagem + "agricultor decide, app mostra evidência, agrônomo valida" | O vídeo de 30 s é o ativo; sem ele, zero |
| 7 | **Galactic Impact** | **Média–baixa** | segurança alimentar e adaptação climática, genérico | exigiria dimensionar impacto (nº de agricultores, regiões) |
| 8 | Global Connection | Baixa | demo em Brasil, Gana e Índia | não "conecta pessoas" |
| 9 | Most Inspirational | Baixa | difícil de planejar | depende da história humana |
| 10 | Best Mission Concept | Muito baixa | não é conceito de missão | — |

**Foco recomendado:** Art & Technology + Best Use of Data (+ Storytelling via vídeo). Local Impact sobe de Média para Média–alta com uma única validação humana.

## 7. Pontos fracos honestos (o que um juiz vai perguntar)

1. **"Onde está a IA/SI?"** O texto do desafio fala em técnicas de SI. O motor é por regras (defensável por Validity, fraco para Technology). Resposta pronta: regras explícitas e auditáveis são uma escolha de produto para decisão agrícola; o modelo estatístico possível seria a mediana histórica por mês, que já usamos.
2. **"Funciona fora de Rio Verde?"** Sim para clima, ET0, relevo e calendário (Gana e Índia rodam ao vivo); NDVI só nos 3 pontos da demo; ZARC/PAM só no Brasil, e o app diz isso.
3. **"Alguém validou?"** Não. É a lacuna que mais pesa em Impact e Local Impact.
4. **Cultura incompleta:** o feijão-comum não tem faixa térmica de viabilidade documentada (fica N/D no calendário); arroz de terras altas, pH do feijão-caupi e ciclo da soja continuam abertos por falta de fonte com faixa.
5. **Dependência de serviços públicos:** OpenTopoData limita 1000 chamadas/dia; o app degrada para N/D, mas uma demo ao vivo com muita gente pode esgotar o limite.
6. **O mapa do Atlas** depende de OpenFreeMap; foi corrigido o worker, mas o e2e (Playwright) ainda não rodou.

## 8. Plano de 24 horas (ordem de valor)

1. **Confirmar o deploy** em `nasa2026-field-shift.vercel.app` (último commit na `main`) e abrir a URL em janela anônima (pt e en). *(só você consegue: exige sua conta Vercel.)*
2. **Abrir em inglês por padrão** (ou detectar `navigator.language`) para os juízes. Hoje é pt-BR.
3. **Vídeo de 30 s ou 7 slides**, roteiro: (1) problema do agricultor, (2) um ponto → 4 dados NASA, (3) calendário mês a mês + "soja fora da faixa em jul", (4) relevo/hotspots no polígono, (5) "N/D em vez de chute", (6) agrônomo valida, (7) o que vem depois (SMAP, ECOSTRESS).
4. **Uma validação humana**: uma frase de um técnico/produtor (mesmo informal) citada no vídeo e na página.
5. **Preencher References** (lista abaixo) e a declaração de originalidade.
6. Se sobrar tempo: *frost days* (Tmin ≤ 0 °C, definição ETCCDI) e dias de chuva muito forte (≥ 20 mm) com o POWER, que o texto do desafio cita (frost risk, extreme precipitation). São rápidos e sem fonte nova.

### Lista para o campo *References*

NASA POWER (Daily API); GPM IMERG via POWER; NASA MODIS MOD13Q1 v061 (LP DAAC) via Microsoft Planetary Computer; NASA SRTM GL1 v003 (NASA JPL 2013, doi:10.5067/MEASURES/SRTM/SRTMGL1.003) via OpenTopoData; NASA GIBS SMAP L4 (camada visual); MERRA-2 (`GWETROOT`); FAO Irrigation and Drainage Paper 56 (ET0); Arnoldus (1980) / Khentouche & Bella (índice de Fournier modificado); Weber et al., Embrapa Uva e Vinho cap. 5 (classes de relevo); ANA/SNIRH (Kc); Embrapa (Soja SP17 2020, Milho e Sorgo 2006/2010/2015, CNPSO 1996, CPATSA 1996, Embrapa Acre 1998, Embrapa Arroz e Feijão); IBGE (malha municipal 2025, PAM/SIDRA 5457); MAPA (ZARC 2026/2027); OpenFreeMap / OpenStreetMap; MapLibre GL JS; Next.js, React, Tailwind CSS, Zod. Assets pixel-art: ver `assets/` (registros de proveniência e licença no repositório).
