import SearchResults from '@/components/search-results';
import { Shell } from '@/components/nav';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  return <Shell title="Pesquisar" subtitle="Encontra membros e publicações da comunidade."><SearchResults initialQuery={q} /></Shell>;
}
