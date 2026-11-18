# Por que aparece N/D

N/D significa evidência insuficiente para aquela afirmação, não valor zero nem inadequação da cultura ou do município. O motivo deve ser mostrado junto ao campo, com a fonte e a ação possível.

| Campo | Quando fica N/D | Caminho de correção |
| --- | --- | --- |
| Fixação biológica de nitrogênio | Nenhuma cultura da sequência possui `nitrogenFixationPotential` documentado; família botânica não substitui evidência específica. O catálogo projeta apenas registros verificados. | Auditar registros por cultura e contexto; adicionar fonte verificável e texto qualitativo, sem estimar kg de N. Diferenciar “sem evidência” de “não fixa”. |
| Período potencialmente descoberto | Faltam slots, culturas ou mês de início da safrinha; sem quatro janelas completas o motor não calcula ocupação. Duração pode ser presumida quando o ciclo não é documentado. | Mostrar qual entrada falta; pedir confirmação das janelas. Evidenciar quando a duração é presumida; obter ciclos com fonte antes de tratá-los como documentados. |
| Proteção contra erosão | Depende da ocupação acima, da erosividade da chuva e, para relevo, da declividade SRTM. Palhada, manejo e proteção efetiva do talhão não são medidos. | Exibir separadamente ocupação, chuva erosiva, relevo e lacunas de manejo. Nunca converter contexto em perda de solo ou proteção medida. |
| NDVI MODIS | A série municipal exige código IBGE de 7 dígitos e artefato íntegro com status `available`. Pontos fora da malha municipal, falha de leitura/checksum ou 15 municípios com série indisponível/insuficiente retornam N/D. | Expor o motivo técnico por município; corrigir os 15 pontos sobre água somente com novo processamento e proveniência. Não usar NDVI municipal como NDVI da fazenda. |
| ZARC | Não há município resolvido, registro da safra para a cultura, tabela por decêndio, tabela de sequeiro, ou correspondência segura de tipo de solo/grupo de ciclo. | Mostrar o motivo devolvido por `zarcWindowStatus`; atualizar índice da safra e mapeamento de culturas com fontes oficiais. Ausência de registro não significa “inapto”. |

## Culturas fora das oito iniciais

O catálogo contém 28 culturas, mas os testes atuais registram `parameterStatus: missing` para todas; isso não significa que todos os campos estejam vazios. Há registros verificados por campo, e a interface ainda usa os rótulos genéricos “Sem dado cadastrado” e “dados ainda em levantamento” quando o campo ou perfil não está disponível. As culturas adicionais têm cobertura desigual; não é correto copiar limites térmicos, Kc, ciclos ou janelas das oito originais.

## Plano de implementação

1. Criar inventário por cultura × campo × fonte × contexto × estado de verificação, distinguindo ausente, provisório, verificado e não aplicável. Revisar a projeção `parameterStatus` para refletir cobertura parcial sem promovê-la a perfil agronômico completo.
2. Propagar códigos de motivo estáveis do motor até cada cartão N/D e oferecer ação correspondente: completar slots, informar mês, conferir município, ou abrir fontes. Manter `null` no cálculo.
3. Priorizar fontes oficiais/primárias para culturas adicionais e validar espécie, cultivar, sistema, região, unidade, safra e janela antes de incorporar cada campo. Testar regressão de proveniência e de não promoção de lacunas.
4. Validar em municípios distintos: município com ZARC/NDVI, sem ZARC da cultura, um dos 15 NDVI indisponíveis e ponto fora do Brasil. Revisar versão móvel e leitura por teclado.

## Implementação atual (2026-11-17)

- Inventário por cultura e campo em `lib/catalog-coverage.ts`: estado verificado, não verificado ou ausente; título da fonte, URL, contexto e cultivar. A ficha indica perfil parcial quando há registros com fonte, sem declarar todos os parâmetros verificados.
- Códigos de motivo em `lib/nd-reasons.ts` para fixação de N, janelas descobertas, erosão, NDVI e ZARC geral. A comparação de solo e o painel de fontes mostram motivo e próxima ação. Células ZARC desconhecidas mostram a nota específica de `zarcWindowStatus` por cultura.
- A leitura municipal NDVI preserva o motivo `insufficient_coverage`, `unavailable`, registro ausente, artefato ausente/inválido ou checksum divergente até a análise. Não utiliza coordenada/UF isoladas nem transforma ausência em zero.
- Faltam fontes primárias suficientes para preencher parâmetros específicos de muitas culturas. A ampliação científica do catálogo continua dependente de revisão de fonte e contexto; nenhum valor foi extrapolado das oito culturas originais.
