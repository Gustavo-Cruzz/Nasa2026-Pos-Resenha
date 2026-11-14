# Crop evidence audit — 2026-11-12

Scope: record-level audit of `data/crop-evidence.json`. This is a provenance audit, not a new agronomic validation and not a Rio Verde field validation.

The file contains 38 records: 29 marked `verified`, 9 marked `not_verified`. This audit additionally confirmed cultivar-specific sorghum BRS 310 maturity/flowering and disease-response statements in Embrapa Comunicado Técnico 101, BRS 323/BRS 422 sunflower physiological-maturity ranges, BRS Guariba cowpea cycle/disease statements on Embrapa's cultivar page, and ANA's national technical Kc reference for irrigated common colored bean. These records remain source/context-specific and are not projected into a universal calendar. Only a verified record with compatible typed semantics is projected into the runtime catalog. `not_verified` records stay outside scenario compatibility. Source URLs, institution, access date, page/section, excerpt, stated context and location remain attached to every audited record.

Verified P0 evidence currently available to the engine:

| Crop | Verified fields present | Still not established for a universal calendar/recommendation |
|---|---|---|
| Soybean | viable/ideal temperature, Kc stages | cycle duration, suitability pH range |
| Maize | cycle duration, ideal temperature, Kc stages | viable temperature range, suitability pH range |
| Grain sorghum | viable temperature, Kc stages | cycle duration, suitability pH range |
| Sunflower | suitability pH range, Kc stages | cycle duration, viable temperature range |
| Cowpea | viable/ideal temperature, cycle duration, Kc stages; BRS Guariba maturity/disease profile | suitability pH range; universal calendar/disease claim |
| Common bean | ANA national technical Kc stages for irrigated common colored bean | cycle duration, thermal/pH range, local ET0, Rio Verde calendar |
| *Urochloa ruziziensis* | cycle duration | viable temperature range, suitability pH range |

The engine uses documented viable-temperature ranges for thermal context, purpose/family for B, and verified Kc profiles only as a source-specific qualitative response reference paired with NASA exposure. It does not multiply Kc by ET0, calculate ETc/irrigation, compare water consumption across studies, or change crop selection. Non-local evidence does not create a Rio Verde planting calendar or local validation.

Rio Verde ZARC remains a separate contextual source in `data/rio-verde-zarc.json`; its raw codes remain un-interpreted and are never percentages in this product.

## Remaining-record review

Nine remaining records were reviewed on 2026-11-12 and remain `not_verified`.

| Records | Review result | Runtime action |
|---|---|---|
| Soybean experimental pH and photoperiod; maize experimental pH/classification | The named Embrapa primary URLs returned HTTP 403 to independent retrieval, so their page/section claims could not be checked. | No pH range or compatibility value is promoted. |
| Cowpea pH context | No primary URL was supplied. | Stays absent. |
| *Urochloa ruziziensis* soil limitation, management context, and risks | The cited Embrapa ILPF page was retrievable, but a full-text review found no `ruziziensis`, `cigarrinha`, or claimed prolonged-drought statements. | Stays absent; no drought/risk claim appears in scenarios. |
| Sunflower cultivar disease response | It was not needed for current qualitative indicators and was not independently confirmed in this review. | Stays absent. |

This closes the review without converting inaccessible, source-free, or non-matching material into data. It does not authorize new compatibility rules.
