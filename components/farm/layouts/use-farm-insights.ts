'use client';

import { useMemo } from 'react';
import { useExtras } from '@/components/atlas/explore-extras';
import { buildJoaoData } from '@/components/atlas/joao-data';
import { useLiveWeather } from '@/components/atlas/use-live-weather';
import { useLocale } from '@/components/locale-provider';
import { soilKindLabel } from '@/components/results/soil-observation-note';
import type { FarmInsight, FarmInsights, FarmLayoutProps, InsightTone } from '@/components/farm/layouts/types';
import { cropById } from '@/lib/catalog';
import { explainPlace, type JoaoLine } from '@/lib/explain/joao';
import { familyLabel, formatYearMonth, rotationRead } from '@/lib/farm/rotation';
import { monthName, monthRangeShort, monthlyRainSeries, periodText, rainNext7, rainWeekSentence } from '@/lib/farm/insights';
import { cropDisplayName } from '@/lib/presentation';

const STRENGTH = { 'pt-BR': { weak: 'fraco', moderate: 'moderado', strong: 'forte', very_strong: 'muito forte' }, en: { weak: 'weak', moderate: 'moderate', strong: 'strong', very_strong: 'very strong' } } as const;

/**
 * Farmer-facing facts for "Minha fazenda", derived only from data the page already loads (NASA climate summary,
 * forecast, ENSO, live weather, the farm registration). Missing data stays unknown; nothing is estimated or prescribed.
 * Must be used inside `ExploreExtrasProvider`.
 */
