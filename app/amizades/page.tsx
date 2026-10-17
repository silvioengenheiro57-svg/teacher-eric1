import { FriendManager } from '@/components/friendship';
import { Shell } from '@/components/nav';

export default function FriendRequestsPage() {
  return <Shell title="Amizades" subtitle="Gere os pedidos recebidos, enviados e os membros que adicionaste."><FriendManager /></Shell>;
}
