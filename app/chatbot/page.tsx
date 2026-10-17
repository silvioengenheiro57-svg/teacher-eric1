'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, BookOpen, BriefcaseBusiness, Menu, MessageCircle, Plus, Sparkles, Users } from 'lucide-react';
import { MobileAppHeader, MobileBottomNavigation, NavLinks } from '@/components/nav';

type Msg = { role: 'user' | 'assistant'; content: string };

const suggestions = [
  { title: 'Conversação diária', text: "Let's practise a conversation about my day.", icon: MessageCircle },
  { title: 'Corrigir o meu inglês', text: 'I am learning English since two months. Can you correct this sentence and explain why?', icon: BookOpen },
  { title: 'Vocabulário para o trabalho', text: 'Teach me five useful English words for work, with simple examples.', icon: BriefcaseBusiness },
  { title: 'Preparar uma entrevista', text: 'Help me practise answering common job interview questions in English.', icon: Users },
];

export default function Chatbot() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text = input) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    if (prompt.length > 2000) {
      setNotice('A mensagem deve ter no máximo 2000 caracteres.');
      return;
    }

    const next: Msg[] = [...messages, { role: 'user', content: prompt }];
    setMessages(next);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = '32px';
    setNotice('');
    setSidebarOpen(false);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível obter uma resposta.');
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Ocorreu um erro. Tenta novamente.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  function startNewChat() {
    setMessages([]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = '32px';
    setNotice('');
    setSidebarOpen(false);
  }

  return (
    <div className="chat-app">
      <MobileAppHeader />
      {sidebarOpen && <button className="chat-backdrop" type="button" aria-label="Fechar navegação" onClick={() => setSidebarOpen(false)} />}
      <aside className={`chat-sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Navegação principal">
        <Link className="chat-brand" href="/comunidade">
          <span className="chat-brand-mark">TE</span>
          <span>Teacher Eric<small>AI Coach</small></span>
        </Link>
        <button className="chat-new-button" type="button" onClick={startNewChat}>
          <Plus size={18} strokeWidth={1.8} /> Nova conversa
        </button>
        <p className="chat-nav-label">A tua aprendizagem</p>
        <NavLinks className="chat-nav" />
        <div className="chat-sidebar-bottom">
          <p>Practice makes progress.</p>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-topbar">
          <button className="chat-menu-button" type="button" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? 'Fechar navegação' : 'Abrir navegação'}>
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <strong>Teacher Eric AI Coach</strong>
          <span className="chat-ready"><i /> pronto</span>
        </header>

        <div className="chat-scroll" ref={scrollRef} aria-live="polite">
          <div className="chat-thread">
            {messages.length === 0 ? (
              <section className="chat-welcome">
                <div className="chat-welcome-icon"><Sparkles size={23} strokeWidth={1.7} /></div>
                <h1>Em que posso ajudar?</h1>
                <p>Pratica inglês ao teu ritmo. Escreve uma pergunta ou escolhe uma sugestão para começar.</p>
                <div className="chat-suggestions">
                  {suggestions.map(({ title, text, icon: Icon }) => (
                    <button className="chat-suggestion" key={title} type="button" onClick={() => void send(text)} disabled={busy}>
                      <Icon size={18} strokeWidth={1.8} />
                      <span><strong>{title}</strong><small>{text}</small></span>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              messages.map((message, index) => (
                <article className={`chat-row ${message.role}`} key={`${index}-${message.role}`}>
                  {message.role === 'assistant' && <div className="chat-ai-avatar"><Sparkles size={16} /></div>}
                  <div className="chat-message-content">{message.content}</div>
                </article>
              ))
            )}
            {busy && <div className="chat-row assistant" role="status"><div className="chat-ai-avatar"><Sparkles size={16} /></div><div className="chat-message-content chat-thinking">O tutor está a preparar a resposta…</div></div>}
            {notice && <p className="chat-notice" role="alert">{notice}</p>}
          </div>
        </div>

        <div className="chat-compose-area">
          <form onSubmit={submit} className="chat-composer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                event.target.style.height = 'auto';
                event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escreve uma mensagem"
              rows={1}
              maxLength={2000}
              disabled={busy}
              aria-label="A tua mensagem"
            />
            <div className="chat-composer-footer">
              <small>{input.length}/2000</small>
              <button className="chat-send-button" type="submit" disabled={busy || !input.trim()} aria-label="Enviar mensagem">
                <ArrowUp size={19} strokeWidth={2.2} />
              </button>
            </div>
          </form>
          <p className="chat-disclaimer">As respostas podem conter erros. Evita partilhar dados pessoais. <span>Enter para enviar · Shift + Enter para nova linha</span></p>
        </div>
      </main>
      <MobileBottomNavigation />
    </div>
  );
}
