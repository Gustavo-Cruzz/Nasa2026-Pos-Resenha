# Crop evidence audit — 2026-11-12

Scope: record-level audit of `data/crop-evidence.json`. This is a provenance audit, not a new agronomic validation and not a Rio Verde field validation.

The file contains 37 records: 21 marked `verified`, 16 marked `not_verified`. Only a verified record with a typed range is projected into the runtime catalog. `not_verified` records stay outside scenario compatibility. Source URLs, institution, access date, page/section, excerpt, stated context and location remain attached to every audited record.

Verified P0 evidence currently available to the engine:

| Crop | Verified fields present | Still not established for a universal calendar/recommendation |
|---|---|---|
| Soybean | viable/ideal temperature, Kc stages | cycle duration, suitability pH range |
| Maize | cycle duration, ideal temperature, Kc stages | viable temperature range, suitability pH range |
| Grain sorghum | viable temperature, Kc stages | cycle duration, suitability pH range |
| Sunflower | suitability pH range, Kc stages | cycle duration, viable temperature range |
| Cowpea | viable/ideal temperature, cycle duration, Kc stages | suitability pH range |
| *Urochloa ruziziensis* | cycle duration | viable temperature range, suitability pH range |

The engine may use documented viable-temperature ranges only for its qualitative C scenario and documented purpose/family only for B. It does not activate Kc, ET0/ETc, irrigation, yield, nutrient, residue or calendar calculations. Non-local evidence does not create a Rio Verde planting calendar or local validation.

Rio Verde ZARC remains a separate contextual source in `data/rio-verde-zarc.json`; its raw codes remain un-interpreted and are never percentages in this product.
