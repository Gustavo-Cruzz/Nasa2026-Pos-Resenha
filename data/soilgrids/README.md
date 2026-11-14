# SoilGrids regional artifacts

Each JSON artifact is a small, versioned preprocessed extraction from an official SoilGrids 2.0 WCS pixel. It is an **estimated spatial context**, never a farmer laboratory measurement.

Every committed artifact must include a sidecar `.meta.json` with its SHA-256, source product, license, exact requested coordinates, retrieval time, properties, depth interval, native resolution, uncertainty representation and reproduction command. Each attribute preserves the official WCS URLs for Q0.05, Q0.5 and Q0.95, converted units, the 0–5 cm interval, 250 m support, and its documented 90% prediction interval.

The first artifact is the exact Field Shift demonstration coordinate in Rio Verde, GO. It must not serve nearby points or any other municipality. The adapter deliberately reports `unknown` outside an exact artifact match.

## National processing

Brazil-wide coverage is a data-production job, not a browser request: at native 250 m, Brazil contains roughly 136 million cells before multiplying by properties and quantiles. Generate reviewed regional tiles or exact-coordinate artifacts offline, verify hashes, then register and commit them in reviewable batches. Do not substitute coarse resampling, municipality averages or a nearest pixel for a missing exact artifact.

Run the reproducible WCS collector for a new approved point:

```bash
SOIL_LATITUDE=-17.798 SOIL_LONGITUDE=-50.919 \
SOIL_ARTIFACT_SLUG=rio-verde \
SOIL_ARTIFACT_ID=soilgrids-rio-verde-YYYY-MM-DD-v1 \
npm run fetch:soilgrids-rio-verde
```

The collector does not call the paused SoilGrids REST API. It fetches 21 WCS samples (seven properties × Q0.05/Q0.5/Q0.95) sequentially and fails rather than emitting partial data. Review the generated values, source URLs and sidecar hash before committing.

## Batches by state

`batches/<uf>.json` is an explicit, reviewable inventory of exact-point artifacts organized by Brazilian state. It reports `partial` unless every intended native-grid tile has been produced and independently reviewed. Run a manifest check with:

```bash
npm run fetch:soilgrids-state-batch -- --batch data/soilgrids/batches/go.json
```

Add `--execute` only when refreshing approved points; it overwrites the referenced artifacts and their hashes, so the resulting diff must be reviewed. State manifests are operational batches, never evidence that an entire UF shares a soil value.
