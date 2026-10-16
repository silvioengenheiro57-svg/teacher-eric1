-- Run this migration in the Supabase SQL Editor to enable private member messages.
create table if not exists public.direct_messages (
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

drop policy if exists "members read their direct messages" on public.direct_messages;
create policy "members read their direct messages"
  on public.direct_messages for select to authenticated
  using (
    (select auth.uid()) = sender_id
    or (select auth.uid()) = recipient_id
  );

drop policy if exists "members send their own direct messages" on public.direct_messages;
create policy "members send their own direct messages"
  on public.direct_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
  );

create index if not exists direct_messages_sender_recipient_created_idx
  on public.direct_messages (sender_id, recipient_id, created_at);
create index if not exists direct_messages_recipient_sender_created_idx
  on public.direct_messages (recipient_id, sender_id, created_at);
