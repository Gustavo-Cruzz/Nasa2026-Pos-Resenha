'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';
import { FormError, postJson } from '@/components/farm/auth-fields';
import { RegistrationSummary } from '@/components/farm/registration-summary';
import { saveLocalFarm } from '@/lib/farm/local-farm';
import type { FarmRecord } from '@/lib/db/farms';
import { loadDraft } from '@/lib/storage';
import { cropDisplayName } from '@/lib/presentation';
import { suggestedBoundary } from '@/lib/farm/default-boundary';
import { fieldBoundarySchema, type AnalysisInput } from '@/lib/schema';

/** Reads the chat's answers back from this browser, and adds the perimeter the user drew on the map, if any. */
function loadFarmInput(): { input: AnalysisInput; placeLabel?: string } | undefined {
  const draft = loadDraft();
  if (!draft) return undefined;
  let input = draft.data;
  let placeLabel: string | undefined;
  try {
    const point = JSON.parse(window.localStorage.getItem('field-shift:atlas-point') ?? 'null') as { label?: string } | null;
    if (point?.label) placeLabel = point.label;
    if (!input.fieldBoundary) {
      const polygon = fieldBoundarySchema.safeParse(JSON.parse(window.localStorage.getItem('field-shift:atlas-polygon') ?? 'null'));
      const origin = window.localStorage.getItem('field-shift:atlas-polygon-origin') === 'suggested' ? 'suggested' : 'drawn';
      if (polygon.success) input = { ...input, fieldBoundary: polygon.data, fieldBoundaryOrigin: origin };
      else input = { ...input, fieldBoundary: suggestedBoundary(input.location), fieldBoundaryOrigin: 'suggested' };
    }
  } catch { /* the registration still works without the label or the perimeter */ }
  return { input, placeLabel };
}

/** Registers the farm the user described in the chat: saves the farm (no login: the server opens a guest session), and opens the panel. */
export function RegisterFarm() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter();
  const [stored] = useState(() => loadFarmInput());
  const [name, setName] = useState(() => (stored?.placeLabel ? `${en ? 'Farm in' : 'Fazenda em'} ${stored.placeLabel.replace(/\s*\(.*\)$/, '')}` : en ? 'My farm' : 'Minha fazenda'));
  const [ephemeral, setEphemeral] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me').then((response) => response.json() as Promise<{ ephemeralDatabase: boolean }>).then((body) => { if (!cancelled) setEphemeral(Boolean(body.ephemeralDatabase)); }).catch(() => { /* the form still works */ });
    return () => { cancelled = true; };
  }, []);

  if (!stored) return <section className="mx-auto max-w-xl rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
    <h1 className="text-2xl font-bold">{en ? 'Tell João about your farm first' : 'Conte a sua fazenda para o João primeiro'}</h1>
    <p className="mt-2 text-slate-300">{en ? 'I need the answers from the chat (city, crops and soil) to register your farm.' : 'Preciso das respostas da conversa (cidade, culturas e solo) para cadastrar a sua fazenda.'}</p>
    <Button asChild className="mt-4"><Link href="/farm">{en ? 'Start the chat' : 'Começar a conversa'}</Link></Button>
  </section>;

  const { input, placeLabel } = stored;
  const history = input.history;
  const current = history[history.length - 1];
  const before = history.length > 1 ? history[history.length - 2] : undefined;
  const cropName = (event: (typeof history)[number]) => cropDisplayName(event.cropId, event.otherLabel, locale);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    const saved = await postJson('/api/farm', { name, ...(placeLabel ? { placeLabel } : {}), input }, 'PUT', en);
    if (!saved.ok) { setError(saved.body.message ?? (en ? 'Could not save the farm.' : 'Não foi possível salvar a fazenda.')); setBusy(false); return; }
    if (saved.body.farm) saveLocalFarm(saved.body.farm as FarmRecord);
    router.push('/farm?chegada=1');
    router.refresh();
  };

  return <section className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_1fr]">
    <div>
      <h1 className="page-title font-bold">{en ? 'Register your farm' : 'Cadastrar a sua fazenda'}</h1>
      <div className="mt-4"><RegistrationSummary input={input} mode="preview" name={name.trim() || undefined} placeLabel={placeLabel} /></div>
      <Link className="mt-3 inline-block text-sm text-slate-300 underline underline-offset-4 hover:text-lime-200" href="/farm">{en ? 'Change something in the chat' : 'Mudar algo na conversa'}</Link>
    </div>
    <form className="grid content-start gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5" onSubmit={submit}>
      <label className="block text-sm font-semibold">{en ? 'Farm name' : 'Nome da fazenda'}
        <input className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2.5 text-base" maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} />
      </label>
      {ephemeral ? <p className="flex gap-2 rounded-lg border border-amber-300/40 bg-amber-950/20 p-3 text-xs text-amber-100"><TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />{en ? 'Demo environment: the saved data can be erased at any time.' : 'Ambiente de demonstração: os dados guardados podem ser apagados a qualquer momento.'}</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      <Button disabled={busy} type="submit">{busy ? (en ? 'Saving…' : 'Salvando…') : en ? 'Register farm and enter my farm' : 'Cadastrar e entrar na minha fazenda'}</Button>
    </form>
  </section>;
}
