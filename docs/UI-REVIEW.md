# UI review — Field Shift

Review date: 2026-11-13. Real Chromium captures inspected at 390×844 and 1440×900 for Farm, Results and Methodology.

Overall score: **22/24**.

| Pillar | Score | Evidence |
|---|---:|---|
| Copywriting | 4/4 | Methodology now states origin, use and limit for every data layer. Internal evidence codes have readable labels. |
| Visuals | 3/4 | Farm palette, sprites and scenario artwork create a coherent identity; result sprites aid recognition without replacing data. |
| Color | 4/4 | Farm greens, lime actions, cyan evidence and amber gaps have stable semantic roles and accessible contrast. |
| Typography | 4/4 | Mobile headings, body text and controls remain readable at 390 px; long technical content wraps safely. |
| Spacing | 4/4 | Desktop uses the available width; mobile cards preserve touch targets and separation. |
| Experience design | 3/4 | Results have clear progressive disclosure and export, but three manually entered historical events remain the largest completion cost. |

## Implemented in this review

- Results lead with NASA Insight and the A/B/C comparison; the annual climate chart and regional technical details are collapsed.
- Repeated scenario source blocks and large repeated artwork were removed from result cards; the Evidence Center is the single provenance route.
- Evidence Center translates scope, status and validation terms instead of exposing raw system vocabulary.
- A Markdown technical summary can be downloaded from Results.
- Local-only journey counters record route visits, successful comparisons and last completion time without a backend or personal identifiers.
- Explore and Results gained primary bilingual copy; locale persists. Methodology was rewritten around four data foundations and three engine steps.

## Remaining decision

The 390 px Farm capture is valid and usable, but one open event plus two collapsed events still produces the longest manual step. Recommended next experiment: require one historical event and make events 2–3 optional, or provide a compact “repeat last crop / add event” interaction. This changes the analysis-input contract and should be approved as a product decision, not hidden as a visual tweak.

Full-flow value and hackathon strategy remain in [UX_VALUE_HACKATHON_REVIEW.md](./UX_VALUE_HACKATHON_REVIEW.md).
