'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cropSpriteFiles } from '@/lib/crop-sprite-files';

const fallback = '/assets/interactions/unknown-placeholder.png';

export { cropSpriteFiles };

export function cropSpriteSource(cropId: string): string { const file = cropSpriteFiles[cropId]; return file ? `/assets/crops/${file}.png` : fallback; }

export function CropSprite({ cropId, name, size = 64 }: { cropId: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? fallback : cropSpriteSource(cropId);
  return <Image alt={name} className="shrink-0 object-contain [image-rendering:pixelated]" height={size} onError={() => setFailed(true)} src={src} width={size} />;
}
