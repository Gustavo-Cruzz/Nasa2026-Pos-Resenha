import { Suspense } from 'react';
import { ChatDemo } from '@/components/chat/chat-demo';
import { ClientOnly } from '@/components/client-only';

export default function ChatPage() {
  const loading = <p className="text-slate-300" role="status">Carregando conversa… / Loading chat…</p>;
  return <Suspense fallback={loading}><ClientOnly fallback={loading}><ChatDemo /></ClientOnly></Suspense>;
}
