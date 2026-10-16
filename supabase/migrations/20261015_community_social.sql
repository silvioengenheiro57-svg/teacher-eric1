-- Execute this migration in Supabase SQL Editor if the base schema is already installed.
-- It enables authenticated members to publish in the community feed.

alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check
  check (kind in ('announcement', 'lesson_link', 'resource', 'community'));

alter table public.posts enable row level security;

 drop policy if exists "admins publish posts" on public.posts;
drop policy if exists "authenticated members publish posts" on public.posts;
create policy "authenticated members publish posts"
  on public.posts for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists "admins edit posts" on public.posts;
drop policy if exists "authors edit own posts or admin" on public.posts;
create policy "authors edit own posts or admin"
  on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "admins delete posts" on public.posts;
drop policy if exists "authors delete own posts or admin" on public.posts;
create policy "authors delete own posts or admin"
  on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at);
create index if not exists reactions_post_id_idx on public.reactions (post_id);
