import { FarmOrChat } from '@/components/farm/farm-or-chat';
import { FarmDashboard } from '@/components/farm/farm-dashboard';
import { currentUser } from '@/lib/auth/session';
import { DB_EPHEMERAL, getDb } from '@/lib/db/connection';
import { getFarm } from '@/lib/db/farms';

export const metadata = { title: 'My farm · Plantaê' };
export const dynamic = 'force-dynamic';

/** First use: João's chat registers the farm (no login needed). Afterwards: the farm dashboard. */
export default async function FarmPage() {
  const user = await currentUser();
  const farm = user ? getFarm(getDb(), user.id) : null;
  if (user && farm) return <FarmDashboard ephemeral={DB_EPHEMERAL} farm={farm} username={user.username} />;
  return <FarmOrChat ephemeral={DB_EPHEMERAL} />;
}
