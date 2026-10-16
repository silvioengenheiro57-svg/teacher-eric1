import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_OUTPUT_TOKENS = 500;

// Basic per-process protection for development/MVP. For multi-instance production,
// replace this with a shared limiter (e.g. Upstash Redis or a database-backed quota).
const requests = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

function rateLimited(userId: string) {
  const now = Date.now();
  const recent = (requests.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requests.set(userId, recent);
    return true;
  }
  recent.push(now);
  requests.set(userId, recent);
  return false;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'O chatbot ainda não está configurado. Adiciona OPENAI_API_KEY ao ficheiro .env.local e reinicia o servidor.' }, { status: 503 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Inicia sessão para utilizares o Teacher Eric AI Coach.' }, { status: 401 });
    }

    if (rateLimited(user.id)) {
      return NextResponse.json({ error: 'Atingiste o limite temporário de mensagens. Aguarda um minuto e tenta novamente.' }, { status: 429 });
    }

    const body = await request.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: `Envia entre 1 e ${MAX_MESSAGES} mensagens por pedido.` }, { status: 400 });
    }

    const messages = body.messages.map((message: unknown) => {
      if (!message || typeof message !== 'object' || !('role' in message) || !('content' in message)) {
        throw new Error('Formato de mensagem inválido.');
      }
      const item = message as { role: unknown; content: unknown };
      if ((item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') {
        throw new Error('Formato de mensagem inválido.');
      }
      const content = item.content.trim();
      if (!content || content.length > MAX_MESSAGE_LENGTH) throw new Error('Cada mensagem deve ter entre 1 e 2000 caracteres.');
      return { role: item.role, content };
    });

    // Never accept a system prompt from the browser. The teaching instructions stay server-side.
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      system: `És o Teacher Eric AI Coach, um tutor virtual de inglês integrado numa comunidade educativa. Não afirmes ser o Teacher Eric humano.
Objetivos: ajudar o aluno a praticar conversação, gramática, vocabulário, pronúncia escrita e inglês para trabalho/estudos.
Regras pedagógicas:
- Adapta a dificuldade ao nível demonstrado; se não souberes o nível, começa de forma simples.
- Incentiva o aluno a responder em inglês e faz uma pergunta de seguimento quando for útil.
- Quando houver erros, apresenta: “A tua frase”, “Forma mais natural/correta” e uma explicação breve. Não corrijas quando não for necessário.
- Usa português claro para explicar dúvidas, mas inclui exemplos em inglês.
- Para vocabulário, dá significado e um exemplo natural.
- Mantém as respostas focadas, respeitosas e normalmente abaixo de 180 palavras.
- Se a mensagem não estiver relacionada com aprendizagem ou prática de inglês, responde brevemente e orienta a conversa de volta ao inglês.
- Não peças palavras-passe, chaves API nem dados pessoais sensíveis.`,
      messages,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.5,
    });

    return NextResponse.json({ reply: result.text });
   } catch (error) {
    console.error('Teacher Eric AI Coach request failed:', error);

    const detail =
      process.env.NODE_ENV === 'development' &&
      error instanceof Error
        ? error.message
        : undefined;

    return NextResponse.json(
      {
        error: 'Não foi possível gerar uma resposta.',
        ...(detail ? { debug: detail } : {}),
      },
      { status: 500 }
    );
  }
    console.error('Teacher Eric AI Coach request failed');
    return NextResponse.json({ error: 'Não foi possível gerar uma resposta agora. Verifica a configuração da API e tenta novamente.' }, { status: 500 });
  }

