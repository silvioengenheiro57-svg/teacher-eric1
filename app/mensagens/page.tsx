import MessagesInbox from '@/components/messages-inbox';
import { Shell } from '@/components/nav';

export default function Mensagens() {
  return <Shell title="Mensagens" subtitle="Troca mensagens privadas com membros da comunidade."><MessagesInbox /></Shell>;
}
