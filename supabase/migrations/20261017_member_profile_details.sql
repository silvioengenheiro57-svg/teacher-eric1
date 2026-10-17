-- Add professional and community-role details to public member profiles.
alter table public.profiles
  add column if not exists member_type text not null default 'student',
  add column if not exists profession text not null default '',
  add column if not exists center_name text not null default '',
  add column if not exists experience text not null default '';

alter table public.profiles
  drop constraint if exists profiles_member_type_check;

alter table public.profiles
  add constraint profiles_member_type_check
  check (member_type in ('student', 'teacher'));

grant update (member_type, profession, center_name, experience)
  on public.profiles to authenticated;
