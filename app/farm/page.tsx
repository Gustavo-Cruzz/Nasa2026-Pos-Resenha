import { Suspense } from 'react';
import { ChatDemo } from '@/components/chat/chat-demo';
import { ClientOnly } from '@/components/client-only';
import { LoadingStatus } from '@/components/loading-status';
import { RegisterHeading } from '@/components/farm/register-heading';
import { FarmDashboard } from '@/components/farm/farm-dashboard';
import { currentUser } from '@/lib/auth/session';
import { DB_EPHEMERAL, getDb } from '@/lib/db/connection';
import { getFarm } from '@/lib/db/farms';

export const metadata = { title: 'My farm · Plantaê' };
export const dynamic = 'force-dynamic';

/** First use: João's chat registers the farm. Afterwards: the farm dashboard. */
export default async function FarmPage() {
  const user = await currentUser();
  const farm = user ? getFarm(getDb(), user.id) : null;
  if (user && farm) return <FarmDashboard ephemeral={DB_EPHEMERAL} farm={farm} username={user.username} />;
  const loading = <LoadingStatus en="Loading chat…" pt="Carregando conversa…" />;
  return <>
    <RegisterHeading />
    <Suspense fallback={loading}><ClientOnly fallback={loading}><ChatDemo /></ClientOnly></Suspense>
  </>;
}
