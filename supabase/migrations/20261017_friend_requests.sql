-- Friend requests and accepted friendships. Each pair can have one request row.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint friend_requests_not_self check (requester_id <> recipient_id)
);

create unique index if not exists friend_requests_unique_pair_idx
  on public.friend_requests (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index if not exists friend_requests_recipient_status_idx
  on public.friend_requests (recipient_id, status, created_at desc);
create index if not exists friend_requests_requester_status_idx
  on public.friend_requests (requester_id, status, created_at desc);

alter table public.friend_requests enable row level security;
revoke all on public.friend_requests from anon, authenticated;
grant select, insert, delete on public.friend_requests to authenticated;
grant update (status) on public.friend_requests to authenticated;

drop policy if exists "members read their own friend requests" on public.friend_requests;
create policy "members read their own friend requests"
  on public.friend_requests for select to authenticated
  using (
    requester_id = (select auth.uid())
    or recipient_id = (select auth.uid())
  );

drop policy if exists "members send their own friend requests" on public.friend_requests;
create policy "members send their own friend requests"
  on public.friend_requests for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
    and status = 'pending'
  );

drop policy if exists "recipients respond to pending friend requests" on public.friend_requests;
create policy "recipients respond to pending friend requests"
  on public.friend_requests for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    recipient_id = (select auth.uid())
    and status in ('accepted', 'declined')
  );

drop policy if exists "members cancel or remove their friendships" on public.friend_requests;
create policy "members cancel or remove their friendships"
  on public.friend_requests for delete to authenticated
  using (
    (requester_id = (select auth.uid()) and status = 'pending')
    or (
      (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()))
      and status in ('accepted', 'declined')
    )
  );
