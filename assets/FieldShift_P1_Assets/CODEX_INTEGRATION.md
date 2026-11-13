# Prompt para o Codex — integrar o lote P1 sem alterar o motor científico

Leia `README.md`, `assets-p1-manifest.json` e `ASSET_LICENSE.md`. Integre os PNGs de `public/assets/` no projeto existente, preservando todas as artes de cultura e sua lógica de elegibilidade atual.

1. Exponha o cenário noturno como alternativa **decorativa** à cena P0, com controle de tema explícito do usuário. Não inferir noite a partir de coordenadas, clima, previsão ou dados NASA. Não exibir a cena como observação geográfica real.
2. Crie um componente de personagem de demonstração que aceite `role="producer"|"technician"`, `pose="neutral"|"talk"` e `animated: boolean`, com frames 64×64 e fallback para movimento reduzido. São personagens fictícias sem vinculação geográfica.
3. Integre ícones de prancheta, amostra identificada, tablet e relatório em contextos de conversa/revisão. Todos os rótulos e dados devem permanecer em HTML acessível.
4. Registre o tileset neutro e seus tiles individuais; não use texturas como indicador de solo fértil, classe de aptidão, chuva ou condições de cultivo.
5. Use a transição final não repetitiva de 8 quadros (512×288 cada, 100ms por quadro), exclusivamente quando o usuário abrir a etapa de comparação/revisão. Mostre a imagem estática em `prefers-reduced-motion: reduce`, e mantenha os três cenários igualmente representados.
6. Preserve a semântica científica: nenhum asset indica aprovação de cultura, recomendação regional, produtividade, economia de água, saúde do solo ou validação técnica automática.
7. Teste imagens em mobile de 390px, desktop e zoom 200%. Use `image-rendering: pixelated` e garanta que o layout não mude enquanto anima.
8. Não remova componentes nem dados P0; os P1 são opcionais e não bloqueiam o fluxo principal.

Execute primeiro a integração visual, depois os testes em browser. Documente qualquer limitação. Não invente valores agronômicos.
