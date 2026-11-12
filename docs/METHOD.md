# Method

NASA POWER Daily Point uses UTC data from 2011-01-01 to 2025-12-31: `T2M`, `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN`. Sentinels, missing values and implausible values become `null`; never zero. Monthly summaries and rain windows use valid daily values only and retain per-variable coverage/missing-day provenance.

The Rio Verde fallback has SHA-256, exact coordinates, period, units and UTC metadata. It cannot serve another point. Outside the Rio Verde pilot, result is climate-only; no regional agronomic recommendation.

Inside pilot, engine uses only study/safra-specific rainfed ZARC rows in `data/rio-verde-zarc.json`. Baseline is farmer-confirmed or labelled **“Presumed continuation — confirm”**. B/C need validated regional templates and comparative rules; absent now, so they stay unavailable and `score: null`.

Not calculated: ET0, ETc/Kc, irrigation need, yield, NPK/SOC change, economics, pest diagnosis, forecast, or field diagnosis. FAO-56 `ETc = Kc × ET0` is context only, not an active calculation.
