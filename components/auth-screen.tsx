'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getSiteUrl } from '@/lib/site-url';

type AuthScreenProps = { mode: 'login' | 'register' };

export default function AuthScreen({ mode }: AuthScreenProps) {
  const isRegister = mode === 'register';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('oauth_error') === 'google') {
      setMessage('Não foi possível entrar com Google. Tenta novamente ou usa email e palavra-passe.');
    }
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get('email') || '').trim();
      const password = String(form.get('password') || '');
      const supabase = createSupabaseBrowserClient();

      if (isRegister) {
        const name = String(form.get('name') || '').trim();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, name } },
        });
        if (error) throw error;
        setMessage('Conta criada. Verifica o teu email para confirmares o registo, se a confirmação estiver ativa.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/aluno');
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${getSiteUrl(window.location.origin)}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível iniciar o acesso com Google.');
      setBusy(false);
    }
  }

  return (
    <main className="te-auth-shell">
      <aside className="te-auth-story">
        <Link href="/" className="te-auth-brand" aria-label="Teacher Eric — página inicial">
          <span className="te-auth-brand-script">Teacher</span> Eric<span className="te-auth-dot">.</span>
          <small>comunidade</small>
        </Link>

        <div className="te-auth-story-content">
          <div className="te-auth-teacher">
            <img src="/images/teacher-eric.png" alt="Teacher Eric" />
            <div>
              <h2>Teacher Eric</h2>
              <p>Professor e fundador da comunidade</p>
            </div>
          </div>
          <blockquote>“Cada aula é um pequeno passo. Juntos, chegamos muito longe.”</blockquote>
        </div>

        <p className="te-auth-footer">Comunidade do Teacher Eric</p>
      </aside>

      <section className="te-auth-main">
        <div className="te-auth-mobile-brand">
          <Link href="/" className="te-auth-brand">
            <span className="te-auth-brand-script">Teacher</span> Eric<span className="te-auth-dot">.</span>
          </Link>
          <div className="te-auth-mobile-quote">
            <img src="/images/teacher-eric.png" alt="" />
            <div>
              <strong>“Cada aula é um pequeno passo. Juntos, chegamos muito longe.”</strong>
              <span>Teacher Eric</span>
            </div>
          </div>
        </div>

        <div className="te-auth-form-wrap">
          <header className="te-auth-heading">
            <h1>{isRegister ? 'Criar conta' : 'Bem-vindo de volta'}</h1>
            <p>{isRegister ? 'Junte-se à comunidade em menos de um minuto.' : 'Entre para continuar os seus estudos.'}</p>
          </header>

          <button className="te-auth-google" type="button" onClick={() => void signInWithGoogle()} disabled={busy}>
            <svg className="te-auth-google-mark" aria-hidden="true" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.12 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>{busy ? 'A ligar…' : 'Continuar com Google'}</span>
          </button>
          <div className="te-auth-divider"><span>ou continua com email</span></div>

          <form className="te-auth-form" onSubmit={submit}>
            {isRegister && (
              <label>
                Nome
                <input name="name" type="text" autoComplete="name" placeholder="O seu nome" required />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" autoComplete="email" placeholder="nome@email.com" required />
            </label>
            <label>
              Palavra-passe
              <input
                name="password"
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={6}
                placeholder={isRegister ? 'Pelo menos 6 caracteres' : 'A sua palavra-passe'}
                required
              />
            </label>
            <button className="te-auth-submit" type="submit" disabled={busy}>
              {busy ? 'A processar…' : isRegister ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          {message && <p className="te-auth-message" role="status">{message}</p>}

          <p className="te-auth-switch">
            {isRegister ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <Link href={isRegister ? '/entrar' : '/criar-conta'}>
              {isRegister ? 'Entrar' : 'Registar-se'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
