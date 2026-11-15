# Crop evidence audit — 2026-11-12 (updated 2026-11-15)

> Historical audit. Current product scope is Brazil nationwide; this document's location-specific evidence remains limited to its documented applicability.

Scope: record-level audit of `data/crop-evidence.json`. This is a provenance audit, not a new agronomic validation and not a Rio Verde field validation.

The file contains 58 records: 49 marked `verified`, 9 marked `not_verified`, plus 6 `verified` records superseded by FAO-56 Kc (kept for provenance, excluded from the projection). This audit additionally confirmed cultivar-specific sorghum BRS 310 maturity/flowering and disease-response statements in Embrapa Comunicado Técnico 101, BRS 323/BRS 422 sunflower physiological-maturity ranges, BRS Guariba cowpea cycle/disease statements on Embrapa's cultivar page, and ANA's national technical Kc reference for irrigated common colored bean. These records remain source/context-specific and are not projected into a universal calendar. Only a verified record with compatible typed semantics is projected into the runtime catalog. `not_verified` records stay outside scenario compatibility. Source URLs, institution, access date, page/section, excerpt, stated context and location remain attached to every audited record.

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

## Update 2026-11-15 (audit task 1.6)

`data/crop-evidence.json` now holds 58 records (49 `verified`, 9 `not_verified`; 6 superseded). Changes:

- **Kc and stage lengths follow FAO-56** (Allen et al. 1998, Chapter 6, https://www.fao.org/4/X0490E/x0490e0b.htm, fetched 2026-11-15): Table 12 (Kc ini/mid/end) and one named Table 11 row (Lini/Lmid/Llate) per crop. Added/replaced for soybean, maize (grain), sorghum (grain), sunflower, common bean (dry beans), cowpea (green gram and cowpeas), pearl millet (Millet) and cotton. The generic FAO values are not Brazil calibration. The development stage (Ldev) is not a catalog stage; Kc interpolates linearly between initial and mid.
- **Superseded, kept for provenance** (`supersededBy`, excluded from the catalog projection and from `verifiedCropEvidence`): SciELO soybean (peak 1.50) and maize (peak 1.50) field studies, ANA sorghum and common bean, SciELO sunflower (Catissol I, Apodi) and cowpea (semi-arid PE/BA). Sunn hemp keeps its SciELO Kc (not in FAO-56).
- **`cycleDaysRange`** from FAO-56 Table 11 totals was removed (six FAO cycle records: soybean, sorghum, sunflower, common bean, pearl millet, cotton). Records kept: Embrapa maize 110-145, sunn hemp 63-68 and the Embrapa cowpea group statement.
- Ciclos FAO-56 (Tabela 11) não projetados por decisão do produto (15/11/2026): totais misturam climas e não representam calendários brasileiros.
- **`nitrogenFixationPotential`** (qualitative, text-supported only): soybean, cowpea, common bean, sunn hemp, pigeon pea, all Embrapa documents fetched 2026-11-15. Not derived from botanical family.
- **`diseaseNotes`** (new optional `Crop` field) is projected from verified `diseaseProfile`/`diseaseResistance` records: sorghum BRS 310 and cowpea BRS Guariba. The sunflower BRS 323 record stays `not_verified` and is not projected.

Gaps with no source obtained: upland rice (FAO-56 lists only generic Rice) cycle and Kc; cowpea min/max cycle (single Mediterranean row only; Embrapa groups have no upper bound); pigeon pea, sunn hemp and cowpea cycle in FAO-56 (not listed); sunflower disease record verification; pH ranges for maize/soybean (Embrapa pages returned HTTP 403 earlier).

Judgement calls on ranges in Table 12: sunflower and sorghum Kc mid use the upper value of the listed range; cotton Kc mid uses 1.20 and Kc end 0.70 (first value); maize and cowpea Kc end use the "harvested dry" value (0.35) per footnotes 11 and 6.
