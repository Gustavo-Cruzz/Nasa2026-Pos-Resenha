'use client';

import { Suspense } from 'react';
import { ChatDemo } from '@/components/chat/chat-demo';
import { ClientOnly } from '@/components/client-only';
import { LoadingStatus } from '@/components/loading-status';
import { RegisterHeading } from '@/components/farm/register-heading';
import { FarmDashboard } from '@/components/farm/farm-dashboard';
import { loadLocalFarm } from '@/lib/farm/local-farm';

/** No farm on the server for this visitor: open the copy kept in this browser (registered earlier), or else João's chat. */
export function FarmOrChat({ ephemeral }: { ephemeral: boolean }) {
  const loading = <LoadingStatus en="Loading chat…" pt="Carregando conversa…" />;
  return <Suspense fallback={loading}><ClientOnly fallback={loading}><Inner ephemeral={ephemeral} /></ClientOnly></Suspense>;
}

function Inner({ ephemeral }: { ephemeral: boolean }) {
  const local = loadLocalFarm();
  if (local) return <FarmDashboard ephemeral={ephemeral} farm={local} username="guest" />;
  return <><RegisterHeading /><ChatDemo /></>;
}
