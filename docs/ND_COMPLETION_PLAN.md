# Plano para eliminar N/D evitável

Data: 2026-11-17. Este documento planeja **preencher dados reais e verificáveis**, não apenas trocar rótulos. Meta operacional: zero N/D sem causa; zero N/D corrigível nos casos suportados. Um N/D sem fonte aplicável, sem entrada opcional do produtor ou sem registro oficial continua desconhecido — nunca vira zero, “inapto” ou valor estimado sem proveniência.

## Linha de base e medição

- Catálogo: 28 culturas × 8 campos centrais (`cycleDaysRange`, `idealTempC`, `viableTempC`, `soilPhRange`, `kcStages`, `residuePotential`, `nitrogenFixationPotential`, `rootingClass`) = 224 combinações. Nos arquivos atuais, 63 combinações têm pelo menos um registro verificado, não nulo e ativo: respectivamente 11, 6, 12, 12, 9, 8, 5 e 0 culturas. **Isto mede presença de fonte, não aplicabilidade universal da fonte nem disponibilidade de um parâmetro projetado no motor.**
- NDVI: `data/ndvi-brazil/report.json` registra 5.556 disponíveis, 10 com cobertura insuficiente e 5 indisponíveis entre 5.571 municípios processados. Série municipal não representa cada fazenda.
- Registrar para cada N/D: tela, indicador, local, cultura, safra, motivo estável, dado necessário, fonte candidata, responsável, estado da aquisição, resultado da validação e decisão final. Gerar relatório reproduzível a partir dos artefatos; acompanhar também quantos casos são falta de entrada, fonte, processamento, incompatibilidade de escopo ou não aplicáveis.

## Ordem de execução: um sprint por vez

### F29 — Inventário completo e regras de fechamento

1. Gerar matriz executável cultura × campo × contexto/cultivar × fonte/URL × verificação × valor projetado. Auditar cada rota que pode produzir N/D: catálogo, comparação A/B/C, laboratório, série climática, solo, relevo, NDVI, ZARC e exportação.
2. Para cada campo, definir unidade, espécie/cultivar, sistema de cultivo, região, época, tipo de evidência, validade temporal e regra de seleção entre fontes conflitantes. Proibir a promoção automática de um estudo específico a regra nacional.
3. Publicar painel de cobertura e conjunto de casos de referência (município com todos os dados, município sem ZARC da cultura, um dos 15 NDVI, ponto externo ao Brasil, sequência de slots incompleta).

**Aceite:** toda ocorrência de N/D rastreada a um motivo e a uma decisão; matriz e relatório gerados por comando, com testes de consistência.

### F30 — Entradas e janelas da rotação

1. Auditar os quatro slots, meses de início e duração usados para os 24 meses. Quando faltarem, pedir a informação ao produtor e indicar exatamente qual slot/mês falta.
2. Buscar ciclos documentados para as 28 culturas, separando cultivar, finalidade, ambiente e faixa de duração. Manter a janela presumida rotulada; jamais apresentar duração padrão como ciclo medido.
3. Recalcular período potencialmente descoberto somente depois de janelas completas. Testar sobreposições, consórcios, plantas perenes e ausência de mês de safrinha.

**Aceite:** casos com entradas e janelas válidas produzem ocupação; casos incompletos mostram o campo a completar, sem contagem falsa de solo descoberto.

### F31 — Evidência agronômica das 28 culturas

1. Pesquisar espécie por espécie em publicações primárias e institucionais, começando pelos campos que afetam as telas: fixação de N, potencial de palhada, ciclo, temperatura, pH, Kc apenas como referência e classe radicular. Priorizar Embrapa e literatura científica rastreável; FAO-56 é referência metodológica para Kc, mas seus valores típicos exigem checagem de clima, manejo e fase antes de uso local.
2. Para cada valor, guardar trecho/página, URL, data de acesso, unidade, espécie, cultivar, local, sistema e status de verificação. Revisão agronômica independente aprova a aplicação no produto. Sem fonte comparável, classificar “não avaliado” ou “não aplicável”, explicitando por quê; não usar família botânica para presumir fixação.
3. Projetar somente registros aprovados no catálogo e no motor. Separar **potencial qualitativo de FBN** de fixação observada no talhão; não calcular kg de N nem ganho de produtividade.

**Aceite:** cada campo exposto tem fonte aplicável ou decisão formal de não exposição; nenhuma cultura mostra “dados em levantamento” se já há evidência válida para aquele campo. Cobertura e conflitos auditáveis por cultura.

### F32 — ZARC nacional por safra e cultura

