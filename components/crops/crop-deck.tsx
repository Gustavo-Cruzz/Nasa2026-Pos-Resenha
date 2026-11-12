'use client';

import { useState } from 'react';
import type { Coordinates } from '@/lib/schema';
import { p0CropCoverage, type CropCoverage } from '@/lib/evidence-coverage';
import { CropDetailDrawer } from '@/components/crops/crop-detail-drawer';
import { CropCard } from '@/components/crops/crop-card';

export function CropDeck({ location }: { location: Coordinates | null }) {
  const [selected, setSelected] = useState<CropCoverage>();
  const coverage = p0CropCoverage(location);
  return <section className="mt-5" aria-label="Culturas para explorar"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Culturas para explorar</h3><span className="text-xs text-slate-400">6 P0 · dados ausentes = N/D</span></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{coverage.map((item) => <CropCard coverage={item} key={item.crop.id} onSelect={() => setSelected(item)} />)}</div>{selected ? <CropDetailDrawer coverage={selected} onClose={() => setSelected(undefined)} /> : null}</section>;
}
