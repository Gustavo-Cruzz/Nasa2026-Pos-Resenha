# Data artifact policy

`nasa-power-rio-verde.json` is a verified exact-coordinate NASA POWER fallback with provenance and hash in its metadata sidecar. It must never serve another coordinate.

`brazil-municipalities.json` is generated from the official IBGE minimum-quality municipal mesh and locality list. `brazil-zarc-index.json` is generated from the official MAPA 2026/2027 Tábua de Risco, filtered to the current P0 cultures and aggregated by municipality/crop. Rebuild both with:

```bash
SOURCE_ACCESSED_AT=YYYY-MM-DD npm run build:brazil-context -- /path/ibge-malha.json /path/ibge-localidades.json /path/zarc.csv
```

`ibge-2025-extra-municipality-features.json` contains the current official-mesh geometry missing from the minimum-quality API response. The current artifact adds Boa Esperança do Norte (code 5101837) from the official 2025 mesh; operational-area codes 4300001/4300002 in ZARC are recorded as unmatched and are not treated as municipalities. Generated documents retain source URLs, access date and input SHA-256. Do not hand-edit measurements, boundaries, risk codes or source rows. The original 233 MB ZARC CSV remains ignored because the auditable compact artifact is committed.

`npm run update:brazil-context` discovers the newest annual-safra CSV in the official MAPA CKAN package, downloads current IBGE API inputs, rebuilds both artifacts and deletes the temporary source files. The weekly/manual GitHub workflow runs this command and opens a reviewable pull request only when official artifacts change; it never deploys or merges data automatically.

`nasa-power-rio-verde.json` was recaptured on 2026-11-14 to include surface pressure (`PS`); its metadata sidecar carries the new hash. `data/ndvi/<site>.json` (+ `.meta.json`) are pre-processed MODIS NDVI series for exact demonstration coordinates, written only by `npm run fetch:modis-ndvi -- <site>` after a complete, validated download; they are read only when the SHA-256 and the exact coordinates match. Do not hand-edit them.
