# Method

NASA POWER Daily Point uses UTC data from 2011-01-01 to 2025-12-31: `T2M`, `T2M_MAX`, `T2M_MIN`, `PRECTOTCORR`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN`. Sentinels, missing values and implausible values become `null`; never zero. Monthly summaries and rain windows use valid daily values only and retain per-variable coverage/missing-day provenance.

The Rio Verde fallback has SHA-256, exact coordinates, period, units and UTC metadata. It cannot serve another point. NASA failure outside Rio Verde still returns A/B/C, but climate indicators remain `unknown` with an explicit gap.

The catalog is contextualized with Brazilian sources, but their country of origin does not make them nationally applicable. Regional evidence is attached only when its recorded geographic scope matches; the current ZARC package remains limited to the exact Rio Verde pilot coordinate.

The engine uses a shared planting month (1–12) to summarize NASA climatology and historical monthly precipitation. This precipitation is an observation, never a crop water requirement. It returns A/B/C globally: A is confirmed farmer plan or presumed continuation; B deterministically selects a P0 catalogued cover purpose with a different prior family when possible; C requires a documented thermal range and a different family when possible. All durations stay unknown unless documented.

Evidence levels are `climate_exploration`, `regionally_contextualized`, and reserved `locally_validated`. Rio Verde can raise a crop with a raw ZARC record to `regionally_contextualized`; raw risk codes are not percentages. The MVP never emits `locally_validated`. Priorities only highlight precipitation, cover, or diversity indicators; they do not score or change a selected crop.

The rotation laboratory stores three A/B/C hypotheses with four neutral slots each (Year 1/2 × Season A/B). A slot has no date, duration or implied agricultural calendar. Only the first selected crop is sent to the existing qualitative engine; remaining empty slots are explicit `N/D` gaps. Results compare each available qualitative indicator side by side in a horizontally scrollable table. There is no aggregate ranking, even after priorities change.

Not calculated: ET0, ETc/Kc, irrigation need, yield, NPK/SOC change, economics, pest diagnosis, forecast, or field diagnosis. FAO-56 `ETc = Kc × ET0` is context only, not an active calculation.
