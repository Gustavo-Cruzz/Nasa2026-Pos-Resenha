# AGENTS.md — regras de trabalho para GPT Codex no Field Shift

## Missão
Implementar `PROJECT_SPEC.md` fielmente como produto demonstrável de apoio à decisão sobre rotação de culturas. Não transformar a aplicação em um dashboard genérico do clima nem em um catálogo estático.

## Ordem obrigatória
1. Ler `PROJECT_SPEC.md` e `docs/SPRINT_LOG.md`.
2. Executar somente o sprint solicitado.
3. Inspecionar código existente antes de alterar.
4. Planejar arquivos, dependências e testes.
5. Implementar de modo incremental e testável.
6. Rodar `npm run lint && npm run typecheck && npm run test && npm run build` (quando scripts estiverem criados).
7. Atualizar `docs/SPRINT_LOG.md` com resultados, limitações e próximos passos.
8. Commit por sprint quando Git estiver configurado.

## Segurança científica
- Não inventar nem supor medições NASA, atributos regionais de solo, Kc, ciclos, limites térmicos, calendários ou ganhos de nutrientes/produtividade.
- Cada parâmetro agronômico não trivial deve ter `sourceRefs` e estado de validação. Sem fonte = `null` / “não disponível”.
- Não atribuir valores de propriedade de solo a talhão com base em grade regional sem avisar que são estimativas.
- NASA POWER fornece histórico/reanálise, não previsão meteorológica futura.
- SoilGrids REST API temporariamente pausada: não construir dependência online obrigatória.
- Uma nota de 0 a 100 é heurística relativa, nunca confiança estatística nem probabilidade de resultado.
- Sempre comunicar riscos, limitações e lacunas juntamente com benefícios.
- Não usar fallback fictício indistinguível de dado real; exigir metadados do fixture NASA.

## Regras de implementação
- TypeScript strict; evitar `any`, `as unknown as`, `@ts-ignore` e mocks em produção.
- Validar inputs com Zod no cliente e servidor.
- Domínio em `lib/engine` com funções puras e testes isolados.
- Separar localização global (`climate_only`) do piloto regional (`pilot_recommendation`).
- Usar IDs constantes de culturas e traduções; não acoplar lógica a strings de UI.
- UI responsiva, acessível, com estados loading/error/unknown.
- Não adicionar IA generativa, login, banco de dados, mapas pesados ou dependências sem propósito essencial.
- Não publicar token, dados pessoais, fontes sem licença ou imagens sem direito de uso.

## Entrega ao fim de cada sprint
Responder no formato:
- **Implementado:** ...
- **Arquivos:** ...
- **Testes:** lint / typecheck / unit / build (pass/fail com saída resumida)
- **Evidências científicas ou dados:** ...
- **Limitações:** ...
- **Próximo sprint:** ...

Se não puder comprovar uma afirmação, escreva que é limitação; nunca declare “feito” quando estiver incompleto.
