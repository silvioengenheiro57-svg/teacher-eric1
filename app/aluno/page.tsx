import HomeFeed from '@/components/home-feed';
import { Shell } from '@/components/nav';

export default function Aluno() {
  return <Shell title="Início" subtitle="Acompanha o que acontece na comunidade."><HomeFeed /></Shell>;
}