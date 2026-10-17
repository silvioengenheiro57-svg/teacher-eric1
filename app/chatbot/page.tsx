'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, BookOpen, BriefcaseBusiness, Clock3, Menu, MessageCircle, Plus, Sparkles, Trash2, Users, X } from 'lucide-react';
import { MobileAppHeader, MobileBottomNavigation } from '@/components/nav';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Msg = { role: 'user' | 'assistant'; content: string };
type ChatHistory = { id: string; title: string; updatedAt: string; messages: Msg[] };

const historyLimit = 30;
const historyKeyPrefix = 'teacher-eric-chat-history-v1';

function isChatHistory(value: unknown): value is ChatHistory {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ChatHistory>;
  return typeof item.id === 'string'
    && typeof item.title === 'string'
    && typeof item.updatedAt === 'string'
    && Array.isArray(item.messages)
    && item.messages.every((message) => message
      && (message.role === 'user' || message.role === 'assistant')
      && typeof message.content === 'string');
}

const suggestions = [
  { title: 'Conversação diária', text: "Let's practise a conversation about my day.", icon: MessageCircle },
  { title: 'Corrigir o meu inglês', text: 'I am learning English since two months. Can you correct this sentence and explain why?', icon: BookOpen },
  { title: 'Vocabulário para o trabalho', text: 'Teach me five useful English words for work, with simple examples.', icon: BriefcaseBusiness },
  { title: 'Preparar uma entrevista', text: 'Help me practise answering common job interview questions in English.', icon: Users },
];

export default function Chatbot() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState('');
  const [storageKey, setStorageKey] = useState('');
  const [historyReady, setHistoryReady] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw new Error(`Não foi possível associar o histórico à tua conta: ${error.message}`);
        const key = `${historyKeyPrefix}:${session?.user.id || 'guest'}`;
        if (cancelled) return;
        setStorageKey(key);
        const saved = localStorage.getItem(key);
        const parsed: unknown = saved ? JSON.parse(saved) : [];
        const validHistories = Array.isArray(parsed) ? parsed.filter(isChatHistory).slice(0, historyLimit) : [];
        setHistories(validHistories);
      } catch (error) {
        if (cancelled) return;
        setNotice(error instanceof Error ? error.message : 'Não foi possível carregar o histórico guardado neste dispositivo.');
      } finally {
        if (!cancelled) setHistoryReady(true);
      }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, [supabase]);

  useEffect(() => {
    if (!historyReady || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(histories));
    } catch {
      setNotice('Não foi possível guardar o histórico neste dispositivo. Verifica o espaço disponível no navegador.');
    }
  }, [histories, historyReady, storageKey]);

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
    const conversationId = activeHistoryId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    saveHistory(conversationId, next);
    setMessages(next);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = '32px';
    setNotice('');
    setHistoryOpen(false);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível obter uma resposta.');
      if (typeof data.reply !== 'string') throw new Error('O chatbot devolveu uma resposta inválida. Tenta novamente.');
      const withReply = [...next, { role: 'assistant' as const, content: data.reply }];
      setMessages(withReply);
      saveHistory(conversationId, withReply);
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
    setActiveHistoryId('');
    setInput('');
    if (inputRef.current) inputRef.current.style.height = '32px';
    setNotice('');
    setHistoryOpen(false);
  }

  function saveHistory(id: string, conversationMessages: Msg[]) {
    const firstUserMessage = conversationMessages.find((message) => message.role === 'user')?.content || 'Nova conversa';
    const record: ChatHistory = {
      id,
      title: firstUserMessage.length > 52 ? `${firstUserMessage.slice(0, 49).trimEnd()}…` : firstUserMessage,
      updatedAt: new Date().toISOString(),
      messages: conversationMessages,
    };
    setActiveHistoryId(id);
    setHistories((current) => [record, ...current.filter((item) => item.id !== id)].slice(0, historyLimit));
  }

  function openHistory(history: ChatHistory) {
    setActiveHistoryId(history.id);
    setMessages(history.messages);
    setInput('');
    setNotice('');
    setHistoryOpen(false);
  }

  function deleteHistory(id: string) {
    setHistories((current) => current.filter((history) => history.id !== id));
    if (activeHistoryId === id) {
      setMessages([]);
      setActiveHistoryId('');
    }
  }

  return (
    <div className="chat-app">
      <MobileAppHeader />
      {historyOpen && <button className="chat-backdrop" type="button" aria-label="Fechar histórico" onClick={() => setHistoryOpen(false)} />}
      <aside className={`chat-sidebar${historyOpen ? ' is-open' : ''}`} aria-label="Histórico de conversas">
        <Link className="chat-brand" href="/comunidade">
          <span className="chat-brand-mark">TE</span>
          <span>Teacher Eric<small>AI Coach</small></span>
        </Link>
        <button className="chat-new-button" type="button" onClick={startNewChat} disabled={busy}>
          <Plus size={18} strokeWidth={1.8} /> Nova conversa
        </button>
        <p className="chat-nav-label">Histórico</p>
        <div className="chat-history-list">
          {!historyReady ? <p className="chat-history-empty" role="status">A carregar histórico…</p> : histories.length === 0 ? <p className="chat-history-empty">As conversas que iniciares ficam guardadas neste dispositivo.</p> : histories.map((history) => (
            <div className={`chat-history-item${history.id === activeHistoryId ? ' is-active' : ''}`} key={history.id}>
              <button className="chat-history-open" type="button" onClick={() => openHistory(history)} title={history.title} disabled={busy}>
                <Clock3 size={16} /><span>{history.title}</span>
              </button>
              <button className="chat-history-delete" type="button" aria-label={`Apagar conversa: ${history.title}`} onClick={() => deleteHistory(history.id)} disabled={busy}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div className="chat-sidebar-bottom">
          <p>Practice makes progress.</p>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-topbar">
          <strong>Teacher Eric AI Coach</strong>
          <span className="chat-ready"><i /> pronto</span>
          <button className="chat-menu-button" type="button" onClick={() => setHistoryOpen((open) => !open)} aria-label={historyOpen ? 'Fechar histórico' : 'Ver histórico de conversas'} aria-expanded={historyOpen}>
            {historyOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          </button>
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
