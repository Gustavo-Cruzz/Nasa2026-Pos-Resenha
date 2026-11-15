'use client';

import { Ban } from 'lucide-react';
import type { Level } from '@/components/methodology/content';

/** What the app does not do and the evidence levels, stated exactly as the code behaves. */
export function LimitsSection({ level, en }: { level: Level; en: boolean }) {
  const nots = en ? [
    'No crop, yield or seasonal-climate forecast. The only forecast is the weather one, up to 16 days (Open-Meteo).',
    'No dry-spell probability: the model was tested and did not beat the climatology, so it stays off.',
    'No crop water demand (ETc), irrigation, fertiliser or liming advice.',
    'No soil-loss number (RUSLE): the factors are missing.',
    'No numeric score or overall crop ranking; priorities only change which alternatives B and C appear and their order.',
    'Missing data is never “ok”: it stays N/D.',
  ] : [
    'Sem previsão de safra, de produtividade nem do clima da estação. A única previsão é a do tempo, de até 16 dias (Open-Meteo).',
    'Sem probabilidade de veranico: o modelo foi testado, não superou a climatologia e ficou desligado.',
    'Sem demanda hídrica da cultura (ETc), irrigação, adubação ou calagem.',
    'Sem número de perda de solo (RUSLE): faltam fatores.',
    'Sem nota numérica nem ranking geral de culturas; as prioridades só mudam a escolha e a ordem das alternativas B e C.',
    'Dado ausente nunca vira “ok”: fica N/D.',
  ];
  const levels: Array<[string, string, string]> = en ? [
    ['Climate exploration', 'NASA climate plus documented crop rules.', 'climate_exploration'],
    ['Regional context', 'Also a matching municipal ZARC record for the crop.', 'regionally_contextualized'],
    ['Local validation', 'Reserved for traceable field validation. Not available yet.', 'locally_validated'],
  ] : [
    ['Exploração climática', 'Clima NASA mais regras documentadas da cultura.', 'climate_exploration'],
    ['Contexto regional', 'Também há registro municipal do ZARC para a cultura.', 'regionally_contextualized'],
    ['Validação local', 'Reservada para validação de campo rastreável. Ainda indisponível.', 'locally_validated'],
  ];
  return <div className="mt-12 grid gap-4 md:grid-cols-2">
    <section aria-labelledby="not-do" className="rounded-xl border border-amber-300/40 bg-amber-950/20 p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold text-amber-100" id="not-do"><Ban aria-hidden="true" size={20} />{en ? 'What we do not do' : 'O que não fazemos'}</h2>
      <ul className="mt-3 grid gap-2 text-sm text-amber-50">{nots.map((item) => <li key={item}>• {item}</li>)}</ul>
    </section>
    <section aria-labelledby="evidence-levels" className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
      <h2 className="text-xl font-bold" id="evidence-levels">{en ? 'Evidence levels' : 'Níveis de evidência'}</h2>
      <ol className="mt-3 grid gap-3 text-sm">{levels.map(([term, text, code], index) => <li className="flex gap-3" key={code}>
        <span aria-hidden="true" className="mt-0.5 flex gap-0.5">{[0, 1, 2].map((bar) => <span className={`h-4 w-1.5 rounded-sm ${bar <= index ? 'bg-lime-300' : 'bg-slate-700'}`} key={bar} />)}</span>
        <span><b className="text-lime-200">{term}</b>{level === 'technical' ? <code className="ml-2 text-xs text-slate-400">{code}</code> : null}<span className="block text-slate-300">{text}</span></span>
      </li>)}</ol>
    </section>
  </div>;
}
