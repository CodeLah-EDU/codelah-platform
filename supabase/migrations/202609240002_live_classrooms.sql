-- Phase 4. Private provider rooms linked one-to-one with scheduled lessons.
create table public.lesson_video_rooms (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  provider text not null default 'daily' check (provider='daily'),
  room_name text not null unique check (room_name ~ '^codelah-[0-9a-f]{32}$'),
  room_url text not null check (room_url ~ '^https://[a-z0-9-]+[.]daily[.]co/[a-zA-Z0-9_-]+$'),
  created_by uuid not null references public.accounts(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.lesson_video_rooms enable row level security;
revoke all on public.lesson_video_rooms from public,anon,authenticated;
grant select,insert,delete on public.lesson_video_rooms to authenticated,service_role;

create policy lesson_video_rooms_read on public.lesson_video_rooms for select to authenticated
  using (codelah_private.can_read_lesson(lesson_id));
create policy lesson_video_rooms_insert on public.lesson_video_rooms for insert to authenticated
  with check (codelah_private.can_manage_lesson(lesson_id));
create policy lesson_video_rooms_delete on public.lesson_video_rooms for delete to authenticated
  using (codelah_private.can_manage_lesson(lesson_id));

create function codelah_private.guard_lesson_video_room() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.created_by=auth.uid();
  if new.room_name <> 'codelah-'||replace(new.lesson_id::text,'-','') then
    raise exception 'Invalid lesson room name' using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger guard_lesson_video_room before insert on public.lesson_video_rooms
  for each row execute function codelah_private.guard_lesson_video_room();
revoke all on function codelah_private.guard_lesson_video_room() from public,anon,authenticated;
