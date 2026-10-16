
-- 1. Role dos membros
create type public.member_role as enum ('member', 'admin');

-- 2. Perfis
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text not null default '',
  english_level text not null default 'A1'
    check (english_level in ('A1','A2','B1','B2','C1','C2')),
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Publicações
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  body text not null check (char_length(trim(body)) between 1 and 10000),
  kind text not null default 'community'
    check (kind in ('announcement','lesson_link','resource','community')),
  status text not null default 'published'
    check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Comentários
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- 5. Reações
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'like' check (reaction = 'like'),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction)
);

-- 6. Mensagens do chatbot
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- 7. Criar perfil automaticamente após registo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 8. Verificar se o utilizador é administrador
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 9. Atualizar automaticamente updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger posts_updated_at
before update on public.posts
for each row execute procedure public.set_updated_at();

-- 10. Ativar segurança RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.chat_messages enable row level security;

-- 11. Permissões SQL: apenas as necessárias
revoke all on public.profiles, public.posts, public.comments,
  public.reactions, public.chat_messages from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, bio, english_level)
  on public.profiles to authenticated;

grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert, delete on public.reactions to authenticated;
grant select, insert on public.chat_messages to authenticated;

-- 12. Perfis: todos os membros autenticados podem consultar perfis.
create policy "profiles_select_authenticated"
on public.profiles for select to authenticated
using (true);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- 13. Publicações: todos podem publicar; só o autor ou admin edita/remove.
create policy "posts_select_published"
on public.posts for select to authenticated
using (status = 'published' or public.is_admin());

create policy "posts_insert_own"
on public.posts for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (status = 'published' or public.is_admin())
);

create policy "posts_update_own_or_admin"
on public.posts for update to authenticated
using (author_id = (select auth.uid()) or public.is_admin())
with check (author_id = (select auth.uid()) or public.is_admin());

create policy "posts_delete_own_or_admin"
on public.posts for delete to authenticated
using (author_id = (select auth.uid()) or public.is_admin());

-- 14. Comentários: apenas em publicações publicadas.
create policy "comments_select_published"
on public.comments for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and (p.status = 'published' or public.is_admin())
  )
);

create policy "comments_insert_own"
on public.comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'published'
  )
);

create policy "comments_delete_own_or_admin"
on public.comments for delete to authenticated
using (author_id = (select auth.uid()) or public.is_admin());

-- 15. Reações
create policy "reactions_select_published"
on public.reactions for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and (p.status = 'published' or public.is_admin())
  )
);

create policy "reactions_insert_own"
on public.reactions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'published'
  )
);

create policy "reactions_delete_own_or_admin"
on public.reactions for delete to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

-- 16. Chat: cada utilizador consulta o próprio histórico.
create policy "chat_select_own"
on public.chat_messages for select to authenticated
using (user_id = (select auth.uid()));

create policy "chat_insert_user_message"
on public.chat_messages for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'user'
);

-- 17. Índices
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_id_idx on public.posts (author_id);
create index comments_post_created_idx on public.comments (post_id, created_at);
create index reactions_post_id_idx on public.reactions (post_id);
create index chat_messages_user_created_idx
  on public.chat_messages (user_id, created_at);

-- 18. Mensagens privadas entre membros
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  constraint direct_messages_distinct_members check (sender_id <> recipient_id)
);

alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from anon, authenticated;
grant select, insert on public.direct_messages to authenticated;

create policy "members read their direct messages"
  on public.direct_messages for select to authenticated
  using (
    (select auth.uid()) = sender_id
    or (select auth.uid()) = recipient_id
  );

create policy "members send their own direct messages"
  on public.direct_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
  );

create index direct_messages_sender_recipient_created_idx
  on public.direct_messages (sender_id, recipient_id, created_at);
create index direct_messages_recipient_sender_created_idx
  on public.direct_messages (recipient_id, sender_id, created_at);
