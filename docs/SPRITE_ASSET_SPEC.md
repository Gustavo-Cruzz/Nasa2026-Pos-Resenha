# Field Shift — especificação de sprites e assets imersivos

> Product scope: Brazil nationwide. Visual assets must not imply that a local example, municipality or UF represents the entire country.

Versão: 1.0  
Objetivo: completar a linguagem visual do produto sem representar adequação agrícola, produtividade ou condição de campo não observada.

## 1. Direção de arte

- Pixel art limpa, rural e contemporânea; evitar estética infantil ou de cassino.
- Perspectiva consistente: lateral/isométrica leve, sem misturar ângulos entre assets da mesma cena.
- Contornos em verde-floresta ou marrom profundo; evitar preto puro.
- Paleta-base compatível com a UI: floresta `#102317`, folha `#B7E35B`, solo `#76543A`, palha `#D2B46C`, céu `#6A9FA3`, creme `#F3F0DE` e alerta `#E5B94E`.
- Luz vindo do canto superior esquerdo em todos os elementos de ambiente.
- Sem texto embutido nas imagens. Rótulos e números permanecem em HTML.
- Transparência real, sem fundo branco ou halo de antialiasing.
- Sprites devem continuar legíveis em 32, 48 e 64 px.

## 2. Regras científicas e semânticas

### Assets sempre permitidos

Elementos decorativos neutros: terreno, cerca, celeiro, satélite, órbita, pin, prancheta, lupa, transições e efeitos de seleção.

### Assets condicionados a dados

Chuva, temperatura, cobertura regional e outros símbolos observacionais só aparecem associados ao dado e à fonte exibidos na interface. Eles não devem sugerir previsão.

### Assets proibidos nesta fase

- lavoura “saudável”, “doente”, “seca”, “fértil” ou “produtiva”;
- raízes profundas, carbono, nitrogênio, irrigação necessária ou ganho de rendimento;
- selo visual de cultura “ideal”, “aprovada” ou “recomendada”;
- mapa do Brasil preenchido como se o ZARC de Rio Verde valesse nacionalmente;
- antes/depois que sugira melhoria agronômica calculada.

## 3. P0 — pacote necessário para a versão final

### A. Cena principal modular da fazenda

| ID | Arquivo | Dimensão nativa | Tipo | Uso |
|---|---|---:|---|---|
| ENV-01 | `field-sky-day.png` | 512×288 | opaco | Fundo neutro da landing e cabeçalhos narrativos |
| ENV-02 | `field-horizon.png` | 512×288 | transparente | Morros e árvores distantes |
| ENV-03 | `field-plots.png` | 512×288 | transparente | Talhões neutros, sem cultura identificável |
| ENV-04 | `field-foreground.png` | 512×288 | transparente | Cerca, capim e moldura frontal |
| ENV-05 | `farm-buildings.png` | 256×128 | transparente | Celeiro/silo genéricos, sem marca regional |

As cinco camadas devem encaixar perfeitamente no mesmo canvas. Reservar o terço central para sobreposição de até três sprites de culturas existentes. Entregar também uma composição de referência `field-scene-reference.png`, não destinada ao runtime.

### B. Narrativa NASA → clima → fazenda

| ID | Arquivo | Dimensão | Frames | Uso |
|---|---|---:|---:|---|
| NAS-01 | `earth-orbit-sheet.png` | 1024×256 | 4 de 256×256 | Terra/órbita decorativa |
| NAS-02 | `satellite-sheet.png` | 384×64 | 6 de 64×64 | Satélite em deslocamento leve |
| NAS-03 | `data-pulse-sheet.png` | 384×64 | 6 de 64×64 | Pulso de transmissão, não “chuva” |
| NAS-04 | `climate-grid-overlay.png` | 512×288 | estático | Grade de dados abstrata sobre a cena |

Animações devem funcionar a 8–10 fps e durar no máximo 800 ms por ciclo. A interface exibirá versão estática quando `prefers-reduced-motion` estiver ativo.

### C. Sistema de proveniência e evidência

Produzir em canvas 32×32, além de uma variante 16×16 simplificada.

| ID | Arquivo | Significado |
|---|---|---|
| EVD-01 | `evidence-nasa.png` | observação histórica NASA |
| EVD-02 | `evidence-farmer.png` | dado informado pelo produtor |
| EVD-03 | `evidence-regional.png` | contexto regional aplicável |
| EVD-04 | `evidence-unknown.png` | dado ausente/N/D, sem reprovação |
| EVD-05 | `evidence-source.png` | fonte ou proveniência consultável |
| EVD-06 | `evidence-review.png` | revisar com técnico/agronomia |

Cada ícone precisa de silhueta diferente. Cor nunca pode ser o único diferenciador. `evidence-unknown` deve ser neutro — não usar X vermelho, caveira ou planta murcha.

### D. Miniaturas dos três cenários

Criar fundos, não combinações fechadas. O app sobreporá os sprites das culturas escolhidas.

| ID | Arquivo | Dimensão | Composição |
|---|---|---:|---|
| SCN-01 | `scenario-continuity.png` | 192×112 | talhão com trilha contínua A |
| SCN-02 | `scenario-soil.png` | 192×112 | talhões alternados B, sem afirmar solo melhor |
| SCN-03 | `scenario-water.png` | 192×112 | grade climática/medidor histórico C, sem gota de economia |
| SCN-04 | `scenario-empty.png` | 192×112 | campo neutro para cenário sem cultura proposta |

