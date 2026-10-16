# Comunidade do Teacher Eric — Next.js

Frontend em React com **Next.js App Router**, preparado para integrar Supabase e APIs de IA. Não depende de Vite nem de plataformas de geração de código.

## Requisitos
- Node.js 20.9+ (recomendado Node.js LTS)
- Projeto Supabase
- Chave OpenAI apenas se fores ativar o chatbot

## Instalação (Windows / PowerShell)
1. Extrai o ZIP.
2. Abre a pasta que contém `package.json` no VS Code.
3. Executa:

```powershell
npm install
Copy-Item .env.example .env.local
```

4. Edita `.env.local` e preenche `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e, se necessário, `OPENAI_API_KEY`.
5. Arranca o servidor:

```powershell
npm run dev
```

6. Abre `http://localhost:3000`.

## Rotas
- `/` landing page
- `/entrar` login e registo reais via Supabase Auth
- `/aluno` dashboard demonstrativo
- `/comunidade` feed de publicações, gostos e comentários via Supabase
- `/chatbot` interface de tutor e endpoint de servidor `/api/chat`
- `/perfil` edição do perfil do aluno e cartão de membro da comunidade
- `/admin` painel inicial; **a proteção de papel admin ainda deve ser implementada antes de produção**

## Supabase
`supabase/schema.sql` é um esquema inicial para uma base de dados nova. **Não o executes cegamente numa base de dados existente.** Faz primeiro backup e compara tabelas/políticas. Promove administradores manualmente por um procedimento seguro; nunca permitas que o utilizador escolha `role=admin` no registo.

O browser usa apenas a chave pública/anon do Supabase, protegida por RLS. Nunca coloques a `service_role` key no frontend.

Para permitir fotografias de perfil, executa também `supabase/migrations/20261015_profile_avatars.sql` no SQL Editor do Supabase. A migration cria o bucket público `avatars` (JPG, PNG e WebP até 5 MB) e limita carregamentos/alterações aos ficheiros do próprio membro.

## Estado real e limitações
- Login/registo usam Supabase Auth se as variáveis estiverem configuradas.
- A API de chatbot usa `OPENAI_API_KEY` no servidor e devolve JSON; não grava ainda o histórico na base de dados e precisa de autenticação/rate limiting antes de produção.
- Dashboard e administração ainda apresentam conteúdo demonstrativo; confirma as políticas RLS do feed e dos perfis antes de produção.
- Confirma as permissões, os limites de custos da API, validação e rate limiting antes de disponibilizar publicamente.
