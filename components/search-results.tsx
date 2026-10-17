'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, UserRound, Users } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Member = { id: string; full_name: string | null; avatar_url: string | null; english_level: string | null; member_type: 'student' | 'teacher' };
type Post = { id: string; author_id: string; title: string | null; body: string; created_at: string };

const initials = (name?: string | null) => (name || 'Membro').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M';

export default function SearchResults({ initialQuery }: { initialQuery: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [query, setQuery] = useState(initialQuery);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const runSearch = useCallback(async (rawQuery: string) => {
    const term = rawQuery.trim().replace(/[%_]/g, ' ').replace(/\s+/g, ' ').slice(0, 100);
    if (term.length < 2) {
      setError('Escreve pelo menos 2 caracteres para pesquisar.');
      setMembers([]);
      setPosts([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    const pattern = `%${term}%`;
    const [{ data: memberRows, error: memberError }, { data: bodyRows, error: bodyError }, { data: titleRows, error: titleError }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url, english_level, member_type').ilike('full_name', pattern).order('full_name').limit(20),
      supabase.from('posts').select('id, author_id, title, body, created_at').eq('status', 'published').ilike('body', pattern).order('created_at', { ascending: false }).limit(20),
      supabase.from('posts').select('id, author_id, title, body, created_at').eq('status', 'published').ilike('title', pattern).order('created_at', { ascending: false }).limit(20),
    ]);
    if (memberError || bodyError || titleError) {
      setError(`Não foi possível concluir a pesquisa: ${(memberError || bodyError || titleError)?.message}`);
    } else {
      setMembers((memberRows || []) as Member[]);
      const uniquePosts = new Map<string, Post>();
      [...(bodyRows || []), ...(titleRows || [])].forEach((post) => uniquePosts.set(post.id, post as Post));
      setPosts([...uniquePosts.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    setLoading(false);
  }, [supabase]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    void runSearch(query);
  }

  useEffect(() => {
    setQuery(initialQuery);
    if (initialQuery.trim()) void runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  return <div className="community-search-page">
    <form className="community-search-form" onSubmit={submitSearch}>
      <Search size={20} />
      <input aria-label="Pesquisar membros e publicações" autoComplete="off" maxLength={100} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar pessoas e publicações" />
      <button type="submit" className="button" disabled={loading || query.trim().length < 2}>{loading ? 'A pesquisar…' : 'Pesquisar'}</button>
    </form>
    {error && <div className="notice friendship-feedback" role="alert">{error}</div>}
    {loading && <div className="panel search-empty" role="status">A pesquisar na comunidade…</div>}
    {!loading && !searched && <div className="panel search-empty">Pesquisa por nome de membro ou por palavras numa publicação.</div>}
    {!loading && searched && <>
      <section className="search-section">
        <h2><Users size={19} /> Membros <span>{members.length}</span></h2>
        {members.length === 0 ? <p className="search-empty">Não encontrámos membros com esse nome.</p> : <div className="search-member-results">
          {members.map((member) => <article className="panel search-member-card" key={member.id}>
            <Link className="search-member-link" href={`/membros/${member.id}`}>
              <span className="friendship-avatar">{member.avatar_url ? <img src={member.avatar_url} alt="" /> : initials(member.full_name)}</span>
              <span><strong>{member.full_name || 'Membro'}</strong><small>{member.member_type === 'teacher' ? 'Professor' : 'Aluno'}{member.english_level ? ` · ${member.english_level}` : ''}</small></span>
            </Link>
            <Link className="button button-light" href={`/membros/${member.id}`}>Ver perfil</Link>
          </article>)}
        </div>}
      </section>
      <section className="search-section">
        <h2><UserRound size={19} /> Publicações <span>{posts.length}</span></h2>
        {posts.length === 0 ? <p className="search-empty">Não encontrámos publicações com essas palavras.</p> : <div className="search-post-results">
          {posts.map((post) => <article className="panel search-post-card" key={post.id}>
            <time>{new Date(post.created_at).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}</time>
            {post.title && <h3>{post.title}</h3>}
            <p>{post.body}</p>
            <Link href={`/membros/${post.author_id}`}>Ver perfil do autor</Link>
          </article>)}
        </div>}
      </section>
    </>}
  </div>;
}
