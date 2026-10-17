-- Allow members to edit their own comments while keeping ownership enforced by RLS.
grant update (body) on public.comments to authenticated;

drop policy if exists "comments_update_own_or_admin" on public.comments;
create policy "comments_update_own_or_admin"
  on public.comments for update to authenticated
  using (author_id = (select auth.uid()) or public.is_admin())
  with check (author_id = (select auth.uid()) or public.is_admin());
