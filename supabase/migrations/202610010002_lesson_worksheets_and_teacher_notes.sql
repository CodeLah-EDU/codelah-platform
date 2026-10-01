-- Library worksheets shared with a lesson, and a private notepad per lesson for its teacher.

-- Sharing a worksheet with a lesson works like assigning it to every student on that
-- lesson's roster. Teacher-only (restricted) worksheets cannot be shared this way.
create table public.lesson_worksheets (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lesson_id, worksheet_id)
);
alter table public.lesson_worksheets enable row level security;
revoke all on public.lesson_worksheets from public,anon,authenticated;
grant select,insert,delete on public.lesson_worksheets to authenticated;
grant all on public.lesson_worksheets to service_role;
create policy lesson_worksheets_read on public.lesson_worksheets for select to authenticated
  using (codelah_private.can_read_lesson(lesson_id));
create policy lesson_worksheets_insert on public.lesson_worksheets for insert to authenticated
  with check (codelah_private.can_manage_lesson(lesson_id) and exists(
    select 1 from public.worksheets w where w.id=worksheet_id and w.visibility<>'restricted'));
create policy lesson_worksheets_delete on public.lesson_worksheets for delete to authenticated
  using (codelah_private.can_manage_lesson(lesson_id));
create index lesson_worksheets_worksheet on public.lesson_worksheets(worksheet_id);

-- Students and parents may open a locked worksheet that was shared with one of their lessons.
create or replace function codelah_private.can_open_worksheet(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(codelah_private.is_teacher() or exists(select 1 from public.worksheets w where w.id=target
 and codelah_private.active_role() in ('student','parent') and (w.visibility='unlocked' or
 (w.visibility='locked' and (
   exists(select 1 from public.worksheet_assignments a where a.worksheet_id=w.id and codelah_private.can_read_student(a.student_id))
   or exists(select 1 from public.lesson_worksheets lw join public.lesson_roster r on r.lesson_id=lw.lesson_id
     where lw.worksheet_id=w.id and codelah_private.lesson_student(lw.lesson_id,r.student_id)
     and codelah_private.can_read_student(r.student_id)))))),false)
$$;

-- One private note per lesson. Only the lesson's teacher and administrators can read or change it.
create table public.lesson_teacher_notes (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  updated_by uuid references public.accounts(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.lesson_teacher_notes enable row level security;
revoke all on public.lesson_teacher_notes from public,anon,authenticated;
grant select,insert,update,delete on public.lesson_teacher_notes to authenticated;
grant all on public.lesson_teacher_notes to service_role;
create policy lesson_teacher_notes_manage on public.lesson_teacher_notes for all to authenticated
  using (codelah_private.can_manage_lesson(lesson_id))
  with check (codelah_private.can_manage_lesson(lesson_id));

create function codelah_private.stamp_teacher_note() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.updated_by=auth.uid();
  new.updated_at=now();
  return new;
end $$;
revoke all on function codelah_private.stamp_teacher_note() from public,anon,authenticated;
create trigger stamp_teacher_note before insert or update on public.lesson_teacher_notes
  for each row execute function codelah_private.stamp_teacher_note();
