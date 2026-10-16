'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, MessageCircle, Users } from 'lucide-react';
import { Shell } from '@/components/nav';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type MemberProfile = { id: string; full_name: string; avatar_url: string | null; bio: string; english_level: string; created_at: string };
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AL';

export default function CartaoDeMembro() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        if (!cancelled) { setError('Inicia sessão para veres o teu cartão de membro.'); setLoading(false); }
        return;
      }
      const [{ data, error: profileError }, { count }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, bio, english_level, created_at').eq('id', user.id).maybeSingle(),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
      ]);
      if (cancelled) return;
      if (profileError || !data) setError(profileError?.message || 'Não encontrámos o teu perfil.');
      else { setProfile(data as MemberProfile); setPostCount(count || 0); }
      setLoading(false);
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, [supabase]);

  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return <Shell title="Cartão de membro" subtitle="A tua apresentação para a comunidade.">
    <div className="member-card-page">
      <Link className="member-card-back" href="/perfil"><ArrowLeft size={17} /> Voltar ao perfil</Link>
      {loading && <p className="profile-loading" role="status">A carregar o cartão…</p>}
      {error && <p className="notice profile-feedback profile-error" role="alert">{error}</p>}
      {profile && <article className="profile-member-card member-card-full">
        <div className="member-card-cover"><span className="member-card-badge">MEMBRO</span><div className="member-teacher-mark"><img src="/images/teacher-eric.png" alt="Teacher Eric" /><span>Teacher Eric</span></div></div>
        <div className="member-card-content">
          <div className="member-card-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt={`Fotografia de ${profile.full_name}`} /> : initials(profile.full_name)}</div>
          <div className="member-card-details"><h3>{profile.full_name}</h3><span className="member-level">{profile.english_level} · Aluno de inglês</span><p>{profile.bio || 'A aprender inglês, passo a passo.'}</p></div>
          <div className="member-card-facts"><span><CalendarDays size={16} /> Membro desde {joinedDate}</span><span><MessageCircle size={16} /> {postCount} publicações</span><span><Users size={16} /> Comunidade Teacher Eric</span></div>
          <Link className="member-card-community-link" href="/comunidade">Ir para a comunidade</Link>
        </div>
      </article>}
    </div>
  </Shell>;
}