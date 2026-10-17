'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Home, Image as ImageIcon, MessageCircle, Pencil, Search, Send, ThumbsUp, Trash2, UserRound, Users, X } from 'lucide-react';
import { Shell } from '@/components/nav';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Profile = { id: string; full_name: string | null; avatar_url: string | null; english_level: string | null };
type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string; author?: Profile };
type Post = { id: string; author_id: string; title: string | null; body: string; kind: string; created_at: string; author?: Profile; comments: Comment[]; reactions: { user_id: string }[] };
type DirectMessage = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

const dateLabel = (value: string) => new Date(value).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' });
const initials = (name?: string | null) => (name || 'Aluno').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AL';

function MemberAvatar({ member, className = '' }: { member?: Profile | null; className?: string }) {
  return <span className={`community-person-avatar ${className}`} aria-hidden="true">
    {member?.avatar_url ? <img src={member.avatar_url} alt="" /> : initials(member?.full_name)}
  </span>;
}

export default function Comunidade() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [body, setBody] = useState('');
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [editingPostId, setEditingPostId] = useState('');
  const [postEditDraft, setPostEditDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState('');
  const [commentEditDraft, setCommentEditDraft] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [activeMember, setActiveMember] = useState<Profile | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadFeed = useCallback(async (currentUserId?: string) => {
    setError('');
    const { data: authData } = await supabase.auth.getUser();
    const currentId = currentUserId || authData.user?.id || '';
    if (!currentId) {
      setUserId(''); setPosts([]); setLoading(false);
      setError('Inicia sessão para participar na comunidade.');
      return;
    }
    setUserId(currentId);
    const { data: ownProfile } = await supabase.from('profiles').select('id, full_name, avatar_url, english_level').eq('id', currentId).maybeSingle();
    setProfile(ownProfile as Profile | null);

    const [{ data: postRows, error: postError }, { data: memberRows }] = await Promise.all([
      supabase.from('posts').select('id, author_id, title, body, kind, created_at').order('created_at', { ascending: false }).limit(30),
      supabase.from('profiles').select('id, full_name, avatar_url, english_level').order('full_name'),
    ]);
    setMembers((memberRows || []) as Profile[]);
    if (postError) { setError(`Não foi possível carregar o feed: ${postError.message}`); setLoading(false); return; }
    const rows = postRows || [];
    const authorIds = [...new Set(rows.map((p: any) => p.author_id))];
    const postIds = rows.map((p: any) => p.id);
    const [{ data: profiles }, { data: comments }, { data: reactions }] = await Promise.all([
      authorIds.length ? supabase.from('profiles').select('id, full_name, avatar_url, english_level').in('id', authorIds) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from('comments').select('id, post_id, author_id, body, created_at').in('post_id', postIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from('reactions').select('post_id, user_id').in('post_id', postIds).eq('reaction', 'like') : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const commentRows = comments || [];
    const commentAuthorIds = [...new Set(commentRows.map((c: any) => c.author_id))];
    const { data: commentProfiles } = commentAuthorIds.length ? await supabase.from('profiles').select('id, full_name, avatar_url, english_level').in('id', commentAuthorIds) : { data: [] as any[] };
    const commentProfileMap = new Map((commentProfiles || []).map((p: any) => [p.id, p]));
    setPosts(rows.map((p: any) => ({
      ...p,
      author: profileMap.get(p.author_id),
      comments: commentRows.filter((c: any) => c.post_id === p.id).map((c: any) => ({ ...c, author: commentProfileMap.get(c.author_id) })),
      reactions: (reactions || []).filter((r: any) => r.post_id === p.id),
    })) as Post[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadFeed(); }, [loadFeed]);

  async function createPost(event: FormEvent) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || !userId) return;
    setSending(true); setError(''); setNotice('');
    const { error: insertError } = await supabase.from('posts').insert({ author_id: userId, body: cleanBody, title: '', kind: 'community' });
    if (insertError) setError(`Não foi possível publicar: ${insertError.message}`);
    else { setBody(''); setComposerExpanded(false); setNotice('Publicação partilhada com a comunidade.'); await loadFeed(userId); }
    setSending(false);
  }

  async function addComment(event: FormEvent, postId: string) {
    event.preventDefault();
    const cleanBody = (commentDrafts[postId] || '').trim();
    if (!cleanBody || !userId) return;
    setError('');
    const { error: insertError } = await supabase.from('comments').insert({ post_id: postId, author_id: userId, body: cleanBody });
    if (insertError) setError(`Não foi possível comentar: ${insertError.message}`);
    else { setCommentDrafts((prev) => ({ ...prev, [postId]: '' })); await loadFeed(userId); }
  }

  async function savePostEdit(event: FormEvent, postId: string) {
    event.preventDefault();
    const cleanBody = postEditDraft.trim();
    if (!cleanBody || !userId) return;
    const { error: updateError } = await supabase.from('posts').update({ body: cleanBody }).eq('id', postId).eq('author_id', userId);
    if (updateError) setError(`Não foi possível editar a publicação: ${updateError.message}`);
    else {
      setEditingPostId('');
      setPostEditDraft('');
      setNotice('Publicação atualizada.');
      await loadFeed(userId);
    }
  }

  async function deletePost(postId: string) {
    if (!userId || !window.confirm('Queres apagar esta publicação? Esta ação não pode ser desfeita.')) return;
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId).eq('author_id', userId);
    if (deleteError) setError(`Não foi possível apagar a publicação: ${deleteError.message}`);
    else {
      setNotice('Publicação apagada.');
      await loadFeed(userId);
    }
  }

  async function saveCommentEdit(event: FormEvent, commentId: string) {
    event.preventDefault();
    const cleanBody = commentEditDraft.trim();
    if (!cleanBody || !userId) return;
    const { error: updateError } = await supabase.from('comments').update({ body: cleanBody }).eq('id', commentId).eq('author_id', userId);
    if (updateError) setError(`Não foi possível editar o comentário: ${updateError.message}`);
    else {
      setEditingCommentId('');
      setCommentEditDraft('');
      setNotice('Comentário atualizado.');
      await loadFeed(userId);
    }
  }

  async function deleteComment(commentId: string) {
    if (!userId || !window.confirm('Queres apagar este comentário?')) return;
    const { error: deleteError } = await supabase.from('comments').delete().eq('id', commentId).eq('author_id', userId);
    if (deleteError) setError(`Não foi possível apagar o comentário: ${deleteError.message}`);
    else {
      setNotice('Comentário apagado.');
      await loadFeed(userId);
    }
  }

  async function toggleLike(post: Post) {
    if (!userId) return;
    setError('');
    const existing = post.reactions.find((reaction) => reaction.user_id === userId);
    const result = existing
      ? await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', userId).eq('reaction', 'like')
      : await supabase.from('reactions').insert({ post_id: post.id, user_id: userId, reaction: 'like' });
    if (result.error) setError(`Não foi possível atualizar a reação: ${result.error.message}`);
    else await loadFeed(userId);
  }

  async function openConversation(member: Profile) {
    setActiveMember(member);
    setDirectMessages([]);
    setMessageDraft('');
    const pair = `and(sender_id.eq.${userId},recipient_id.eq.${member.id}),and(sender_id.eq.${member.id},recipient_id.eq.${userId})`;
    const { data, error: messageError } = await supabase.from('direct_messages').select('id, sender_id, recipient_id, body, created_at').or(pair).order('created_at', { ascending: true }).limit(100);
    if (messageError) setError(`Não foi possível abrir a conversa: ${messageError.message}`);
    else setDirectMessages((data || []) as DirectMessage[]);
  }

  async function sendPrivateMessage(event: FormEvent) {
    event.preventDefault();
    const cleanBody = messageDraft.trim();
    if (!cleanBody || !activeMember || !userId || sendingMessage) return;
    setSendingMessage(true);
    const { error: messageError } = await supabase.from('direct_messages').insert({ sender_id: userId, recipient_id: activeMember.id, body: cleanBody });
    if (messageError) setError(`Não foi possível enviar a mensagem: ${messageError.message}`);
    else {
      setMessageDraft('');
      await openConversation(activeMember);
    }
    setSendingMessage(false);
  }

  return <Shell title="Comunidade" subtitle="Aprende, partilha e pratica inglês com outros membros.">
    <div className="community-social-layout">
      <aside className="community-left-column" aria-label="Atalhos da comunidade">
        <div className="community-shortcuts">
          <h2>Atalhos</h2>
          <a className="is-active" href="#community-feed"><Home size={19} /> Feed da comunidade</a>
          <a href="#community-members"><Users size={19} /> Membros</a>
          <Link href="/amizades"><Users size={19} /> Pedidos de amizade</Link>
          <Link href="/perfil"><UserRound size={19} /> O meu perfil</Link>
          <Link href="/chatbot"><MessageCircle size={19} /> Eric AI Coach</Link>
        </div>
        <p className="community-left-note">Practice makes progress.</p>
      </aside>

      <section className="community-timeline" id="community-feed" aria-label="Feed da comunidade">
        {error && <div className="notice community-alert" role="alert">{error}</div>}
        {notice && <div className="notice community-alert community-success" role="status">{notice}</div>}
        <form className={`panel community-composer${composerExpanded ? ' is-expanded' : ''}`} onSubmit={createPost}>
          <div className="community-composer-top">
            <MemberAvatar member={profile} />
            <label className="community-composer-prompt" htmlFor="community-post">O que gostarias de partilhar?</label>
            <Link className="community-composer-photo" href="/perfil" aria-label="Atualizar fotografia de perfil"><ImageIcon size={22} /><span>Foto</span></Link>
          </div>
          <textarea id="community-post" className="community-post-input" value={body} onFocus={() => setComposerExpanded(true)} onChange={(e) => setBody(e.target.value)} maxLength={3000} required placeholder="O que estás a pensar?" rows={3} />
          <div className="community-composer-footer"><small>{body.length}/3000</small><button className="button" type="submit" disabled={sending || !body.trim() || !userId}>{sending ? 'A publicar…' : 'Publicar'}</button></div>
        </form>
        <div className="community-feed-heading"><h2>Publicações recentes</h2><button type="button" className="community-refresh" onClick={() => { setLoading(true); void loadFeed(userId || undefined); }}>Atualizar</button></div>
        {loading && <div className="panel community-empty">A carregar publicações…</div>}
        {!loading && posts.length === 0 && !error && <div className="panel community-empty"><Users size={24} /><h2>A comunidade começa contigo</h2><p>Partilha a primeira ideia ou pergunta.</p></div>}
        {!loading && posts.map((post) => {
          const liked = post.reactions.some((reaction) => reaction.user_id === userId);
          return <article className="panel post community-post" key={post.id}>
            <div className="community-post-heading">
              <Link className="community-author-link" href={`/membros/${post.author_id}`} aria-label={`Ver perfil de ${post.author?.full_name || 'membro'}`}>
                <MemberAvatar member={post.author} />
                <span className="community-post-author-text"><strong>{post.author?.full_name || 'Membro'}</strong><small>{post.author?.english_level || 'Membro'} · {dateLabel(post.created_at)}</small></span>
              </Link>
              {post.author_id === userId && <div className="community-owner-actions">
                <button type="button" className="community-owner-action" onClick={() => { setEditingPostId(post.id); setPostEditDraft(post.body); }} aria-label="Editar publicação"><Pencil size={15} /><span>Editar</span></button>
                <button type="button" className="community-owner-action is-danger" onClick={() => void deletePost(post.id)} aria-label="Apagar publicação"><Trash2 size={15} /><span>Apagar</span></button>
              </div>}
            </div>
            {post.title && <h2>{post.title}</h2>}
            {editingPostId === post.id ? <form className="community-inline-editor" onSubmit={(event) => void savePostEdit(event, post.id)}>
              <textarea aria-label="Editar publicação" value={postEditDraft} onChange={(event) => setPostEditDraft(event.target.value)} maxLength={3000} rows={4} required />
              <div><button type="button" className="button button-light" onClick={() => setEditingPostId('')}>Cancelar</button><button type="submit" className="button" disabled={!postEditDraft.trim()}>Guardar</button></div>
            </form> : <p className="community-post-body">{post.body}</p>}
            <div className="community-post-stats"><span>{post.reactions.length ? `${post.reactions.length} gostos` : ''}</span><span>{post.comments.length} comentários</span></div>
            <div className="community-post-actions">
              <button type="button" className={liked ? 'community-like is-liked' : 'community-like'} aria-pressed={liked} onClick={() => void toggleLike(post)}><ThumbsUp size={17} /><span>{liked ? 'Gostaste' : 'Gosto'}</span></button>
              <button type="button" className="community-like" onClick={() => document.getElementById(`comment-${post.id}`)?.focus()}><MessageCircle size={17} /><span>Comentar</span></button>
              {post.author && post.author.id !== userId && <button type="button" className="community-like" onClick={() => void openConversation(post.author!)}><Send size={16} /><span>Mensagem</span></button>}
            </div>
            <div className="community-comments">
              {post.comments.map((comment) => <div className="community-comment" key={comment.id}>
                <Link href={`/membros/${comment.author_id}`} aria-label={`Ver perfil de ${comment.author?.full_name || 'membro'}`}><MemberAvatar member={comment.author} className="community-comment-avatar" /></Link>
                <div className="community-comment-bubble">
                  <Link className="community-comment-author" href={`/membros/${comment.author_id}`}><strong>{comment.author?.full_name || 'Membro'}</strong></Link>
                  {editingCommentId === comment.id ? <form className="community-inline-editor" onSubmit={(event) => void saveCommentEdit(event, comment.id)}>
                    <textarea aria-label="Editar comentário" value={commentEditDraft} onChange={(event) => setCommentEditDraft(event.target.value)} maxLength={2000} rows={2} required />
                    <div><button type="button" className="button button-light" onClick={() => setEditingCommentId('')}>Cancelar</button><button type="submit" className="button" disabled={!commentEditDraft.trim()}>Guardar</button></div>
                  </form> : <p>{comment.body}</p>}
                  {comment.author_id === userId && <div className="community-owner-actions community-comment-actions">
                    <button type="button" className="community-owner-action" onClick={() => { setEditingCommentId(comment.id); setCommentEditDraft(comment.body); }} aria-label="Editar comentário"><Pencil size={14} /><span>Editar</span></button>
                    <button type="button" className="community-owner-action is-danger" onClick={() => void deleteComment(comment.id)} aria-label="Apagar comentário"><Trash2 size={14} /><span>Apagar</span></button>
                  </div>}
                </div>
              </div>)}
              <form className="community-comment-form" onSubmit={(event) => void addComment(event, post.id)}>
                <MemberAvatar member={profile} className="community-comment-avatar" />
                <input id={`comment-${post.id}`} aria-label="Escreve um comentário" value={commentDrafts[post.id] || ''} onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))} maxLength={2000} placeholder="Escreve um comentário…" required />
                <button type="submit" className="community-comment-submit" aria-label="Enviar comentário"><Send size={16} /></button>
              </form>
            </div>
          </article>;
        })}
      </section>

      <aside className="community-right-column" id="community-members" aria-label="Membros da comunidade">
        <div className="community-members-heading"><h2>Membros</h2><Users size={18} /></div>
        <label className="community-search"><Search size={16} /><input aria-label="Procurar membros" placeholder="Procurar membros" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} /></label>
        <div className="community-member-list">
          {members.filter((member) => member.id !== userId && (member.full_name || '').toLowerCase().includes(memberSearch.toLowerCase())).map((member) => <div className="community-member-row" key={member.id}>
            <Link className="community-member-profile-link" href={`/membros/${member.id}`} aria-label={`Ver perfil de ${member.full_name || 'membro'}`}>
              <MemberAvatar member={member} />
              <span className="community-member-name"><strong>{member.full_name || 'Membro'}</strong><small>{member.english_level || 'Aluno'}</small></span>
            </Link>
            <button type="button" className="community-message-button" onClick={() => void openConversation(member)} aria-label={`Enviar mensagem a ${member.full_name || 'membro'}`} title="Enviar mensagem"><MessageCircle size={17} /></button>
          </div>)}
          {!loading && members.filter((member) => member.id !== userId).length === 0 && <p className="community-members-empty">Ainda não há outros membros.</p>}
        </div>
      </aside>
    </div>
    {activeMember && <div className="community-message-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveMember(null); }}>
      <section className="community-message-dialog" role="dialog" aria-modal="true" aria-label={`Conversa com ${activeMember.full_name || 'membro'}`}>
        <header className="community-message-header"><MemberAvatar member={activeMember} /><div><strong>{activeMember.full_name || 'Membro'}</strong><small>Mensagem privada</small></div><button type="button" onClick={() => setActiveMember(null)} aria-label="Fechar conversa"><X size={20} /></button></header>
        <div className="community-message-history" aria-live="polite">
          {directMessages.length === 0 ? <p className="community-message-empty">Esta conversa é privada. Envia a primeira mensagem.</p> : directMessages.map((message) => <div className={message.sender_id === userId ? 'community-message-bubble is-mine' : 'community-message-bubble'} key={message.id}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</time></div>)}
        </div>
        <form className="community-message-form" onSubmit={sendPrivateMessage}><input autoFocus aria-label="Escreve uma mensagem privada" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} maxLength={4000} placeholder="Escreve uma mensagem…" required /><button type="submit" disabled={sendingMessage || !messageDraft.trim()} aria-label="Enviar mensagem"><Send size={18} /></button></form>
      </section>
    </div>}
  </Shell>;
}
