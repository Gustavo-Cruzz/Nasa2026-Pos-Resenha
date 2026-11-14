# Plantaê — brandkit applied to the UI

Direction: a dark-green exploration environment with rural pixel-art personality, readable data and explicit limits. Tagline: **"Explore possibilidades. Entenda os limites."** The product name is always written **Plantaê** (the "ê" in lime). Internal identifiers (package name, `field-shift:*` storage keys, the draft file marker `app: "field-shift"`) are unchanged on purpose so saved drafts keep working.

## Colors (tokens in `tailwind.config.ts`)

| Role | Hex | Tailwind |
|---|---|---|
| Floresta (background, fields) | `#142018` | `slate-950`, `forest` |
| Painel (cards, menus) | `#1E2D20` | `slate-900`, `panel` |
| Elevated / hover | `#2A3D2B` | `slate-800` |
| Border | `#405840` | `slate-700` |
| Primary text | `#E2E7DC` | `slate-200` |
| Secondary text | `#C8D0C3` | `slate-300` |
| Supporting text | `#AAB7A3` | `slate-400` |
| Lime (actions, selection, current step) | `#B6DC63` | `lime-300` |
| Lime hover / focus | `#D8EFA0` | `lime-200` |
| Cream (titles) | `#FBF8F0` | `cream`, `slate-50` |
| Cyan (observed data, sources, evidence) | `#8DC8CF` | `cyan-300` |
| Amber (attention, gaps, limited evidence) | `#E7BF62` | `amber-300` |

Rules applied: lime marks few things per screen (primary button, selection, current step, selected planting month in the chart). Cyan carries observed data and "within the documented range" (never a green approval seal). Amber always comes with words ("Atenção", "N/D · evidência limitada"). Informational banners that used lime now use cyan.

## Typography

Nunito Sans (titles, navigation, buttons, forms, text) and IBM Plex Mono (coordinates, codes, periods, small data labels), both through `next/font/google`. Page titles use `.page-title` (32–40 px), the home title is 36 px on phones and 48–56 px on desktop, body text is 16 px, legends 13–14 px.

## Shapes

Cards 16 px radius (`rounded-xl`), buttons 8 px, fields and selectors 10 px on the Floresta background, 44 px minimum touch height, 3 px light-lime focus outline.

## Brand assets

- `lib/brand/mark.json` — the pixel-art symbol (16×16): sprout, sun and soil. **This is an original placeholder drawn for the interface; swap it for the official Plantaê symbol file when available** (`components/brand/plantae-mark.tsx`, `app/icon.svg` and the PWA icons all read this one file; run `node scripts/generate-pwa-icons.mjs` after changing it).
- `components/brand/plantae-logo.tsx` — full signature (symbol + name, "ê" in lime) and a compact symbol-only form.
- `public/assets/brand/home-cerrado.webp` — home illustration supplied by the team (farmer with a tablet under a yellow ipê, Cerrado plateaus, crop rows, satellite). It has no night variant, so the day/night switch of the earlier procedural scene was removed. Declare its origin in the submission's references and originality statement.
- Chat avatar and chat header use the symbol; the farmer character stays on the decision card.

## Tone of voice

Copy added to `lib/i18n.ts`: "Conte um pouco sobre sua fazenda.", "Veja como os cenários se relacionam com o clima histórico.", "Ainda faltam evidências para comparar este período.", "Veja a fonte e os limites deste dado." (and English equivalents). Observation, hypothesis and recommendation stay visibly separate.

## Not done

Official logo file and wordmark artwork (a typographic wordmark is used), larger illustrations for each journey step, A/B/C line styles in comparison charts (the project has no multi-series scenario chart yet).
