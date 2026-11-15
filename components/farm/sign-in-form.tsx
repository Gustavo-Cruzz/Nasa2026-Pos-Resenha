'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';
import { AuthFields, FormError, postJson, type AuthMode, type Credentials } from '@/components/farm/auth-fields';

/** Sign in, or create a demo account, then go to the farm panel. */
export function SignInForm() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [credentials, setCredentials] = useState<Credentials>({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    const result = await postJson(`/api/auth/${mode}`, credentials);
    if (!result.ok) { setError(result.body.message ?? (en ? 'Could not sign in.' : 'Não foi possível entrar.')); setBusy(false); return; }
    router.push('/painel');
    router.refresh();
  };

  return <section className="mx-auto max-w-md">
    <h1 className="page-title font-bold">{mode === 'login' ? (en ? 'Sign in' : 'Entrar') : (en ? 'Create account' : 'Criar conta')}</h1>
    <p className="mt-2 text-slate-300">{en ? 'Open your farm panel.' : 'Abra o painel da sua fazenda.'}</p>
    <form className="mt-6 grid gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-5" onSubmit={submit}>
      <AuthFields en={en} mode={mode} onChange={setCredentials} value={credentials} />
      {error ? <FormError>{error}</FormError> : null}
      <Button disabled={busy} type="submit">{mode === 'login' ? <LogIn aria-hidden="true" className="mr-2" size={18} /> : <UserPlus aria-hidden="true" className="mr-2" size={18} />}{busy ? (en ? 'Please wait…' : 'Aguarde…') : mode === 'login' ? (en ? 'Sign in' : 'Entrar') : (en ? 'Create account' : 'Criar conta')}</Button>
      <button className="text-sm text-slate-300 underline underline-offset-4 hover:text-lime-200" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} type="button">{mode === 'login' ? (en ? 'No account yet? Create one' : 'Ainda não tem conta? Criar uma') : (en ? 'I already have an account' : 'Já tenho conta')}</button>
    </form>
    <p className="mt-4 text-sm text-slate-400">{en ? 'To register a farm, chat with João first:' : 'Para cadastrar uma fazenda, converse antes com o João:'} <a className="underline" href="/chat">{en ? 'start the chat' : 'abrir a conversa'}</a>.</p>
  </section>;
}
