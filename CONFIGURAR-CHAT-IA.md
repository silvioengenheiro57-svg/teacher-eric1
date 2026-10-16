# Configurar o Teacher Eric AI Coach

## 1. Criar o ficheiro de ambiente

Na mesma pasta onde está o `package.json`, cria um ficheiro chamado `.env.local` (não `.env.example`). Coloca nele:

```env
NEXT_PUBLIC_SUPABASE_URL=https://sobknoafgzukxfvscsbs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLOCA_A_TUA_CHAVE_PUBLICA_SUPABASE
OPENAI_API_KEY=COLOCA_A_TUA_CHAVE_SECRETA_OPENAI
OPENAI_MODEL=gpt-4o-mini
```

Substitui `COLOCA_A_TUA_CHAVE_PUBLICA_SUPABASE` pela chave pública do projeto Supabase e `COLOCA_A_TUA_CHAVE_SECRETA_OPENAI` pela chave da API OpenAI. Não envies a chave secreta por chat, não a coloques no frontend e não uses o prefixo `NEXT_PUBLIC_` para `OPENAI_API_KEY`.

## 2. Reiniciar o Next.js

Pára o servidor com `Ctrl+C` e executa:

```bash
npm install
npm run dev
```

Abre `http://localhost:3000/chatbot` e inicia sessão. O endpoint exige um utilizador autenticado no Supabase.

## 3. Se aparecer um erro

- **401**: inicia sessão e confirma se o login Supabase está funcional.
- **503**: confirma se `OPENAI_API_KEY` existe no `.env.local`; depois reinicia o servidor.
- **429**: atingiste o limite temporário de pedidos do MVP; aguarda um minuto.
- **500**: confirma que a chave OpenAI é válida, que a conta tem acesso e saldo/limite de faturação, e lê o terminal do Next.js para detalhes sem publicar a chave.

## 4. Antes de produção

O limite de pedidos incluído é em memória e serve apenas como proteção inicial para desenvolvimento/MVP. Em alojamento com várias instâncias, substitui-o por um limitador partilhado (por exemplo Redis) e cria quotas por utilizador. Configura também alertas e limites de gastos na plataforma OpenAI. Não registes conteúdo privado das conversas sem uma política de privacidade clara.
