'use client';

import Image from 'next/image';
import { useLocale } from '@/components/locale-provider';

const items = [
  ['clipboard', { en: 'Review the hypotheses', pt: 'Revisar hipóteses' }], ['sample', { en: 'Confirm soil data', pt: 'Confirmar dados de solo' }],
  ['tablet', { en: 'Check data and sources', pt: 'Consultar dados e fontes' }], ['report', { en: 'Take the report to technical assistance', pt: 'Levar o relatório à assistência técnica' }],
] as const;

export function ReviewObjects() {
  const { locale } = useLocale();
  const en = locale === 'en';
  return <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4" aria-label={en ? 'Suggested review steps' : 'Etapas sugeridas para revisão'}>{items.map(([file, label]) => <li className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-2" key={file}><Image alt="" aria-hidden="true" className="[image-rendering:pixelated]" height={32} src={`/assets/objects/${file}.png`} width={32} /><span>{en ? label.en : label.pt}</span></li>)}</ul>;
}
