import { Suspense } from 'react';
import { ChatDemo } from '@/components/chat/chat-demo';
import { ClientOnly } from '@/components/client-only';
import { FarmDashboard } from '@/components/farm/farm-dashboard';
import { currentUser } from '@/lib/auth/session';
import { DB_EPHEMERAL, getDb } from '@/lib/db/connection';
import { getFarm } from '@/lib/db/farms';

export const metadata = { title: 'Minha fazenda · Plantaê' };
export const dynamic = 'force-dynamic';

/** First use: João's chat registers the farm. Afterwards: the farm dashboard. */
export default async function FarmPage() {
  const user = await currentUser();
  const farm = user ? getFarm(getDb(), user.id) : null;
  if (user && farm) return <FarmDashboard ephemeral={DB_EPHEMERAL} farm={farm} username={user.username} />;
  const loading = <p className="text-slate-300" role="status">Carregando conversa… / Loading chat…</p>;
  return <>
    <h1 className="page-title mb-4 font-bold">Cadastre a sua fazenda com o João <span className="text-base font-normal text-slate-400">/ Register your farm with João</span></h1>
    <Suspense fallback={loading}><ClientOnly fallback={loading}><ChatDemo /></ClientOnly></Suspense>
  </>;
}
