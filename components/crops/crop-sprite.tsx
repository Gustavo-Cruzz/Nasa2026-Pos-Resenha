'use client';

import Image from 'next/image';
import { useState } from 'react';

const fallback = '/assets/interactions/unknown-placeholder.png';

/** Canonical catalog IDs map to runtime files; legacy filenames stay explicit. */
export const cropSpriteFiles: Record<string, string> = {
  soybean: 'soybean', maize: 'corn', sorghum: 'sorghum', sunflower: 'sunflower',
  cowpea: 'cowpea', pearl_millet: 'millet', ruziziensis: 'brachiaria', sunn_hemp: 'sunn-hemp',
  cotton: 'cotton', pigeon_pea: 'pigeon-pea', common_bean: 'common-bean', upland_rice: 'upland-rice',
  cassava: 'cassava', pumpkin: 'pumpkin', sweet_potato: 'sweet_potato', peanut: 'peanut',
  watermelon: 'watermelon', lettuce: 'lettuce', tomato: 'tomato', carrot: 'carrot', kale: 'kale',
  onion: 'onion', bell_pepper: 'bell_pepper', okra: 'okra', coffee: 'coffee', banana: 'banana',
  cacao: 'cacao', acai: 'acai',
};

export function cropSpriteSource(cropId: string): string { const file = cropSpriteFiles[cropId]; return file ? `/assets/crops/${file}.png` : fallback; }

export function CropSprite({ cropId, name, size = 64 }: { cropId: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? fallback : cropSpriteSource(cropId);
  return <Image alt={name} className="shrink-0 object-contain [image-rendering:pixelated]" height={size} onError={() => setFailed(true)} src={src} width={size} />;
}
