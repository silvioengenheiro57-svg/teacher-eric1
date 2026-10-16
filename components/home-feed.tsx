'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, ThumbsUp, Users } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Member = { id: string; full_name: string | null; avatar_url: string | null; english_level: string | null };
type HomePost = { id: string; author_id: string; body: string; created_at: string; author?: Member; likes: number; comments: number };

const initials = (name?: string | null) => (name || 'Aluno').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AL';
const timeLabel = (value: string) => new Date(value).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });

function Avatar({ member, className = '' }: { member?: Member | null; className?: string }) {
  return <span className={`home-feed-avatar ${className}`} aria-hidden="true">{member?.avatar_url ? <img src={member.avatar_url} alt="" /> : initials(member?.full_name)}</span>;
}

export default function HomeFeed() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<Member | null>(null);
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [userId, setUserId] = useState('');
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        if (!cancelled) {
          setError('Inicia sessão para veres as publicações da comunidade.');
          setLoading(false);
        }
        return;
      }

      const [{ data: ownProfile }, { data: rows, error: postError }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, english_level').eq('id', user.id).maybeSingle(),
        supabase.from('posts').select('id, author_id, body, created_at').order('created_at', { ascending: false }).limit(5),
      ]);
      if (postError) {
        if (!cancelled) { setError(`Não foi possível carregar as publicações: ${postError.message}`); setLoading(false); }
        return;
      }

      const postRows = rows || [];
      const authorIds = [...new Set(postRows.map((post) => post.author_id))];
      const postIds = postRows.map((post) => post.id);
      const [{ data: authors }, { data: reactions }, { data: comments }, { data: ownReactions }] = await Promise.all([
        authorIds.length ? supabase.from('profiles').select('id, full_name, avatar_url, english_level').in('id', authorIds) : Promise.resolve({ data: [] as Member[] }),
        postIds.length ? supabase.from('reactions').select('post_id').in('post_id', postIds).eq('reaction', 'like') : Promise.resolve({ data: [] as { post_id: string }[] }),
        postIds.length ? supabase.from('comments').select('post_id').in('post_id', postIds) : Promise.resolve({ data: [] as { post_id: string }[] }),
        postIds.length ? supabase.from('reactions').select('post_id').in('post_id', postIds).eq('user_id', user.id).eq('reaction', 'like') : Promise.resolve({ data: [] as { post_id: string }[] }),
      ]);
      if (cancelled) return;
      const authorMap = new Map((authors || []).map((author) => [author.id, author]));
      setProfile(ownProfile as Member | null);
      setUserId(user.id);
      setLikedIds((ownReactions || []).map((reaction) => reaction.post_id));
      setPosts(postRows.map((post) => ({
        ...post,
        author: authorMap.get(post.author_id),
        likes: (reactions || []).filter((reaction) => reaction.post_id === post.id).length,
        comments: (comments || []).filter((comment) => comment.post_id === post.id).length,
      })));
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase]);

  async function toggleLike(postId: string) {
    const alreadyLiked = likedIds.includes(postId);
    setLikedIds((current) => alreadyLiked ? current.filter((id) => id !== postId) : [...current, postId]);
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, likes: post.likes + (alreadyLiked ? -1 : 1) } : post));
    const result = alreadyLiked
      ? await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('reaction', 'like')
      : await supabase.from('reactions').insert({ post_id: postId, user_id: userId, reaction: 'like' });
    if (result.error) {
      setError(`Não foi possível atualizar o gosto: ${result.error.message}`);
      setLikedIds((current) => alreadyLiked ? [...current, postId] : current.filter((id) => id !== postId));
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, likes: post.likes + (alreadyLiked ? 1 : -1) } : post));
    }
  }

  return <div className="home-feed-page">
    <section className="home-feed-intro"><p>A TUA COMUNIDADE</p><h2>Olá, {profile?.full_name?.split(' ')[0] || 'aluno'}!</h2></section>
    <section className="home-feed-composer">
      <Avatar member={profile} />
      <Link href="/comunidade#community-post">O que está a pensar?</Link>
    </section>
    <nav className="home-feed-shortcuts" aria-label="Atalhos do feed">
      <Link href="/comunidade#community-post"><span className="home-shortcut-publish">✎</span>Publicar</Link>
      <Link href="/comunidade"><Users size={18} />Comunidade</Link>
      <Link href="/chatbot"><MessageCircle size={18} />Chat IA</Link>
    </nav>
    <div className="home-feed-heading"><h2>Publicações recentes</h2><Link href="/comunidade">Ver todas</Link></div>
    {error && <p className="home-feed-message" role="alert">{error}</p>}
    {loading && <div className="home-feed-message" role="status">A carregar publicações…</div>}
    {!loading && !error && posts.length === 0 && <div className="home-feed-message">Ainda não há publicações. Sê o primeiro a partilhar uma ideia.</div>}
    <div className="home-feed-posts">
      {posts.map((post) => <article className="home-feed-post" key={post.id}>
        <header><Avatar member={post.author} /><div><strong>{post.author?.full_name || 'Membro'}</strong><small>{post.author?.english_level || 'Aluno'} · {timeLabel(post.created_at)}</small></div></header>
        <p>{post.body}</p>
        <footer><button className={likedIds.includes(post.id) ? 'home-feed-like is-liked' : 'home-feed-like'} type="button" aria-pressed={likedIds.includes(post.id)} onClick={() => void toggleLike(post.id)}><ThumbsUp size={15} /> {post.likes}</button><Link href={`/comunidade#comment-${post.id}`}><MessageCircle size={15} /> {post.comments}</Link></footer>
      </article>)}
    </div>
  </div>;
}
