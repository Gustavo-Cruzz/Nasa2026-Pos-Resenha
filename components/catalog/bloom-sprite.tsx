'use client';

import { CropSprite } from '@/components/crops/crop-sprite';

const particles = [
  { dx: '-26px', dy: '-6px', c: 'bg-amber-700' }, { dx: '24px', dy: '-10px', c: 'bg-amber-800' }, { dx: '-14px', dy: '-22px', c: 'bg-amber-600' },
  { dx: '16px', dy: '-26px', c: 'bg-lime-300' }, { dx: '-32px', dy: '-30px', c: 'bg-yellow-200' }, { dx: '30px', dy: '-34px', c: 'bg-pink-300' }, { dx: '0px', dy: '-40px', c: 'bg-yellow-100' },
];

/** Sprite that grows from a seedling with a dirt/sparkle puff. Remount (change `bloomKey`) to replay; CSS disables it for reduced motion. */
export function BloomSprite({ cropId, name, size, bloomKey, active }: { cropId: string; name: string; size: number; bloomKey: number; active: boolean }) {
  return <div className="relative inline-block" style={{ width: size, height: size }}>
    <div className={`cat-plant ${active ? 'cat-bloom' : ''}`} key={bloomKey}><CropSprite cropId={cropId} name={name} size={size} /></div>
    {active ? <div aria-hidden className="pointer-events-none absolute bottom-1 left-1/2" key={`p${bloomKey}`}>
      {particles.map((p, i) => <span className={`cat-particle absolute h-1.5 w-1.5 ${p.c}`} key={i} style={{ ['--dx' as string]: p.dx, ['--dy' as string]: p.dy, animationDelay: `${i * 30}ms` }} />)}
    </div> : null}
  </div>;
}