1. Atualizar o importador da Tábua de Risco MAPA para a safra vigente e a base “Perene, Olerícola e Sem Safra”; validar schema, códigos IBGE, nomes/sinônimos, decêndios, manejo, tipo de solo/AD e grupo de ciclo. Comparar totais por UF/cultura com o arquivo oficial.
2. Distinguir ausência de município, ausência de cultura na safra, ausência de tabela por manejo, incompatibilidade de solo/ciclo e mês não indicado. Sem registro permanece “sem registro oficial”, nunca “inapto”.
3. Versionar fonte, data, checksum e diff de atualização; testar municípios de todas as UFs e culturas novas antes de publicar.

**Aceite:** todo registro oficial compatível do conjunto importado é consultável; para cada N/D restante há motivo ligado à tabela/safra exata.

### F33 — NDVI municipal

1. Reprocessar os 15 municípios sem série útil com um **novo ponto terrestre dentro da malha IBGE**, máscara de água/qualidade do MOD13Q1.061 e validação de inclusão geométrica. Registrar método, ponto, fonte, contagem de compósitos, cobertura, QA e checksum.
2. Comparar amostras com o produto NASA original e repetir a validação nacional. Se um município continuar sem pixel confiável, conservar N/D documentado; não copiar valor de município vizinho nem de um ponto de água.
3. Manter o resultado como contexto municipal histórico, sem inferir vigor, produtividade ou condição da fazenda.

**Aceite:** 5.571 municípios com resultado `available` **ou** motivo final verificável; meta de recuperar os 15, condicionada a observações válidas. Nenhum uso em decisão agronômica de talhão.

### F34 — Clima, solo e relevo

1. Para NASA POWER, medir cobertura por variável/mês, falha de serviço, sentinelas, período e compatibilidade da fixture; tentar novamente e manter cache verificado apenas para coordenada/período exatos. Persistir motivo específico para P, temperatura, ET₀ e balanço P−ET₀. Não produzir ETc, consumo ou necessidade de irrigação.
2. Para solo regional, auditar cobertura e proveniência do artefato SoilGrids; adquirir recortes via WCS ou outro canal oficial suportado, com profundidade, unidade e incerteza explícitas. Medição do produtor continua separada da estimativa regional.
3. Para relevo, auditar falhas de SRTM/OpenTopoData e preparar artefato nacional versionado quando a fonte permitir. Calcular apenas declividade/contexto; proteção efetiva e perda de solo exigem observações de manejo e outros fatores que o produto não possui.

**Aceite:** N/D de infraestrutura corrigível tem repetição/artefato verificável; falhas persistentes mostram variável e origem. Nenhum valor de grade é rotulado como medição do talhão.

### F35 — Fechamento, experiência e validação

1. Em cada cartão, trocar N/D genérico por estado preciso: aguardando entrada, fonte ausente, sem registro oficial, fonte insuficiente, não aplicável ou serviço indisponível. Mostrar ação possível sem sugerir que o produtor pode preencher um dado científico.
2. Rodar matriz de testes por cultura, município, safra e cenário; revisão agronômica dos registros novos; testes de contrato, proveniência, acessibilidade, mobile, lint, typecheck, unitários, E2E e build.
3. Publicar relatório final: cobertura por campo/cultura/UF, quantos N/D corrigidos, quantos irredutíveis e justificativa individual. Repetir na atualização de safra e dos artefatos NASA.

**Aceite final:** nenhum N/D sem explicação; nenhum dado inferido como medição; toda combinação suportada com fonte válida exibida corretamente; lacunas irredutíveis explicitadas e revisadas.

## Fontes oficiais verificadas para iniciar

- [MAPA, Tábua de Risco ZARC e CSV da safra 2026/27](https://dados.agricultura.gov.br/dataset/tabua-de-risco-zoneamento-agricola-de-risco-climatico) e [dicionário da Tábua](https://dados.agricultura.gov.br/dataset/6d3d141c-885e-41a4-ab7f-dc8ff323b96f/resource/bebb0ebb-bc75-460c-b900-a7a1ebd87bee/download/dicionario-de-dados-tabua-de-risco-04_24.pdf).
- [NASA POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/); [NASA Earthdata MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061); [guia de qualidade MOD13 v6.1](https://lpdaac.usgs.gov/documents/621/MOD13_User_Guide_V61.pdf).
- [ISRIC SoilGrids e canais de acesso](https://docs.isric.org/globaldata/soilgrids/index.html); a documentação informa que a API REST está pausada e aponta WCS para recortes.
- [Embrapa: fixação biológica de N](https://www.embrapa.br/pt/tema-fixacao-biologica-de-nitrogenio/perguntas-e-respostas); [FAO-56, coeficientes de cultura](https://www.fao.org/4/x0490e/x0490e0b.htm); [Embrapa: fatores da erosão hídrica](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/567796/1/bolpd63.pdf).
