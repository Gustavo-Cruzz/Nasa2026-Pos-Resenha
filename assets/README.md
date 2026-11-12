# Field Shift — Pixel Art de Culturas

Pacote de 10 sprites em PNG transparente, com resolução de 64 × 64 pixels, para o MVP do Field Shift.

## Conteúdo

- soybean.png, corn.png, sorghum.png, sunflower.png, cowpea.png, cotton.png, millet.png, brachiaria.png, sunn-hemp.png, pigeon-pea.png
- sprites_contact_sheet.png: prévia do catálogo.

## Origem e qualidade

As seis primeiras espécies (soja, milho, sorgo, girassol, feijão-caupi e algodão) foram criadas por IA generativa e normalizadas com recorte e reamostragem. As outras quatro (milheto, braquiária, crotalária e guandu) foram desenhadas como sprites preliminares por código em pixels.

Estas artes são ilustrações estilizadas, não substituem fotografias ou identificação botânica. Antes de produção, revisar com especialista e harmonizar o detalhamento das últimas quatro com as seis imagens geradas.

## Integração com Next.js

Copie `public/assets/crops/` para o mesmo caminho no repositório.

```css
.crop-sprite { image-rendering: pixelated; width: 128px; height: 128px; object-fit: contain; }
```

As cartas devem associar o ID de cultura ao arquivo explicitamente (ver manifest.json).
