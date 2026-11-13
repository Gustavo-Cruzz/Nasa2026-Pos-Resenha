import { describe, expect, it } from 'vitest';
import { resolveBrazilMunicipality, resolveBrazilRegionalContext } from '@/lib/brazil/context';

describe('Brazil municipal and ZARC context', () => {
  it('resolves coordinates to official IBGE municipalities across regions', () => {
    expect(resolveBrazilMunicipality({ latitude: -17.798, longitude: -50.919 })).toEqual({ code: '5218805', name: 'Rio Verde', uf: 'GO' });
    expect(resolveBrazilMunicipality({ latitude: -12.9714, longitude: -38.5014 })).toEqual({ code: '2927408', name: 'Salvador', uf: 'BA' });
    expect(resolveBrazilMunicipality({ latitude: -23.5505, longitude: -46.6333 })).toEqual({ code: '3550308', name: 'São Paulo', uf: 'SP' });
    expect(resolveBrazilMunicipality({ latitude: -13.45, longitude: -54.9 })).toEqual({ code: '5101837', name: 'Boa Esperança do Norte', uf: 'MT' });
  });

  it('does not assign coordinates outside the Brazilian municipal mesh', () => {
    expect(resolveBrazilMunicipality({ latitude: 5.6037, longitude: -0.187 })).toBeNull();
    expect(resolveBrazilRegionalContext({ latitude: 28.6139, longitude: 77.209 }).country).toBeNull();
  });

  it('attaches current municipal ZARC rows without interpreting raw codes', () => {
    const context = resolveBrazilRegionalContext({ latitude: -17.75, longitude: -50.95 });
    expect(context.municipality?.code).toBe('5218805');
    expect(context.zarc?.safra).toBe('2026/2027');
    expect(context.zarc?.crops.soybean.rowCount).toBeGreaterThan(0);
    expect(context.zarc?.crops.soybean.riskCodes).toEqual([20, 30, 40]);
    expect(context.zarc?.crops.ruziziensis).toBeUndefined();
    expect(context.municipalitySource?.version).toBe('2025');
    expect(context.municipalitySource?.sha256).toHaveLength(64);
    expect(context.zarc?.sha256).toHaveLength(64);
  });
});
