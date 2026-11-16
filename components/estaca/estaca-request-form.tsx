'use client';

import { useState, type FormEvent } from 'react';
import { useLocale } from '@/components/locale-provider';

const REQUEST_ENDPOINT = process.env.NEXT_PUBLIC_ESTACA_REQUEST_ENDPOINT ?? '';

export function EstacaRequestForm() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);
  const idle = REQUEST_ENDPOINT ? '' : (en ? 'Demo. The form simulates sending without storing data.' : 'Demonstração. O formulário simula o envio sem armazenar os dados.');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!REQUEST_ENDPOINT) { setState(en ? 'Simulated request. No data was sent.' : 'Solicitação simulada. Nenhum dado foi enviado.'); form.reset(); return; }
    setBusy(true);
    setState(en ? 'Sending…' : 'Enviando…');
    try {
      const payload = Object.fromEntries(new FormData(form));
      const result = await fetch(REQUEST_ENDPOINT, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!result.ok) throw new Error('fail');
      form.reset();
      setState(en ? 'Request sent.' : 'Solicitação enviada.');
    } catch { setState(en ? 'Could not send. Please try again.' : 'Não foi possível enviar. Tente novamente.'); } finally { setBusy(false); }
  }

  const input = 'mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-cream';
  return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-5">
    <h3 className="text-lg font-bold text-cream">{en ? 'Request a device' : 'Solicitar dispositivo'}</h3>
    <label className="grid text-sm text-slate-300">{en ? 'Name' : 'Nome'}<input name="name" autoComplete="name" required maxLength={120} className={input} /></label>
    <label className="grid text-sm text-slate-300">{en ? 'Email' : 'E-mail'}<input type="email" name="email" autoComplete="email" required maxLength={160} className={input} /></label>
    <label className="grid text-sm text-slate-300">{en ? 'Property or municipality' : 'Propriedade ou município'}<input name="farm" required maxLength={160} className={input} /></label>
    <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-3 rounded-lg bg-lime-300 px-4 py-3 font-bold text-slate-950 hover:bg-lime-200 disabled:opacity-60">{en ? 'Register request' : 'Registrar solicitação'} <span aria-hidden="true">→</span></button>
    <p role="status" className="min-h-[1.3em] text-xs text-slate-400">{state || idle}</p>
  </form>;
}
