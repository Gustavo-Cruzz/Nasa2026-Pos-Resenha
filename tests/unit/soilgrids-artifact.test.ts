import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const artifactPath = resolve(process.cwd(), 'data/soilgrids/rio-verde-0-5cm.json');
const metadataPath = resolve(process.cwd(), 'data/soilgrids/rio-verde-0-5cm.meta.json');

describe('versioned SoilGrids artifact', () => {
  it('has a sidecar hash and complete provenance for every estimate', () => {
    const bytes = readFileSync(artifactPath); const artifact = JSON.parse(bytes.toString()); const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(metadata.sha256);
    expect(artifact).toMatchObject({ schemaVersion: 1, status: 'available', classification: 'estimated', license: 'CC BY 4.0', requestedLocation: { latitude: -17.798, longitude: -50.919 }, pixel: { resolutionM: 250 } });
    expect(artifact.attributes).toHaveLength(7);
    for (const attribute of artifact.attributes) {
      expect(attribute.depthCm).toEqual({ min: 0, max: 5 });
      expect(attribute.resolutionM).toBe(250);
      expect(attribute.uncertainty).toMatchObject({ type: '90% prediction interval', unit: attribute.unit });
      expect(attribute.uncertainty.lower).toBeLessThanOrEqual(attribute.value);
      expect(attribute.value).toBeLessThanOrEqual(attribute.uncertainty.upper);
      expect(attribute.sourceUrls).toHaveLength(3);
    }
  });
});
