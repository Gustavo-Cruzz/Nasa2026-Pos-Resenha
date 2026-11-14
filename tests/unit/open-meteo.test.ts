import { describe, expect, it } from 'vitest';
import { buildOpenMeteoUrl, compassPoint, parseOpenMeteo } from '@/lib/weather/open-meteo';

const payload = { timezone: 'America/Bahia', current: { time: '2026-11-14T19:00', temperature_2m: 21.9, apparent_temperature: 25.2, relative_humidity_2m: 99, precipitation: 0, wind_speed_10m: 10.2, wind_direction_10m: 141, wind_gusts_10m: 23.4, surface_pressure: 971.2, cloud_cover: 85, is_day: 0 } };

describe('live weather', () => {
  it('reads the current conditions with their units', () => {
    expect(parseOpenMeteo(payload)).toMatchObject({ temperatureC: 21.9, humidityPct: 99, precipitationMm: 0, windKmh: 10.2, gustsKmh: 23.4, pressureHpa: 971.2, cloudPct: 85, isDay: false, time: '2026-11-14T19:00' });
  });
  it('keeps optional fields as null instead of inventing them, and rejects a reading without temperature', () => {
    const sparse = { timezone: 'UTC', current: { ...payload.current, apparent_temperature: null, is_day: null } };
    expect(parseOpenMeteo(sparse)).toMatchObject({ apparentC: null, isDay: null });
    expect(parseOpenMeteo({ timezone: 'UTC', current: { ...payload.current, temperature_2m: null } })).toBeUndefined();
    expect(parseOpenMeteo({})).toBeUndefined();
  });
  it('asks only for current conditions, in km/h, local timezone', () => {
    const url = buildOpenMeteoUrl(-13.04, -39.62);
    expect(url).toContain('current=');
    expect(url).not.toContain('hourly');
    expect(url).not.toContain('daily');
    expect(url).toContain('wind_speed_unit=kmh');
  });
  it('names the compass point the wind comes from', () => {
    expect(compassPoint(0, 'pt-BR')).toBe('N');
    expect(compassPoint(141, 'pt-BR')).toBe('SE');
    expect(compassPoint(270, 'pt-BR')).toBe('O');
    expect(compassPoint(270, 'en')).toBe('W');
    expect(compassPoint(359, 'en')).toBe('N');
  });
});
