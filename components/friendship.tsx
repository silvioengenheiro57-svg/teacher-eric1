'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, UserMinus, UserPlus, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type RequestStatus = 'pending' | 'accepted' | 'declined';
type FriendRequest = { id: string; requester_id: string; recipient_id: string; status: RequestStatus };
type Member = { id: string; full_name: string | null; avatar_url: string | null };

function initials(name: string | null) {
  return (name || 'Membro').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'M';
}

export function FriendshipButton({ memberId }: { memberId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState('');
  const [request, setRequest] = useState<FriendRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setError(`Não foi possível confirmar a sessão: ${authError.message}`);
      setLoading(false);
      return;
    }
    if (!user) {
      setError('Inicia sessão para enviar pedidos de amizade.');
      setLoading(false);
      return;
    }
    setUserId(user.id);
    if (user.id === memberId) {
      setRequest(null);
      setLoading(false);
      return;
    }
    const pair = `and(requester_id.eq.${user.id},recipient_id.eq.${memberId}),and(requester_id.eq.${memberId},recipient_id.eq.${user.id})`;
    const { data, error: requestError } = await supabase.from('friend_requests')
      .select('id, requester_id, recipient_id, status')
      .or(pair)
      .maybeSingle();
    if (requestError) setError(`Não foi possível carregar o estado da amizade: ${requestError.message}`);
    else setRequest(data as FriendRequest | null);
    setLoading(false);
  }, [memberId, supabase]);

  useEffect(() => { void load(); }, [load]);

  async function update(action: 'send' | 'accept' | 'decline' | 'cancel' | 'remove') {
    if (!userId || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    let mutationError: string | null = null;
    if (action === 'send') {
      if (request?.status === 'declined') {
        const { data: deleted, error: deleteError } = await supabase.from('friend_requests').delete().eq('id', request.id).select('id').maybeSingle();
        if (deleteError || !deleted) mutationError = deleteError?.message || 'O pedido mudou. Atualiza a página e tenta novamente.';
      }
      if (!mutationError) {
        const { error: insertError } = await supabase.from('friend_requests').insert({ requester_id: userId, recipient_id: memberId, status: 'pending' });
        if (insertError) mutationError = insertError.message;
      }
    } else if (!request) {
      mutationError = 'O pedido já não está disponível. Atualiza a página e tenta novamente.';
    } else if (action === 'accept' || action === 'decline') {
      const { data: updated, error: updateError } = await supabase.from('friend_requests').update({ status: action === 'accept' ? 'accepted' : 'declined' })
        .eq('id', request.id).eq('recipient_id', userId).eq('status', 'pending').select('id').maybeSingle();
      if (updateError || !updated) mutationError = updateError?.message || 'O pedido mudou. Atualiza a página e tenta novamente.';
    } else {
      const { data: deleted, error: deleteError } = await supabase.from('friend_requests').delete().eq('id', request.id).select('id').maybeSingle();
      if (deleteError || !deleted) mutationError = deleteError?.message || 'O pedido mudou. Atualiza a página e tenta novamente.';
    }
    if (mutationError) setError(`Não foi possível atualizar a amizade: ${mutationError}`);
    else {
      setNotice(action === 'accept' ? 'Pedido aceite.' : action === 'decline' ? 'Pedido recusado.' : action === 'cancel' ? 'Pedido cancelado.' : action === 'remove' ? 'Amizade removida.' : 'Pedido de amizade enviado.');
      await load();
    }
    setBusy(false);
  }

  if (loading) return <span className="friendship-status" role="status">A verificar amizade…</span>;
  if (!userId || userId === memberId) return error ? <span className="friendship-error" role="alert">{error}</span> : null;

  return <div className="friendship-actions">
    {!request && <button className="button friendship-button" type="button" disabled={busy} onClick={() => void update('send')}><UserPlus size={16} />{busy ? 'A enviar…' : 'Adicionar amigo'}</button>}
    {request?.status === 'pending' && request.requester_id === userId && <button className="button button-light friendship-button" type="button" disabled={busy} onClick={() => void update('cancel')}><X size={16} />Cancelar pedido</button>}
    {request?.status === 'pending' && request.recipient_id === userId && <>
      <button className="button friendship-button" type="button" disabled={busy} onClick={() => void update('accept')}><Check size={16} />Aceitar</button>
      <button className="button button-light friendship-button" type="button" disabled={busy} onClick={() => void update('decline')}><X size={16} />Recusar</button>
    </>}
    {request?.status === 'accepted' && <button className="button button-light friendship-button" type="button" disabled={busy} onClick={() => void update('remove')}><UserMinus size={16} />Remover amigo</button>}
    {request?.status === 'declined' && <button className="button friendship-button" type="button" disabled={busy} onClick={() => void update('send')}><UserPlus size={16} />Enviar novo pedido</button>}
    {error && <span className="friendship-error" role="alert">{error}</span>}
    {notice && <span className="friendship-notice" role="status">{notice}</span>}
  </div>;
}

