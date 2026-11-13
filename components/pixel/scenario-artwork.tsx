import Image from 'next/image';

const file = { A: 'scenario-continuity', B: 'scenario-soil', C: 'scenario-water', empty: 'scenario-empty' } as const;

export function ScenarioArtwork({ scenario, empty = false }: { scenario: 'A' | 'B' | 'C'; empty?: boolean }) {
  const name = empty ? file.empty : file[scenario];
  return <div aria-hidden="true" className="relative aspect-[12/7] w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800"><Image alt="" className="object-cover [image-rendering:pixelated]" fill sizes="(min-width: 1024px) 30vw, 90vw" src={`/assets/scenarios/${name}.png`} /></div>;
}