export function useFarmInsights({ farm, point, climate }: Pick<FarmLayoutProps, 'farm' | 'point' | 'climate'>): FarmInsights {
  const { locale } = useLocale();
  const en = locale === 'en';
  const lang = en ? 'en' : 'pt-BR';
  const { forecast, enso, regional } = useExtras();
  const live = useLiveWeather(point);
  const { input } = farm;

  const lines = useMemo<Record<string, JoaoLine>>(() => {
    if (climate.kind !== 'ready') return {};
    const explanation = explainPlace(buildJoaoData({ placeName: point.label ?? null, month: new Date().getMonth() + 1, climate: climate.data, forecast, enso, regional }), lang);
    return Object.fromEntries(explanation.sections.flatMap((section) => section.lines).map((line) => [line.id, line]));
  }, [climate, point.label, forecast, enso, regional, lang]);

  return useMemo<FarmInsights>(() => {
    const pt = (ptText: string, enText: string) => (en ? enText : ptText);
    const climateLoading = climate.kind === 'loading';
    const unknownLine = pt('Não tenho esse dado para o seu lugar agora.', 'I do not have this data for your place right now.');
    const num = (value: number, digits = 0) => value.toLocaleString(en ? 'en-US' : 'pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    const toneOf = (line: JoaoLine | undefined, fallback: InsightTone): InsightTone => line?.tone ?? fallback;
    const summary = climate.kind === 'ready' ? climate.data.climateSummary : null;

    // now
    let now: FarmInsight;
    if (live.kind === 'ready') {
      const w = live.weather;
      const bits = [
        w.cloudPct !== null ? pt(`nuvens ${num(w.cloudPct)}%`, `cloud ${num(w.cloudPct)}%`) : null,
        w.precipitationMm !== null ? (w.precipitationMm > 0 ? pt(`chovendo ${num(w.precipitationMm, 1)} mm`, `raining ${num(w.precipitationMm, 1)} mm`) : pt('sem chuva agora', 'no rain now')) : null,
        w.windKmh !== null ? pt(`vento ${num(w.windKmh)} km/h`, `wind ${num(w.windKmh)} km/h`) : null,
      ].filter((bit): bit is string => bit !== null);
      now = { id: 'now', title: pt('Agora no local', 'Right now at the place'), value: `${num(w.temperatureC)} °C`, detail: bits.length ? bits.join(' · ') : null, joao: pt(`Agora faz cerca de ${num(w.temperatureC)} °C${w.precipitationMm !== null && w.precipitationMm > 0 ? ' e está chovendo' : ''}. É uma leitura de modelo do tempo para o lugar, não do seu talhão.`, `It is about ${num(w.temperatureC)} °C now${w.precipitationMm !== null && w.precipitationMm > 0 ? ' and it is raining' : ''}. This is a weather-model reading for the place, not for your field.`), tone: 'info', loading: false, series: null };
    } else now = { id: 'now', title: pt('Agora no local', 'Right now at the place'), value: null, detail: null, joao: live.kind === 'loading' ? pt('Buscando o tempo agora…', 'Checking the weather now…') : pt('Não consegui buscar o tempo agora.', 'I could not fetch the weather right now.'), tone: 'unknown', loading: live.kind === 'loading', series: null };

    // rain7
    const rainTitle = pt('Chuva nos próximos 7 dias', 'Rain in the next 7 days');
    let rain7: FarmInsight;
    if (forecast.kind === 'ready') {
      const week = rainNext7(forecast.data.days);
      rain7 = week.totalMm === null
        ? { id: 'rain7', title: rainTitle, value: null, detail: null, joao: pt('Não consegui ler a previsão de chuva agora.', 'I could not read the rain forecast right now.'), tone: 'unknown', loading: false, series: week.series }
        : { id: 'rain7', title: rainTitle, value: `${num(week.totalMm)} mm`, detail: week.knownDays < 7 ? pt(`${week.knownDays} de 7 dias com dado · previsão Open-Meteo`, `${week.knownDays} of 7 days with data · Open-Meteo forecast`) : pt('Previsão Open-Meteo, pode mudar', 'Open-Meteo forecast, may change'), joao: lines.forecast?.text ?? rainWeekSentence(week.totalMm, lang), tone: 'info', loading: false, series: week.series };
    } else rain7 = { id: 'rain7', title: rainTitle, value: null, detail: null, joao: forecast.kind === 'error' ? pt('Não consegui buscar a previsão de chuva agora.', 'I could not fetch the rain forecast right now.') : pt('Buscando a previsão de chuva…', 'Fetching the rain forecast…'), tone: 'unknown', loading: forecast.kind === 'loading', series: null };

    // season
    const seasonTitle = pt('Época de chuva', 'Rainy season');
    const rainySeason = summary?.seasonality?.rainySeason;
    const rainSeries = summary ? monthlyRainSeries(summary.historicalPrecipitationByMonth) : null;
    let season: FarmInsight;
    if (!summary || rainySeason === undefined) season = { id: 'season', title: seasonTitle, value: null, detail: null, joao: climateLoading ? pt('Lendo o histórico de chuva da NASA…', 'Reading the NASA rain history…') : unknownLine, tone: 'unknown', loading: climateLoading, series: rainSeries };
    else if (rainySeason === null) season = { id: 'season', title: seasonTitle, value: pt('Sem época chuvosa', 'No rainy season'), detail: pt('NASA POWER 2011–2025', 'NASA POWER 2011–2025'), joao: lines['rainy-season']?.text ?? pt('Por aqui, a água que evapora costuma ser maior do que a que chove.', 'Here, the water that evaporates is usually greater than the rain.'), tone: 'attention', loading: false, series: rainSeries };
    else season = { id: 'season', title: seasonTitle, value: rainySeason.lengthMonths === 12 ? pt('o ano todo', 'all year') : monthRangeShort(rainySeason.startMonth, rainySeason.endMonth, lang), detail: pt(`${rainySeason.lengthMonths} meses · NASA POWER 2011–2025`, `${rainySeason.lengthMonths} months · NASA POWER 2011–2025`), joao: lines['rainy-season']?.text ?? pt(`A época de mais chuva costuma ir de ${monthName(rainySeason.startMonth, 'pt-BR')} a ${monthName(rainySeason.endMonth, 'pt-BR')}.`, `The rainiest time usually runs from ${monthName(rainySeason.startMonth, 'en')} to ${monthName(rainySeason.endMonth, 'en')}.`), tone: 'info', loading: false, series: rainSeries };

    // dryspell
    const spellTitle = pt('Veranico', 'Dry spells');
    const spells = summary?.seasonality?.drySpells;
    const dryspell: FarmInsight = spells && spells.seasonsAnalyzed > 0
      ? { id: 'dryspell', title: spellTitle, value: pt(`${spells.seasonsWithSpell} de ${spells.seasonsAnalyzed} anos`, `${spells.seasonsWithSpell} of ${spells.seasonsAnalyzed} years`), detail: spells.medianLongestRunDays !== null ? pt(`maior pausa típica: ${num(spells.medianLongestRunDays, spells.medianLongestRunDays % 1 === 0 ? 0 : 1)} dias`, `typical longest pause: ${num(spells.medianLongestRunDays, spells.medianLongestRunDays % 1 === 0 ? 0 : 1)} days`) : null, joao: lines['dry-spells']?.text ?? unknownLine, tone: toneOf(lines['dry-spells'], 'info'), loading: false, series: null }
      : { id: 'dryspell', title: spellTitle, value: null, detail: null, joao: climateLoading ? pt('Lendo o histórico de chuva da NASA…', 'Reading the NASA rain history…') : unknownLine, tone: 'unknown', loading: climateLoading, series: null };

    // enso
    const ensoTitle = pt('El Niño / La Niña', 'El Niño / La Niña');
    let ensoInsight: FarmInsight;
    if (enso.kind === 'ready') {
      const { phase, strength, latest } = enso.data;
      const label = phase === 'neutral' ? pt('Neutro', 'Neutral') : `${phase === 'el_nino' ? 'El Niño' : 'La Niña'}${strength ? ` ${STRENGTH[lang][strength]}` : ''}`;
      ensoInsight = { id: 'enso', title: ensoTitle, value: label, detail: `RONI ${num(latest.value, 1)} · ${latest.season} ${latest.year} · NOAA`, joao: lines.enso?.text ?? label, tone: 'info', loading: false, series: null };
    } else ensoInsight = { id: 'enso', title: ensoTitle, value: null, detail: null, joao: enso.kind === 'error' ? pt('Não consegui ver como está o El Niño agora.', 'I could not check El Niño right now.') : pt('Olhando o Pacífico…', 'Checking the Pacific…'), tone: 'unknown', loading: enso.kind === 'loading', series: null };

    // rotation + timeline
    const history = input.history;
    const families = history.map((event) => (event.cropId ? cropById.get(event.cropId as never)?.family : undefined));
    const rotation = rotationRead(families);
    const rotationInsight: FarmInsight = {
      id: 'rotation', title: pt('Rotação de culturas', 'Crop rotation'),
      value: rotation === 'alternates' ? pt('Alternando', 'Alternating') : rotation === 'repeats' ? pt('Repetindo família', 'Repeating a family') : null,
      detail: pt(`${history.length} ${history.length === 1 ? 'cultura' : 'culturas'} no histórico`, `${history.length} ${history.length === 1 ? 'crop' : 'crops'} in the history`),
      joao: rotation === 'alternates' ? pt('Você vem alternando as famílias de plantas nesta fazenda. É esse o padrão que eu procuro.', 'You have been alternating plant families on this farm. That is the pattern I look for.')
        : rotation === 'repeats' ? pt('Duas culturas seguidas são da mesma família. Esse é um ponto para conversar com um técnico.', 'Two crops in a row share the same family. That is a point to talk over with a technician.')
          : pt('Com as culturas que você cadastrou, ainda não consigo ler um padrão de rotação.', 'With the crops you registered I cannot read a rotation pattern yet.'),
      tone: rotation === 'alternates' ? 'good' : rotation === 'repeats' ? 'attention' : 'info', loading: false, series: null,
    };
    const timeline = history.map((event, index) => ({
      cropId: event.cropId ?? null,
      name: cropDisplayName(event.cropId, event.otherLabel, locale),
      period: periodText(event.startYearMonth, event.endYearMonth, (value) => formatYearMonth(value, lang)),
      family: families[index] ? familyLabel(families[index], lang) : null,
      current: index === history.length - 1,
    }));

    // soil
    const soilKinds = input.soilObservation?.kinds ?? [];
    const soil: FarmInsight = {
      id: 'soil', title: pt('Solo (o que você relatou)', 'Soil (what you reported)'),
      value: soilKinds.length ? soilKinds.map((kind) => soilKindLabel(kind, en)).join(', ') : pt('Nada estranho relatado', 'Nothing unusual reported'),
      detail: input.soilObservation?.note ?? null,
      joao: soilKinds.length ? pt('Você relatou algo estranho no solo. Eu só registro o que você me conta; quem confirma é um técnico.', 'You reported something unusual in the soil. I only record what you tell me; a technician can confirm.') : pt('Nenhum sinal estranho no solo foi relatado.', 'No unusual signs in the soil were reported.'),
      tone: soilKinds.length ? 'attention' : 'good', loading: false, series: null,
    };

    // headline
    const place = farm.placeLabel ?? point.label ?? null;
    const parts: string[] = [];
    if (rain7.value !== null) parts.push(lines.forecast ? lines.forecast.text : rain7.joao);
    if (season.value !== null) parts.push(season.joao);
    const intro = place ? pt(`Olhei o clima de ${place}.`, `I looked at the climate of ${place}.`) : pt('Olhei o clima do seu lugar.', 'I looked at the climate of your place.');
    const headline = parts.length ? `${intro} ${parts.join(' ')}` : rain7.loading || season.loading ? `${intro} ${pt('Ainda estou buscando os dados…', 'I am still fetching the data…')}` : `${intro} ${pt('Ainda não tenho dados de chuva para mostrar.', 'I do not have rain data to show yet.')}`;

    const list = [now, rain7, season, dryspell, ensoInsight, rotationInsight, soil];
    return { now, rain7, season, dryspell, enso: ensoInsight, rotation: rotationInsight, soil, list, timeline, headline };
  }, [climate, forecast, enso, live, lines, input, farm.placeLabel, point.label, en, lang, locale]);
}
