'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Member = { id: string; full_name: string | null; avatar_url: string | null; english_level: string | null };
type DirectMessage = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };
type Conversation = { member: Member; lastMessage: DirectMessage };

const initials = (name?: string | null) => (name || 'Aluno').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AL';
const timeLabel = (value: string) => new Date(value).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Avatar({ member }: { member: Member }) {
  return <span className="messages-avatar" aria-hidden="true">{member.avatar_url ? <img src={member.avatar_url} alt="" /> : initials(member.full_name)}</span>;
}

export default function MessagesInbox() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [thread, setThread] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [threadError, setThreadError] = useState('');

  const loadConversations = useCallback(async () => {
    setError('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setUserId('');
      setError('Inicia sessão para veres as tuas mensagens.');
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data: rows, error: messagesError } = await supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (messagesError) {
      setError(`Não foi possível carregar as mensagens: ${messagesError.message}`);
      setLoading(false);
      return;
    }
    const latestByMember = new Map<string, DirectMessage>();
    for (const message of (rows || []) as DirectMessage[]) {
      const otherId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
      if (!latestByMember.has(otherId)) latestByMember.set(otherId, message);
    }
    const memberIds = [...latestByMember.keys()];
    const { data: members, error: membersError } = memberIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url, english_level').in('id', memberIds)
      : { data: [], error: null };
    if (membersError) {
      setError(`Não foi possível carregar os participantes: ${membersError.message}`);
      setLoading(false);
      return;
    }
    const memberMap = new Map(((members || []) as Member[]).map((member) => [member.id, member]));
    setConversations(memberIds.flatMap((id) => {
      const member = memberMap.get(id);
      const lastMessage = latestByMember.get(id);
      return member && lastMessage ? [{ member, lastMessage }] : [];
    }));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  const openConversation = useCallback(async (member: Member) => {
    setActiveMember(member);
    setDraft('');
    setThreadError('');
    setThreadLoading(true);
    const pair = `and(sender_id.eq.${userId},recipient_id.eq.${member.id}),and(sender_id.eq.${member.id},recipient_id.eq.${userId})`;
    const { data, error: loadError } = await supabase
      .from('direct_messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .or(pair)
      .order('created_at', { ascending: true })
      .limit(200);
    if (loadError) setThreadError(`Não foi possível abrir a conversa: ${loadError.message}`);
    else setThread((data || []) as DirectMessage[]);
    setThreadLoading(false);
  }, [supabase, userId]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !userId || !activeMember || sending) return;
    setSending(true);
    setThreadError('');
    const { data, error: sendError } = await supabase
      .from('direct_messages')
      .insert({ sender_id: userId, recipient_id: activeMember.id, body })
      .select('id, sender_id, recipient_id, body, created_at')
      .single();
    if (sendError) setThreadError(`Não foi possível enviar a mensagem: ${sendError.message}`);
    else {
      setThread((current) => [...current, data as DirectMessage]);
      setDraft('');
      await loadConversations();
    }
    setSending(false);
  }

  return <div className={`messages-layout${activeMember ? ' has-active-conversation' : ''}`}>
    <section className="messages-inbox" aria-label="Lista de conversas">
      <header><div><h2>Mensagens</h2><p>Conversas privadas com membros</p></div><Link href="/comunidade" aria-label="Encontrar membros" title="Encontrar membros"><MessageCircle size={18} /></Link></header>
      {error && <p className="messages-feedback" role="alert">{error}</p>}
      {loading && <p className="messages-feedback" role="status">A carregar conversas…</p>}
      {!loading && !error && conversations.length === 0 && <div className="messages-empty"><MessageCircle size={24} /><strong>Ainda não tens conversas</strong><p>Abre o perfil de um membro na comunidade para lhe enviar uma mensagem.</p><Link href="/comunidade">Ir para a comunidade</Link></div>}
      <div className="messages-conversation-list">
        {conversations.map(({ member, lastMessage }) => <button className={activeMember?.id === member.id ? 'messages-conversation is-active' : 'messages-conversation'} key={member.id} type="button" onClick={() => void openConversation(member)}>
          <Avatar member={member} />
          <span className="messages-conversation-copy"><strong>{member.full_name || 'Membro'}</strong><small>{lastMessage.sender_id === userId ? 'Tu: ' : ''}{lastMessage.body}</small></span>
          <time>{timeLabel(lastMessage.created_at)}</time>
        </button>)}
      </div>
    </section>

    <section className="messages-thread" aria-label="Conversa privada">
      {activeMember ? <>
        <header className="messages-thread-header"><button type="button" className="messages-back" aria-label="Voltar às conversas" onClick={() => setActiveMember(null)}><ArrowLeft size={19} /></button><Avatar member={activeMember} /><div><strong>{activeMember.full_name || 'Membro'}</strong><small>{activeMember.english_level || 'Aluno'}</small></div></header>
        {threadError && <p className="messages-feedback" role="alert">{threadError}</p>}
        <div className="messages-thread-body" aria-live="polite">
          {threadLoading ? <p className="messages-feedback" role="status">A carregar mensagens…</p> : thread.map((message) => <article className={message.sender_id === userId ? 'messages-bubble is-mine' : 'messages-bubble'} key={message.id}><p>{message.body}</p><time>{new Date(message.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</time></article>)}
        </div>
        <form className="messages-compose" onSubmit={sendMessage}><input aria-label="Escreve uma mensagem" maxLength={4000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escreve uma mensagem…" required /><button type="submit" aria-label="Enviar mensagem" disabled={sending || !draft.trim()}><Send size={17} /></button></form>
      </> : <div className="messages-thread-placeholder"><MessageCircle size={30} /><strong>As tuas mensagens</strong><p>Seleciona uma conversa ou começa uma na comunidade.</p></div>}
    </section>
  </div>;
}
