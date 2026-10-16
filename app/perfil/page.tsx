'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Shell } from '@/components/nav';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Profile = {
  full_name: string;
  avatar_url: string | null;
  bio: string;
  english_level: string;
  created_at: string;
};

const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarTypes = ['image/jpeg', 'image/png', 'image/webp'];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AL';
}

export default function Perfil() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [englishLevel, setEnglishLevel] = useState('A1');
  const [postCount, setPostCount] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setUserId('');
        setError('Inicia sessão para veres e editares o teu perfil.');
        return;
      }

      setUserId(user.id);
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, bio, english_level, created_at')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!data) {
        setError('Não encontrámos o teu perfil. Confirma se a tabela profiles está configurada no Supabase.');
        return;
      }

      const loadedProfile = data as Profile;
      const { count } = await supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id);
      setProfile(loadedProfile);
      setPostCount(count || 0);
      setName(loadedProfile.full_name || '');
      setBio(loadedProfile.bio || '');
      setEnglishLevel(loadedProfile.english_level || 'A1');
    } catch (loadError) {
      setError(loadError instanceof Error ? `Não foi possível carregar o perfil: ${loadError.message}` : 'Não foi possível carregar o perfil.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) closeEditor();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editing, saving]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setNotice('');
    if (!allowedAvatarTypes.includes(file.type)) {
      setSelectedAvatar(null);
      setAvatarPreview('');
      setError('Escolhe uma imagem JPG, PNG ou WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > maxAvatarSize) {
      setSelectedAvatar(null);
      setAvatarPreview('');
      setError('A imagem deve ter no máximo 5 MB.');
      event.target.value = '';
      return;
    }
    setSelectedAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function closeEditor() {
    setName(profile?.full_name || '');
    setBio(profile?.bio || '');
    setEnglishLevel(profile?.english_level || 'A1');
    setSelectedAvatar(null);
    setAvatarPreview('');
    setError('');
    setEditing(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!userId || !cleanName) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      let avatarUrl = profile?.avatar_url || null;
      if (selectedAvatar) {
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`${userId}/avatar`, selectedAvatar, {
            cacheControl: '3600',
            contentType: selectedAvatar.type,
            upsert: true,
          });
        if (uploadError) throw new Error(`Não foi possível carregar a fotografia: ${uploadError.message}`);
        avatarUrl = `${supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar`).data.publicUrl}?v=${Date.now()}`;
      }

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: cleanName,
          bio: bio.trim(),
          english_level: englishLevel,
          avatar_url: avatarUrl,
        })
        .eq('id', userId)
        .select('full_name, avatar_url, bio, english_level, created_at')
        .single();
      if (updateError) throw new Error(`Não foi possível guardar o perfil: ${updateError.message}`);

      setProfile(data as Profile);
      setName(data.full_name);
      setBio(data.bio || '');
      setEnglishLevel(data.english_level);
      setSelectedAvatar(null);
      setAvatarPreview('');
      setNotice('Perfil atualizado. As alterações já aparecem no cartão de membro.');
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível guardar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  const visibleAvatar = avatarPreview || profile?.avatar_url || '';
  const displayName = name.trim() || profile?.full_name || 'O teu nome';
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    : '';

  return (
    <Shell title="O meu perfil" subtitle="Personaliza a tua apresentação e conhece o teu cartão de membro.">
      {error && <div className="notice profile-feedback profile-error" role="alert">{error}</div>}
      {notice && <div className="notice profile-feedback profile-success" role="status">{notice}</div>}
      {loading ? (
        <div className="panel profile-loading" role="status">A carregar o teu perfil…</div>
      ) : userId && profile ? (
        <>
          <section className="profile-overview">
            <div className="profile-overview-person">
              <div className="profile-overview-avatar">{visibleAvatar ? <img src={visibleAvatar} alt={`Fotografia de ${displayName}`} /> : initials(displayName)}</div>
              <div><h2>{displayName}</h2><p>@{displayName.toLowerCase().replace(/\s+/g, '.')}</p><span>{englishLevel} · Nível de inglês</span><small>{bio.trim() || 'Partilha um pouco sobre ti com a comunidade.'}</small></div>
            </div>
            <div className="profile-overview-stats"><div><strong>{postCount}</strong><span>Publicações</span></div><div><strong>{englishLevel}</strong><span>Nível</span></div><div><strong>{joinedDate || '—'}</strong><span>Membro desde</span></div></div>
            <div className="profile-overview-actions"><button type="button" className="button" onClick={() => setEditing(true)}>Editar dados</button><Link href="/perfil/cartao" className="button button-light">Ver cartão de membro</Link></div>
          </section>
          {editing && <div className="profile-editor-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeEditor(); }}>
            <section className="profile-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
              <header className="profile-editor-modal-header"><div><h2 id="profile-editor-title">Editar dados</h2><p>Atualiza a informação que a comunidade vê.</p></div><button type="button" aria-label="Fechar edição" onClick={closeEditor} disabled={saving}><X size={20} /></button></header>
              <section className="panel profile-editor">
                <form className="profile-form" onSubmit={saveProfile}>
                  <div className="profile-photo-field">
                    <div className="profile-avatar profile-editor-avatar">
                      {visibleAvatar ? <img src={visibleAvatar} alt={`Fotografia de ${displayName}`} /> : initials(displayName)}
                    </div>
                    <div className="profile-photo-copy">
                      <strong>A tua fotografia</strong>
                      <small>JPG, PNG ou WebP · máximo 5 MB</small>
                      <label className="profile-upload-button">
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />
                        {selectedAvatar ? 'Escolher outra fotografia' : 'Carregar fotografia'}
                      </label>
                    </div>
                  </div>
                  <label className="profile-label" htmlFor="profile-name">Nome</label>
                  <input id="profile-name" className="profile-text-input" type="text" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} required />
                  <div className="profile-label-row"><label className="profile-label" htmlFor="profile-bio">Bio</label><small>{bio.length}/160</small></div>
                  <textarea id="profile-bio" className="profile-text-input profile-bio-input" maxLength={160} rows={4} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Conta à comunidade o que estás a aprender ou o que gostas de fazer." />
                  <label className="profile-label" htmlFor="profile-level">Nível de inglês</label>
                  <select id="profile-level" className="profile-text-input profile-select" value={englishLevel} onChange={(event) => setEnglishLevel(event.target.value)}>
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                  <div className="profile-editor-actions"><button type="button" className="button button-light" onClick={closeEditor} disabled={saving}>Cancelar</button><button className="button profile-save-button" type="submit" disabled={saving || !name.trim()}>{saving ? 'A guardar…' : 'Guardar alterações'}</button></div>
                </form>
              </section>
            </section>
          </div>}
        </>
      ) : null}
    </Shell>
  );
}
