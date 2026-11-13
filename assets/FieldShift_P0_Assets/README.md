# Field Shift — Assets P0

Pacote P0 de assets imersivos de pixel art para a aplicação Field Shift.

## Conteúdo

- `public/assets/environment/`: céu, horizonte, talhões neutros, primeiro plano, construções e composição de referência.
- `public/assets/evidence/`: seis ícones de proveniência, variantes 32x32 e 16x16.
- `public/assets/scenarios/`: quatro fundos de cenário 192x112.
- `public/assets/journey/`: ícones e spritesheet da jornada.
- `public/assets/interactions/`: spritesheets de feedback e alternativas estáticas.
- `public/assets/nasa/`: terra/orbita, satélite, pulsos de transmissão e grade abstrata (elementos decorativos, não observações).
- `preview/`: duas pranchas de visualização.
- `source/`: scripts Python editáveis de geração e validação.
- `assets-manifest.json`: especificações verificadas de todos os PNGs.

São **43 PNGs** no total (incluem versões estáticas, variantes e referência). O lote mínimo de 15 assets (6 evidências em 32px + 4 cenários + 5 camadas de ambiente) está incluído.

## Integração

Copie `public/assets/` sobre a pasta `public/assets/` do repositório Next.js existente, sem substituir sprites de `public/assets/crops/`.

O arquivo `field-scene-reference.png` é apenas de referência; o runtime deve compor as camadas separadas.

As animações devem ter fallback estático para `prefers-reduced-motion`; não exibir símbolos de observação sem dados/proveniência correspondentes.

## Verificação

```bash
python source/validate_assets.py
```

O manifesto registra nomes, dimensões, frames, modos de cor e transparência.