type FriendRow = FriendRequest & { member: Member };

export function FriendManager() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState('');
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError(authError ? `Não foi possível confirmar a sessão: ${authError.message}` : 'Inicia sessão para gerir os teus amigos.');
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data: requests, error: requestError } = await supabase.from('friend_requests')
      .select('id, requester_id, recipient_id, status')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (requestError) {
      setError(`Não foi possível carregar os pedidos de amizade: ${requestError.message}`);
      setLoading(false);
      return;
    }
    const requestRows = (requests || []) as FriendRequest[];
    const memberIds = [...new Set(requestRows.map((row) => row.requester_id === user.id ? row.recipient_id : row.requester_id))];
    const { data: profiles, error: profilesError } = memberIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', memberIds)
      : { data: [], error: null };
    if (profilesError) {
      setError(`Não foi possível carregar os perfis: ${profilesError.message}`);
      setLoading(false);
      return;
    }
    const profileMap = new Map(((profiles || []) as Member[]).map((member) => [member.id, member]));
    setRows(requestRows.flatMap((row) => {
      const otherId = row.requester_id === user.id ? row.recipient_id : row.requester_id;
      const member = profileMap.get(otherId);
      return member ? [{ ...row, member }] : [];
    }));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function updateRequest(row: FriendRow, action: 'accept' | 'decline' | 'cancel' | 'remove') {
    setBusyId(row.id);
    setError('');
    setNotice('');
    const result = action === 'accept' || action === 'decline'
      ? await supabase.from('friend_requests').update({ status: action === 'accept' ? 'accepted' : 'declined' }).eq('id', row.id).eq('recipient_id', userId).eq('status', 'pending').select('id').maybeSingle()
      : await supabase.from('friend_requests').delete().eq('id', row.id).select('id').maybeSingle();
    if (result.error || !result.data) setError(`Não foi possível atualizar o pedido: ${result.error?.message || 'O pedido mudou. Atualiza a página e tenta novamente.'}`);
    else {
      setNotice(action === 'accept' ? 'Pedido aceite.' : action === 'decline' ? 'Pedido recusado.' : action === 'cancel' ? 'Pedido cancelado.' : 'Amizade removida.');
      await load();
    }
    setBusyId('');
  }

  function card(row: FriendRow, actions: React.ReactNode) {
    return <article className="panel friendship-card" key={row.id}>
      <Link className="friendship-member" href={`/membros/${row.member.id}`}>
        <span className="friendship-avatar">{row.member.avatar_url ? <img src={row.member.avatar_url} alt="" /> : initials(row.member.full_name)}</span>
        <strong>{row.member.full_name || 'Membro'}</strong>
      </Link>
      <div className="friendship-card-actions">{actions}</div>
    </article>;
  }

  const incoming = rows.filter((row) => row.status === 'pending' && row.recipient_id === userId);
  const outgoing = rows.filter((row) => row.status === 'pending' && row.requester_id === userId);
  const friends = rows.filter((row) => row.status === 'accepted');

  return <div className="friend-manager">
    {error && <div className="notice friendship-feedback" role="alert">{error}</div>}
    {notice && <div className="notice friendship-feedback" role="status">{notice}</div>}
    {loading ? <div className="panel friendship-empty" role="status">A carregar pedidos e amigos…</div> : <>
      <section className="friendship-section"><h2>Pedidos recebidos <span>{incoming.length}</span></h2>
        {incoming.length ? incoming.map((row) => card(row, <>
          <button type="button" className="button" disabled={busyId === row.id} onClick={() => void updateRequest(row, 'accept')}><Check size={16} />Aceitar</button>
          <button type="button" className="button button-light" disabled={busyId === row.id} onClick={() => void updateRequest(row, 'decline')}><X size={16} />Recusar</button>
        </>)) : <p className="friendship-empty">Não tens pedidos pendentes.</p>}
      </section>
      <section className="friendship-section"><h2>Pedidos enviados <span>{outgoing.length}</span></h2>
        {outgoing.length ? outgoing.map((row) => card(row, <button type="button" className="button button-light" disabled={busyId === row.id} onClick={() => void updateRequest(row, 'cancel')}><X size={16} />Cancelar pedido</button>)) : <p className="friendship-empty">Não tens pedidos enviados pendentes.</p>}
      </section>
      <section className="friendship-section"><h2>Os meus amigos <span>{friends.length}</span></h2>
        {friends.length ? friends.map((row) => card(row, <button type="button" className="button button-light" disabled={busyId === row.id} onClick={() => void updateRequest(row, 'remove')}><UserMinus size={16} />Remover</button>)) : <p className="friendship-empty">Ainda não tens amigos adicionados. <Link href="/pesquisar">Procura membros</Link> para enviares um pedido.</p>}
      </section>
    </>}
  </div>;
}
