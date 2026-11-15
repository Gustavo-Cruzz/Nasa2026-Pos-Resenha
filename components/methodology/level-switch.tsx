'use client';

import { GraduationCap, Sprout } from 'lucide-react';
import type { Level } from '@/components/methodology/content';

/** Reading level: "simple" for farmers, "technical" for judges (parameter codes, resolutions, formulas). */
export function LevelSwitch({ level, onChange, en }: { level: Level; onChange: (level: Level) => void; en: boolean }) {
  const options: Array<{ id: Level; label: string; hint: string; Icon: typeof Sprout }> = [
    { id: 'simple', label: en ? 'Simple' : 'Simples', hint: en ? 'for farmers' : 'para o agricultor', Icon: Sprout },
    { id: 'technical', label: en ? 'Technical' : 'Técnico', hint: en ? 'codes, resolutions, formulas' : 'códigos, resoluções, fórmulas', Icon: GraduationCap },
  ];
  return <fieldset className="mt-6 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-1.5">
    <legend className="sr-only">{en ? 'Reading level' : 'Nível de leitura'}</legend>
    {options.map(({ id, label, hint, Icon }) => {
      const active = level === id;
      return <label className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cyan-300 ${active ? 'bg-cyan-300 font-bold text-slate-950' : 'text-slate-200 hover:bg-slate-800'}`} key={id}>
        <input checked={active} className="sr-only" name="methodology-level" onChange={() => onChange(id)} type="radio" value={id} />
        <Icon aria-hidden="true" size={18} />
        <span>{label}</span>
        <span className={`hidden sm:inline ${active ? 'text-slate-800' : 'text-slate-400'}`}>· {hint}</span>
      </label>;
    })}
  </fieldset>;
}
