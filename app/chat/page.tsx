import { Suspense } from 'react';
import { LoadingStatus } from '@/components/loading-status';
import { ChatDemo } from '@/components/chat/chat-demo';
import { ClientOnly } from '@/components/client-only';

export default function ChatPage() {
  const loading = <LoadingStatus en="Loading chat…" pt="Carregando conversa…" />;
  return <Suspense fallback={loading}><ClientOnly fallback={loading}><ChatDemo /></ClientOnly></Suspense>;
}
