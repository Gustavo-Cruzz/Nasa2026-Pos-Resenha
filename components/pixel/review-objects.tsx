import Image from 'next/image';

const items = [
  ['clipboard', 'Revisar hipóteses'], ['sample', 'Confirmar dados de solo'],
  ['tablet', 'Consultar dados e fontes'], ['report', 'Levar o relatório à assistência técnica'],
] as const;

export function ReviewObjects() {
  return <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4" aria-label="Etapas sugeridas para revisão">{items.map(([file, label]) => <li className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-2" key={file}><Image alt="" aria-hidden="true" className="[image-rendering:pixelated]" height={32} src={`/assets/objects/${file}.png`} width={32} /><span>{label}</span></li>)}</ul>;
}
