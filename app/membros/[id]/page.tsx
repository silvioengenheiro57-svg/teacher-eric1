'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BookOpen, Building2, GraduationCap, MessageCircle, Newspaper, Search, ThumbsUp, Users } from 'lucide-react';
import { Shell } from '@/components/nav';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  english_level: string;
  member_type: 'student' | 'teacher';
  profession: string;
  center_name: string;
  experience: string;
  created_at: string;
};

type Contact = Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'member_type' | 'profession' | 'center_name'>;
type MemberPost = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
  likes: number;
  comments: number;
};

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AL';

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<MemberPost[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<'news' | 'contacts' | 'about'>('news');
  const [contactSearch, setContactSearch] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setError(`Não foi possível confirmar a sessão: ${authError.message}`);
      setLoading(false);
      return;
    }
    if (!user) {
      setError('Inicia sessão para veres os perfis da comunidade.');
      setLoading(false);
      return;
    }

    const { data: member, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, english_level, member_type, profession, center_name, experience, created_at')
      .eq('id', id)
      .maybeSingle();
    if (profileError) {
      setError(`Não foi possível carregar o perfil: ${profileError.message}`);
      setLoading(false);
      return;
    }
    if (!member) {
      setError('Este perfil não está disponível.');
      setLoading(false);
      return;
    }

    const { data: postRows, error: postError } = await supabase
      .from('posts')
      .select('id, title, body, created_at')
      .eq('author_id', id)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (postError) {
      setError(`Não foi possível carregar as publicações: ${postError.message}`);
      setLoading(false);
      return;
    }

    const rows = postRows || [];
    const postIds = rows.map((post) => post.id);
    const [{ data: reactions, error: reactionsError }, { data: comments, error: commentsError }] = await Promise.all([
      postIds.length
        ? supabase.from('reactions').select('post_id').in('post_id', postIds).eq('reaction', 'like')
        : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
      postIds.length
        ? supabase.from('comments').select('post_id').in('post_id', postIds)
        : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
    ]);
    if (reactionsError || commentsError) {
      setError(`Não foi possível carregar as interações: ${(reactionsError || commentsError)?.message}`);
      setLoading(false);
      return;
    }

    setProfile(member as Profile);
    setPosts(rows.map((post) => ({
      ...post,
      likes: (reactions || []).filter((reaction) => reaction.post_id === post.id).length,
      comments: (comments || []).filter((comment) => comment.post_id === post.id).length,
    })));
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function loadContacts() {
    if (contactsLoaded || contactsLoading) return;
    setContactsLoading(true);
    const { data, error: contactsError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, member_type, profession, center_name')
      .neq('id', id)
      .order('full_name')
      .limit(100);
    if (contactsError) {
      setError(`Não foi possível carregar os contactos: ${contactsError.message}`);
    } else {
      setContacts((data || []) as Contact[]);
      setContactsLoaded(true);
    }
    setContactsLoading(false);
  }

  function selectTab(tab: 'news' | 'contacts' | 'about') {
    setActiveTab(tab);
    if (tab === 'contacts') void loadContacts();
  }

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    : '';

  return (
    <Shell title="Perfil de membro" subtitle="Conhece este membro e as suas publicações na comunidade.">
      {loading && <div className="panel member-profile-message" role="status">A carregar perfil…</div>}
      {error && <div className="notice member-profile-message" role="alert">{error}</div>}
      {!loading && profile && <>
        <section className="panel member-profile-header">
          <div className="member-profile-person">
            <div className="member-profile-avatar">
              {profile.avatar_url ? <img src={profile.avatar_url} alt={`Fotografia de ${profile.full_name || 'membro'}`} /> : initials(profile.full_name || 'Aluno')}
            </div>
            <div>
              <h2>{profile.full_name || 'Membro'}</h2>
              <p>{profile.member_type === 'teacher' ? 'Professor' : 'Aluno'} · {profile.english_level} · Nível de inglês</p>
              {(profile.profession || profile.center_name) && <p className="member-profile-professional">
                {profile.profession && <span>{profile.profession}</span>}
                {profile.center_name && <span><Building2 size={14} />{profile.center_name}</span>}
              </p>}
              <small>{profile.bio || 'Este membro ainda não adicionou uma apresentação.'}</small>
            </div>
          </div>
          <div className="member-profile-stats">
            <span><strong>{posts.length}</strong> publicações</span>
            <span><strong>{joinedDate || '—'}</strong> membro desde</span>
          </div>
        </section>
        {profile.experience && <section className="panel member-profile-experience">
          <h2>Experiência</h2>
          <p>{profile.experience}</p>
        </section>}

        <nav className="member-profile-tabs" role="tablist" aria-label="Separadores do perfil">
          <button type="button" role="tab" id="member-tab-news" aria-selected={activeTab === 'news'} aria-controls="member-panel-news" onClick={() => selectTab('news')}><Newspaper size={17} />Novidades</button>
          <button type="button" role="tab" id="member-tab-contacts" aria-selected={activeTab === 'contacts'} aria-controls="member-panel-contacts" onClick={() => selectTab('contacts')}><Users size={17} />Contactos</button>
          <button type="button" role="tab" id="member-tab-about" aria-selected={activeTab === 'about'} aria-controls="member-panel-about" onClick={() => selectTab('about')}><BookOpen size={17} />Sobre o Teacher Eric</button>
        </nav>

        {activeTab === 'news' && <section className="member-profile-posts" id="member-panel-news" role="tabpanel" aria-labelledby="member-tab-news" aria-label={`Novidades de ${profile.full_name || 'membro'}`}>
          <h2>Novidades</h2>
          {posts.length === 0 && <div className="panel member-profile-message">Este membro ainda não publicou novidades.</div>}
          {posts.map((post) => <article className="panel member-profile-post" key={post.id}>
            <time>{new Date(post.created_at).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}</time>
            {post.title && <h3>{post.title}</h3>}
            <p>{post.body}</p>
            <footer>
              <span><ThumbsUp size={15} /> {post.likes}</span>
              <Link href={`/comunidade#comment-${post.id}`}><MessageCircle size={15} /> {post.comments} comentários · Ver conversa</Link>
            </footer>
          </article>)}
        </section>}

        {activeTab === 'contacts' && <section className="member-profile-contacts" id="member-panel-contacts" role="tabpanel" aria-labelledby="member-tab-contacts">
          <header><div><h2>Contactos da comunidade</h2><p>Visita os perfis dos outros membros e conhece a comunidade.</p></div><label className="member-profile-contact-search"><Search size={16} /><input aria-label="Pesquisar contactos" placeholder="Pesquisar membros" value={contactSearch} onChange={(event) => setContactSearch(event.target.value)} /></label></header>
          {contactsLoading && <div className="panel member-profile-message" role="status">A carregar contactos…</div>}
          {!contactsLoading && contacts.filter((contact) => `${contact.full_name} ${contact.profession} ${contact.center_name}`.toLowerCase().includes(contactSearch.toLowerCase())).length === 0 && <div className="panel member-profile-message">Não encontrámos outros membros com esse nome.</div>}
          <div className="member-profile-contact-grid">
            {contacts.filter((contact) => `${contact.full_name} ${contact.profession} ${contact.center_name}`.toLowerCase().includes(contactSearch.toLowerCase())).map((contact) => <article className="panel member-profile-contact" key={contact.id}>
              <Link href={`/membros/${contact.id}`} className="member-profile-contact-person">
                <span className="member-profile-contact-avatar">{contact.avatar_url ? <img src={contact.avatar_url} alt="" /> : initials(contact.full_name || 'Aluno')}</span>
                <span><strong>{contact.full_name || 'Membro'}</strong><small>{contact.member_type === 'teacher' ? 'Professor' : 'Aluno'}</small></span>
              </Link>
              {contact.profession && <p>{contact.profession}</p>}
              {contact.center_name && <p><Building2 size={14} />{contact.center_name}</p>}
              <Link className="button button-light member-profile-open-contact" href={`/membros/${contact.id}`}>Ver perfil</Link>
            </article>)}
          </div>
        </section>}

        {activeTab === 'about' && <section className="panel member-profile-about" id="member-panel-about" role="tabpanel" aria-labelledby="member-tab-about">
          <div className="member-profile-about-heading">
            <img src="/images/teacher-eric.png" alt="Teacher Eric" />
            <div><p>PROFESSOR DE INGLÊS · ANGOLA</p><h2>Sobre o Teacher Eric</h2></div>
          </div>
          <p>Teacher Eric é um professor de inglês angolano e figura pública, conhecido pelo seu trabalho de ensino, pela presença nas redes sociais e pelas suas posições sobre a aprendizagem de línguas em Angola.</p>

          <section className="member-profile-about-section">
            <h3>Percurso e ativismo educacional</h3>
            <p>Defende metodologias de ensino do inglês mais práticas e dinâmicas e critica abordagens tradicionais que, na sua perspetiva, não dão prática suficiente aos alunos. Os seus vídeos, demonstrações e opiniões geram participação e debate sobre a importância de aprender inglês.</p>
            <p>A participação em programas de grande audiência, incluindo o Fly Podcast, apresentado por Fly Skuad, contribuiu para dar visibilidade ao seu trabalho e às suas ideias sobre o progresso educacional e linguístico.</p>
          </section>

          <section className="member-profile-about-section">
            <h3>Carreira e alcance do ensino</h3>
            <p>Lidera a maior estrutura de ensino da língua inglesa em Angola, com uma equipa de mais de 40 professores que ministra aulas online e ao domicílio. O trabalho já alcançou mais de 5.000 estudantes de Angola, Moçambique, Portugal, Brasil, Guiné e outros países.</p>
            <div className="member-profile-about-facts">
              <div><GraduationCap size={20} /><span><strong>Mais de 40 professores</strong><small>Aulas online e ao domicílio.</small></span></div>
              <div><Users size={20} /><span><strong>Mais de 5.000 estudantes</strong><small>Alunos em diferentes países.</small></span></div>
              <div><BookOpen size={20} /><span><strong>Inglês com prática</strong><small>Metodologias focadas numa aprendizagem mais dinâmica.</small></span></div>
            </div>
          </section>

          <section className="member-profile-about-section">
            <h3>Filantropia e acesso à educação</h3>
            <p>Criou uma comunidade online onde disponibiliza aulas de inglês 100% gratuitas para mais de 100 mil pessoas. Também já concedeu mais de 500 bolsas de estudo a pessoas com menos possibilidades financeiras.</p>
          </section>

          <section className="member-profile-about-section">
            <h3>Outras áreas de atuação</h3>
            <p>Além de professor e mentor, atua como escritor, compositor, influencer, produtor e palestrante.</p>
          </section>
          <Link className="button" href="/comunidade"><Users size={16} /> Explorar a comunidade</Link>
        </section>}
      </>}
    </Shell>
  );
}
