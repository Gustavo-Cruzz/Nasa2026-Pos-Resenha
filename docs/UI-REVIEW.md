# UI review — Field Shift

> Historical review. The current product scope is Brazil nationwide; this report retains the scope applicable when it was written.

Review date: 2026-11-13. Real Chromium captures inspected at 390×844 and 1440×900 for Farm, Results and Methodology.

Overall score after the history simplification: **23/24**.

| Pillar | Score | Evidence |
|---|---:|---|
| Copywriting | 4/4 | Methodology now states origin, use and limit for every data layer. Internal evidence codes have readable labels. |
| Visuals | 3/4 | Farm palette, sprites and scenario artwork create a coherent identity; result sprites aid recognition without replacing data. |
| Color | 4/4 | Farm greens, lime actions, cyan evidence and amber gaps have stable semantic roles and accessible contrast. |
| Typography | 4/4 | Mobile headings, body text and controls remain readable at 390 px; long technical content wraps safely. |
| Spacing | 4/4 | Desktop uses the available width; mobile cards preserve touch targets and separation. |
| Experience design | 4/4 | Results use progressive disclosure and export; Farm requires one historical event and reveals up to two optional events on demand. |

## Implemented in this review

- Results lead with NASA Insight and the A/B/C comparison; the annual climate chart and regional technical details are collapsed.
- Repeated scenario source blocks and large repeated artwork were removed from result cards; the Evidence Center is the single provenance route.
- Evidence Center translates scope, status and validation terms instead of exposing raw system vocabulary.
- A Markdown technical summary can be downloaded from Results.
- Local-only journey counters record route visits, successful comparisons and last completion time without a backend or personal identifiers.
- Explore and Results gained primary bilingual copy; locale persists. Methodology was rewritten around four data foundations and three engine steps.

## Resolved decision

Farm now requires one historical event. Events 2–3 are optional, added explicitly, removable, and still validated for chronological overlap. Existing three-event drafts remain valid and load without migration loss.

Full-flow value and hackathon strategy remain in [UX_VALUE_HACKATHON_REVIEW.md](./UX_VALUE_HACKATHON_REVIEW.md).