Manter uma zona livre de 72×72 no centro-direita para o sprite da cultura. Os fundos identificam a estratégia pelo arranjo, não por uma promessa de resultado.

### E. Estados de interação

| ID | Arquivo | Dimensão/frames | Uso |
|---|---|---|---|
| INT-01 | `selection-ring-sheet.png` | 384×64, 6 frames | seleção de cultura/slot |
| INT-02 | `slot-place-sheet.png` | 384×64, 6 frames | confirmação curta ao colocar uma cultura |
| INT-03 | `analysis-loading-sheet.png` | 512×64, 8 frames | consulta/normalização de dados |
| INT-04 | `draft-saved-sheet.png` | 256×64, 4 frames | confirmação do rascunho local |
| INT-05 | `unknown-placeholder.png` | 64×64 | slot N/D sem aparência de erro |

Efeitos não devem bloquear clique, alterar layout ou durar mais de 800 ms. Evitar confete, moedas, troféus e fogos.

### F. Marcos da jornada

| ID | Arquivo | Dimensão | Etapa |
|---|---|---:|---|
| NAV-01 | `journey-explore.png` | 48×48 | atlas/localização |
| NAV-02 | `journey-farm.png` | 48×48 | histórico da fazenda |
| NAV-03 | `journey-lab.png` | 48×48 | laboratório de cenários |
| NAV-04 | `journey-compare.png` | 48×48 | comparação e conversa técnica |

Entregar estados `default` e `active` na mesma spritesheet 384×48: oito frames de 48×48, na ordem Explore, Farm, Lab, Compare; primeiro os quatro default, depois os quatro active.

## 4. P1 — assets desejáveis, não bloqueadores

1. `field-night.png` e iluminação noturna apenas como tema decorativo.
2. Personagem fictícia de demonstração: produtora e técnica, 64×64, poses neutra/conversa; não associar roupa ou fenótipo a “produtor brasileiro padrão”.
3. Objetos de conversa técnica: prancheta, amostra identificada, tablet e relatório, 32×32.
4. Tiles de terreno neutro para uma futura cena navegável: 32×32, somente solo/caminho/grama/água; não representar cultivo ou aptidão.
5. Transição final com as três hipóteses convergindo para uma prancheta de revisão, sem pódio ou vencedor.

## 5. Culturas existentes

Os dez PNGs atuais de `public/assets/crops/` são suficientes. Não redesenhar nem criar mais espécies agora. Caso seja necessário harmonizá-los, preservar:

- canvas 64×64 RGBA;
- escala aparente semelhante entre espécies;
- base da planta alinhada em `y = 58 ± 2 px`;
- margem transparente mínima de 3 px;
- nomes de arquivo atuais, porque já são usados pelo código.

P0 interativo atual: soja, milho, sorgo, girassol, feijão-caupi e braquiária-ruziziensis. Os demais continuam arte de catálogo/P1 e não devem ganhar destaque que sugira elegibilidade.

## 6. Exportação

- Formato runtime: PNG-24/RGBA, perfil sRGB, sem metadados pessoais.
- Pixel art: nearest-neighbor, sem blur, sem compressão com perda.
- Spritesheets horizontais; frames quadrados e alinhados na grade.
- Fundo transparente para overlays, ícones, personagens e efeitos.
- Peso-alvo: até 40 KB por ícone/sprite, 120 KB por sheet e 250 KB por camada grande.
- Entregar arquivo-fonte editável separado (`.aseprite`, `.psd` ou equivalente) fora do bundle público.
- Entregar licença/autoria em `ASSET_LICENSE.md`.

Estrutura sugerida:

```text
public/assets/
  crops/          # existente
  environment/
  evidence/
  interactions/
  journey/
  nasa/
  scenarios/
```

## 7. Ordem de produção

1. Evidência/proveniência: EVD-01 a EVD-06.
2. Miniaturas A/B/C: SCN-01 a SCN-04.
3. Cena modular: ENV-01 a ENV-05.
4. Jornada: NAV-01 a NAV-04.
5. Feedback: INT-01 a INT-05.
6. Narrativa NASA: NAS-01 a NAS-04.
7. P1 somente após integração e teste com usuários.

## 8. Checklist de aceite

- [ ] Todos os nomes e dimensões seguem esta especificação.
- [ ] Assets continuam reconhecíveis em tela de 390 px e zoom de 200%.
- [ ] Nenhum asset contém texto rasterizado.
- [ ] Estado desconhecido não parece erro ou inadequação.
- [ ] A/B/C permanecem distinguíveis em escala de cinza.
- [ ] Versões estáticas existem para todas as animações.
- [ ] Assets condicionados nunca aparecem sem dado e fonte correspondentes.
- [ ] Não há promessa visual de produtividade, economia de água, saúde do solo ou validação local.
- [ ] Arquivos-fonte e licença acompanham a entrega.

## 9. Lote mínimo recomendado

Para uma primeira entrega útil, produzir apenas 15 arquivos: seis ícones EVD, quatro fundos SCN e cinco camadas ENV. Esse lote resolve proveniência, comparação e atmosfera. Animações e personagens podem esperar sem prejudicar a experiência principal.
