import type { Coordinates } from '@/lib/schema';
import { resolveMunicipalMoisture, type MunicipalMoistureContext } from '@/lib/soil/municipal-moisture';
import { resolveMunicipalSoilProfile, type MunicipalSoilProfile } from '@/lib/soil/municipal-profile';

export type RegionalSoilAnalysis = {
  status: 'available' | 'partial' | 'unavailable';
  municipality: { code: string; name: string; uf: string } | null;
  staticProfile: MunicipalSoilProfile;
  moistureSnapshot: MunicipalMoistureContext;
  limitations: string[];
};

/** One server-side boundary for every preprocessed soil context used by analysis. */
export function resolveRegionalSoilAnalysis(location: Coordinates): RegionalSoilAnalysis {
  const staticProfile = resolveMunicipalSoilProfile(location);
  const moistureSnapshot = resolveMunicipalMoisture(location);
  const staticCode = staticProfile.municipality?.code ?? null;
  const moistureCode = moistureSnapshot.municipality?.code ?? null;
  if (staticCode !== moistureCode) throw new Error('Preprocessed soil artifacts resolved different municipalities.');
  const available = [staticProfile.status === 'available', moistureSnapshot.status === 'available'];
  return {
    status: available.every(Boolean) ? 'available' : available.some(Boolean) ? 'partial' : 'unavailable',
    municipality: staticProfile.municipality ?? moistureSnapshot.municipality,
    staticProfile,
    moistureSnapshot,
    limitations: [...new Set([...staticProfile.limitations, ...moistureSnapshot.limitations])],
  };
}
