# Integração Codex — Field Shift P0

1. Extraia este ZIP na raiz do repositório, preservando `public/assets/...`.
2. Não substitua os sprites já existentes em `public/assets/crops/`.
3. Leia `assets-manifest.json` para dimensões e contagem de frames.
4. Monte o cenário por camadas de mesmo canvas (512x288) nesta ordem: `field-sky-day.png`, `field-horizon.png`, `field-plots.png`, `farm-buildings.png` (posição controlada via CSS), `field-foreground.png`. A composição `field-scene-reference.png` é apenas referência, não deve ser exibida como camada extra.
5. Use `image-rendering: pixelated` para ampliação em múltiplos inteiros e controle de aspect ratio para evitar deformação.
6. Posicione rótulos, indicadores e números em HTML acessível, não sobreponha textos rasterizados.
7. `evidence-unknown` indica ausência de dados sem representar erro ou inadequação agronômica.
8. Fundos A/B/C são semânticos e neutros: não inferir melhor solo, economia de água ou produtividade a partir deles.
9. Animações horizontais são de 4, 6 ou 8 frames conforme manifesto, a 8–10 fps com duração máxima de 800 ms. Use arquivo `-static.png` com `prefers-reduced-motion`.
10. Verifique usando `python source/validate_assets.py` e teste em dispositivos de 390px e zoom de 200%.
