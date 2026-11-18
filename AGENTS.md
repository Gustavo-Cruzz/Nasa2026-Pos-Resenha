# Instruções do agente — Plantaê

- Seja conciso, direto e preciso. Leia `PLANEJAMENTO.md` e inspecione o código antes de editar; siga um sprint por vez.
- Planeje arquivos, dependências e testes. Rode lint, typecheck, testes unitários e build; registre implementação, evidências, limitações e próximo passo em `PLANEJAMENTO.md`. Faça commit apenas com Git configurado.
- Nunca invente medições NASA, atributos de solo, Kc, ciclos, limites térmicos, calendários, ganhos ou fixtures. Preserve valores ausentes como desconhecidos e mantenha fontes, contexto e status de verificação. Simulações e estimativas devem ser identificadas; não as use para recomendações ou ZARC.
- O produto cobre o Brasil nacionalmente. Separe contexto municipal/regional da exploração climática global e de medições do talhão; não promova coordenadas ou estados sem processamento a evidência regional. NASA POWER representa histórico/reanálise, não previsão.
- FAO-56 ET0 e precipitação menos ET0 são permitidos apenas como indicadores climáticos; ETc, consumo da cultura, necessidade de irrigação e produtividade permanecem fora do escopo.
- Use TypeScript estrito, Zod nas fronteiras, funções puras no motor e UI acessível e responsiva. Não exponha segredos nem acrescente dependências sem necessidade. SQLite local e login simples são permitidos apenas para o painel de fazenda, conforme o planejamento; em Vercel o arquivo é temporário.
