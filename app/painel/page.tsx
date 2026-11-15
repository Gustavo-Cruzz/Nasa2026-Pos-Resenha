import { redirect } from 'next/navigation';
import { FarmDashboard } from '@/components/farm/farm-dashboard';
import { currentUser } from '@/lib/auth/session';
import { DB_EPHEMERAL, getDb } from '@/lib/db/connection';
import { getFarm } from '@/lib/db/farms';

export const metadata = { title: 'Painel da fazenda · Plantaê' };
export const dynamic = 'force-dynamic';

/** The signed-in user's farm panel. Without a session it sends them to the sign-in page. */
export default async function FarmPanelPage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  return <FarmDashboard ephemeral={DB_EPHEMERAL} farm={getFarm(getDb(), user.id)} username={user.username} />;
}
