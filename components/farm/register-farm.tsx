'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';
import { AuthFields, FormError, postJson, type AuthMode, type Credentials } from '@/components/farm/auth-fields';
import { RegistrationSummary } from '@/components/farm/registration-summary';
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

type Session = { signedIn: boolean; username?: string; ephemeral: boolean };

/** Registers the farm the user described in the chat: creates (or uses) the account, saves the farm, and opens the panel. */
export function RegisterFarm() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter();
  const [stored] = useState(() => loadFarmInput());
  const [name, setName] = useState(() => (stored?.placeLabel ? `${en ? 'Farm in' : 'Fazenda em'} ${stored.placeLabel.replace(/\s*\(.*\)$/, '')}` : en ? 'My farm' : 'Minha fazenda'));
  const [mode, setMode] = useState<AuthMode>('register');
  const [credentials, setCredentials] = useState<Credentials>({ username: '', password: '' });
  const [session, setSession] = useState<Session>({ signedIn: false, ephemeral: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me').then((response) => response.json() as Promise<{ user: { username: string } | null; ephemeralDatabase: boolean }>).then((body) => { if (!cancelled) setSession({ signedIn: Boolean(body.user), username: body.user?.username, ephemeral: body.ephemeralDatabase }); }).catch(() => { /* the form still works */ });
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
    if (!session.signedIn) {
      const auth = await postJson(`/api/auth/${mode}`, credentials, 'POST', en);
      if (!auth.ok) { setError(auth.body.message ?? (en ? 'Could not sign in.' : 'Não foi possível entrar.')); setBusy(false); return; }
    }
    const saved = await postJson('/api/farm', { name, ...(placeLabel ? { placeLabel } : {}), input }, 'PUT', en);
    if (!saved.ok) { setError(saved.body.message ?? (en ? 'Could not save the farm.' : 'Não foi possível salvar a fazenda.')); setBusy(false); return; }
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
      {session.signedIn ? <p className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-3 text-sm text-slate-200"><Check aria-hidden="true" className="text-lime-300" size={16} />{en ? 'Signed in as' : 'Você entrou como'} <b>{session.username}</b></p> : <>
        <p className="text-sm font-bold text-lime-200">{mode === 'register' ? (en ? 'Create your login' : 'Crie o seu login') : (en ? 'Sign in' : 'Entre na sua conta')}</p>
        <AuthFields en={en} mode={mode} onChange={setCredentials} value={credentials} />
        <button className="justify-self-start text-sm text-slate-300 underline underline-offset-4 hover:text-lime-200" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(null); }} type="button">{mode === 'register' ? (en ? 'I already have an account' : 'Já tenho conta') : (en ? 'Create a new account' : 'Criar uma conta nova')}</button>
      </>}
      {session.ephemeral ? <p className="flex gap-2 rounded-lg border border-amber-300/40 bg-amber-950/20 p-3 text-xs text-amber-100"><TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={16} />{en ? 'Demo environment: the saved data can be erased at any time.' : 'Ambiente de demonstração: os dados guardados podem ser apagados a qualquer momento.'}</p> : null}
      {error ? <FormError>{error}</FormError> : null}
      <Button disabled={busy} type="submit">{busy ? (en ? 'Saving…' : 'Salvando…') : en ? 'Register farm and enter my farm' : 'Cadastrar e entrar na minha fazenda'}</Button>
    </form>
  </section>;
}
