'use client';

import Image from 'next/image';
import { PixelAnimation } from '@/components/pixel/pixel-animation';

export function DemoCharacter({ animated = false, pose = 'neutral', role }: { animated?: boolean; pose?: 'neutral' | 'talk'; role: 'producer' | 'technician' }) {
  const label = role === 'producer' ? 'Personagem fictícia: produtora' : 'Personagem fictícia: técnica';
  if (animated && pose === 'talk') return <PixelAnimation ariaLabel={label} fallback={`/assets/characters/${role}-talk.png`} frameMs={160} frames={4} loop sheet={`/assets/characters/${role}-talk-sheet.png`} />;
  return <Image alt={label} className="[image-rendering:pixelated]" height={64} src={`/assets/characters/${role}-${pose}.png`} width={64} />;
}
