'use client';

import type { ReactNode } from 'react';

export type Credentials = { username: string; password: string };
export type AuthMode = 'register' | 'login';

const input = 'mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2.5 text-base';

/** Username and password fields for the demo login. No email, no recovery. */
export function AuthFields({ value, onChange, mode, en }: { value: Credentials; onChange: (next: Credentials) => void; mode: AuthMode; en: boolean }) {
  return <>
    <label className="block text-sm font-semibold">{en ? 'Username' : 'Usuário'}
      <input autoCapitalize="none" autoComplete="username" className={input} maxLength={24} name="username" onChange={(event) => onChange({ ...value, username: event.target.value })} required spellCheck={false} value={value.username} />
    </label>
    <label className="block text-sm font-semibold">{en ? 'Password' : 'Senha'}
      <input autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className={input} maxLength={72} minLength={6} name="password" onChange={(event) => onChange({ ...value, password: event.target.value })} required type="password" value={value.password} />
      {mode === 'register' ? <span className="mt-1 block text-xs font-normal text-slate-400">{en ? 'At least 6 characters. This is a demo login: there is no email and no password recovery.' : 'Pelo menos 6 caracteres. É um login de demonstração: não há e-mail nem recuperação de senha.'}</span> : null}
    </label>
  </>;
}

export function FormError({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-amber-300/50 bg-amber-950/30 p-3 text-sm text-amber-100" role="alert">{children}</p>;
}

export async function postJson(url: string, body: unknown, method = 'POST'): Promise<{ ok: boolean; body: { message?: string; [key: string]: unknown } }> {
  try {
    const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: response.ok, body: (await response.json().catch(() => ({}))) as { message?: string } };
  } catch { return { ok: false, body: { message: 'Sem conexão com o servidor. Tente de novo.' } }; }
}
