# Field Shift — Lote P1 de assets

Pacote complementar ao Lote P0. **Não substitui nem modifica os sprites agrícolas atuais.** Todos os PNGs de runtime estão em `public/assets/`. Estilo pixel art rural de paleta limitada, sem texto rasterizado e sem representação de adequação de culturas ou condições observadas da lavoura.

## Conteúdo

| Grupo | Arquivos | Dimensões | Uso |
|---|---|---|---|
| Cenário noturno | `environment/field-night.png` | 512×288 RGB | Tema decorativo; substituição visual opcional da cena P0 |
| Iluminação noturna | `environment/field-night-lights.png` | 512×288 RGBA | Overlay pixelado opcional para a mesma cena |
| Céu noturno | `environment/field-sky-night.png` | 512×288 RGB | Substituto modular para a camada diurna do céu |
| Personagens fictícias | `characters/producer-*` e `characters/technician-*` | 64×64 RGBA | Poses neutra e conversa, sem representar região ou grupo social típico |
| Conversa técnica | `objects/clipboard.png`, `sample.png`, `tablet.png`, `report.png` | 32×32 RGBA | Ícones decorativos de instrumentos de revisão |
| Tiles neutros | `tiles/tile-*.png` | 32×32 RGBA | Solo, caminho, grama e água; duas variantes de cada |
| Tileset | `tiles/neutral-terrain-sheet.png` | 128×64 RGBA | 4 colunas × 2 linhas; ordem definida no manifesto |
| Transição de revisão | `transitions/transition-review-sheet.png` | 4096×288 RGBA | 8 frames consecutivos de 512×288; 100 ms cada; reproduzir uma única vez |
| Fallback estático | `transitions/transition-review-static.png` | 512×288 RGBA | Quadro final para `prefers-reduced-motion` |

Todas as cenas carregadas em runtime devem manter `image-rendering: pixelated` e usar `object-fit: contain` quando dimensionadas. Os personagens em 64 px podem ser exibidos em 32, 48 ou 64 px, mantendo suas silhuetas. Nenhum asset contém rótulos; texto e números devem ser produzidos em HTML.

## Usar no Codex

1. Copie a pasta `public/assets/` deste pacote para a pasta equivalente do seu projeto. Não apague outras pastas preexistentes.
2. Leia `assets-p1-manifest.json` para dimensões, ordem do tileset e duração dos frames.
3. Para a transição, avance o frame em **100 ms** por até **8 frames (800 ms)**, sem looping. No modo de movimento reduzido, use diretamente `transition-review-static.png`.
4. O cenário noturno é decorativo: não deve ser condicionado à meteorologia, previsão do tempo, produtividade ou dados NASA, nem deve ser descrito como captura de satélite.
5. Os tiles são superfícies neutras, não classes de aptidão ou interpretação de saúde do solo.
6. Os cenários A/B/C devem continuar com o mesmo peso visual, sem pódio, destaque artificial ou conclusão de vencedor.

Exemplo CSS para sheets:

```css
.sprite-pixel { image-rendering: pixelated; image-rendering: crisp-edges; }
/* A transição usa uma imagem horizontal de 4096×288 px: */
.transition-review {
  width: 512px;
  height: 288px;
  background-image: url('/assets/transitions/transition-review-sheet.png');
  background-repeat: no-repeat;
  image-rendering: pixelated;
}
/* positionX = -index * 512 (index 0..7) */
@media (prefers-reduced-motion: reduce) {
  .transition-review {
    background-image: url('/assets/transitions/transition-review-static.png');
    background-position: 0 0 !important;
  }
}
```

Não confundir a animação com conclusão científica: ela apenas apresenta alternativas para revisão, não aprova nenhuma das três.

## Arquivos-fonte e reprodução

- `source/generate_p1.py` — fonte editável integral dos sprites e composições (Python + Pillow).
- `source/p0_reference/` — cópias das camadas P0 necessárias para reproduzir a cena noturna e a transição, mantidas **fora do bundle público**.
- `source/validate_p1.py` — conferência de dimensões, formato, transparência e tamanho.
- `source/build_preview.py` — criação do painel de prévia.
- `preview/fieldshift-p1-overview.png` — visualizador, **não deve ir para runtime**.
- `assets-p1-manifest.json` — lista de arquivos e SHA-256.
- `ASSET_LICENSE.md` — declaração de origem e uso.

Para regenerar:

```bash
python -m pip install Pillow
python source/generate_p1.py
python source/validate_p1.py
python source/build_preview.py
```

O gerador procura as camadas P0 no próprio projeto quando elas existem; caso contrário, utiliza a referência incluída no pacote. Recomenda-se manter as fontes editáveis fora da pasta `public` no deploy.
