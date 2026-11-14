import { NextRequest, NextResponse } from 'next/server';
import { coordinatesSchema } from '@/lib/schema';
import { fetchMeteorologicalForecast, ForecastDataError } from '@/lib/climate/forecast';
import { calculateFutureWaterPressure } from '@/lib/climate/water-pressure';
import { resolveClimateContext } from '@/lib/climate/nasa-power';
import { isPilotLocation } from '@/lib/region';
import models from '@/data/dry-spell-models.json';

export async function GET(request: NextRequest) {
  const parsed = coordinatesSchema.safeParse({ latitude: Number(request.nextUrl.searchParams.get('lat')), longitude: Number(request.nextUrl.searchParams.get('lon')) });
  if (!parsed.success) return NextResponse.json({ status: 'error', code: 'INVALID_COORDINATES', message: 'Invalid latitude or longitude.' }, { status: 400 });
  try {
    const [forecast, historical] = await Promise.all([fetchMeteorologicalForecast(parsed.data), resolveClimateContext(parsed.data, new Date().getUTCMonth() + 1)]);
    const month = Number(forecast.days[0]?.date.slice(5, 7));
    const monthKey = String(month) as keyof (typeof models)[number]['baselineByMonth'];
    const drySpell = isPilotLocation(parsed.data) ? models.map((artifact) => ({ kind: 'ml_prediction' as const, horizonDays: artifact.horizonDays, issuedAt: forecast.issuedAt, eventDefinition: artifact.eventDefinition, validationStatus: artifact.validationStatus, climatologyReference: artifact.baselineByMonth[monthKey] ?? null, probability: artifact.validationStatus === 'validated' ? null : null, evaluation: artifact.evaluation, samples: artifact.samples, limitations: [...artifact.limitations, 'No ML probability is released: this artifact did not outperform climatology on held-out chronological test data.'] })) : [{ kind: 'ml_prediction' as const, horizonDays: 7, issuedAt: forecast.issuedAt, eventDefinition: { consecutiveDays: 7, precipitationBelowMm: 1 }, validationStatus: 'not_available' as const, climatologyReference: null, probability: null, evaluation: null, samples: null, limitations: ['No location-compatible, validated dry-spell artifact is available for this coordinate.'] }];
    return NextResponse.json({ status: 'ok', forecast, waterPressure: { sevenDays: calculateFutureWaterPressure(forecast, 7, historical.waterBalanceByMonth), fifteenDays: calculateFutureWaterPressure(forecast, 15, historical.waterBalanceByMonth) }, drySpell, historicalStatus: historical.status, historicalSource: historical.provenance?.source ?? null, strategyExposure: { status: 'not_applicable', reason: 'Rotation crop dates, durations and documented stages are unavailable; no strategy-specific future exposure is inferred.' } });
  } catch (error) {
    const message = error instanceof ForecastDataError ? error.message : 'Meteorological forecast is unavailable.';
    return NextResponse.json({ status: 'error', code: 'FORECAST_UNAVAILABLE', message, limitations: ['Historical NASA indicators remain available in the comparison. No historical value is presented as a current forecast.'] }, { status: 503 });
  }
}
