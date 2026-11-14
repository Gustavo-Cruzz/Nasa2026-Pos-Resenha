import { cropById, isAnnualRotationEligible, type Crop } from '@/lib/catalog';
import type { FarmerCropProfile } from '@/lib/schema';

const P0 = ['soybean', 'maize', 'sorghum', 'sunflower', 'cowpea', 'common_bean', 'upland_rice', 'ruziziensis'] as const;

/** Operational availability declared by the farmer; absent profile preserves exploratory catalog behavior. */
export function permittedCatalogCrops(profile?: FarmerCropProfile): Crop[] {
  const configured = profile && (profile.availableCropIds.length > 0 || profile.exploreCropIds.length > 0);
  const permitted = new Set(configured ? [...profile.availableCropIds, ...profile.exploreCropIds] : P0);
  const blocked = new Set(profile?.blockedCropIds ?? []);
  return [...permitted].filter((id) => !blocked.has(id) && isAnnualRotationEligible(id)).flatMap((id) => { const crop = cropById.get(id as Crop['id']); return crop ? [crop] : []; });
}

export function isBlockedCrop(profile: FarmerCropProfile | undefined, cropId: string | undefined): boolean { return Boolean(cropId && profile?.blockedCropIds.includes(cropId)); }
