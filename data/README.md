# Data artifact policy

`nasa-power-rio-verde.json` is a verified exact-coordinate NASA POWER fallback with provenance and hash in its metadata sidecar. It must never serve another coordinate.

`brazil-municipalities.json` is generated from the official IBGE minimum-quality municipal mesh and locality list. `brazil-zarc-index.json` is generated from the official MAPA 2026/2027 Tábua de Risco, filtered to the current P0 cultures and aggregated by municipality/crop. Rebuild both with:

```bash
SOURCE_ACCESSED_AT=YYYY-MM-DD npm run build:brazil-context -- /path/ibge-malha.json /path/ibge-localidades.json /path/zarc.csv
```

`ibge-2025-extra-municipality-features.json` contains the current official-mesh geometry missing from the minimum-quality API response. The current artifact adds Boa Esperança do Norte (code 5101837) from the official 2025 mesh; operational-area codes 4300001/4300002 in ZARC are recorded as unmatched and are not treated as municipalities. Generated documents retain source URLs, access date and input SHA-256. Do not hand-edit measurements, boundaries, risk codes or source rows. The original 233 MB ZARC CSV remains ignored because the auditable compact artifact is committed.
