import { ChatDemo } from '@/components/chat/chat-demo';
import { ClientOnly } from '@/components/client-only';

export default function ChatPage() {
  return <ClientOnly fallback={<p className="text-slate-300" role="status">Carregando conversa… / Loading chat…</p>}><ChatDemo /></ClientOnly>;
}
