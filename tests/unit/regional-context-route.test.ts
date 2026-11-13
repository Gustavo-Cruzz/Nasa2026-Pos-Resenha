import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/regional-context/route';
import { NextRequest } from 'next/server';

describe('GET /api/regional-context', () => {
  it('returns municipality and independent ZARC coverage for a Brazilian coordinate', async () => {
    const response = await GET(new NextRequest('http://localhost/api/regional-context?lat=-17.798&lon=-50.919'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.context.municipality).toEqual({ code: '5218805', name: 'Rio Verde', uf: 'GO' });
    expect(body.context.zarc.safra).toBe('2026/2027');
    expect(body.context.zarc.crops.soybean.riskCodes).toEqual([20, 30, 40]);
  });

  it('returns an explicit outside-Brazil gap without failing', async () => {
    const response = await GET(new NextRequest('http://localhost/api/regional-context?lat=5.6037&lon=-0.187'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.context.country).toBeNull();
    expect(body.context.zarc).toBeNull();
    expect(body.context.gaps[0]).toMatch(/não foi associada/i);
  });

  it('rejects invalid coordinates at the boundary', async () => {
    const response = await GET(new NextRequest('http://localhost/api/regional-context?lat=999&lon=0'));
    expect(response.status).toBe(400);
    const missing = await GET(new NextRequest('http://localhost/api/regional-context'));
    expect(missing.status).toBe(400);
  });
});
