-- Phase 3. Persistent lesson records and teaching workflow access.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  objective text not null default '' check (length(objective) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_by uuid not null references public.accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '4 hours')
);
create index lessons_classroom_time on public.lessons(classroom_id, starts_at);

create table public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  instructions text not null default '' check (length(instructions) <= 5000),
  resource_url text check (resource_url is null or length(resource_url) <= 2000),
  created_by uuid not null references public.accounts(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index lesson_materials_lesson on public.lesson_materials(lesson_id);

create table public.lesson_submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null,
  student_role text not null default 'student' check (student_role = 'student'),
  response text not null default '' check (length(response) <= 10000),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  teacher_note text check (teacher_note is null or length(teacher_note) <= 5000),
  foreign key(student_id,student_role) references public.accounts(id,role) on delete cascade,
  unique(lesson_id, student_id)
);
create index lesson_submissions_student on public.lesson_submissions(student_id);

create table public.lesson_attendance (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null,
  student_role text not null default 'student' check (student_role = 'student'),
  status text not null check (status in ('present','late','absent','excused','unmarked')),
  note text not null default '' check (length(note) <= 1000),
  updated_by uuid not null references public.accounts(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (lesson_id, student_id),
  foreign key(student_id,student_role) references public.accounts(id,role) on delete cascade
);

create table public.lesson_feedback (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null,
  student_role text not null default 'student' check (student_role = 'student'),
  topics text not null default '' check (length(topics) <= 2000),
  note text not null default '' check (length(note) <= 5000),
  practice text not null default '' check (length(practice) <= 2000),
  status text not null default 'draft' check (status in ('draft','published')),
  updated_by uuid not null references public.accounts(id) on delete restrict,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  foreign key(student_id,student_role) references public.accounts(id,role) on delete cascade,
  unique(lesson_id, student_id)
);
create index lesson_feedback_student on public.lesson_feedback(student_id, status);

create function codelah_private.can_read_lesson(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(codelah_private.is_admin() or exists (
    select 1 from public.lessons l
    where l.id = target and (
      codelah_private.teaches(l.classroom_id) or exists (
        select 1 from public.enrolments e
        where e.classroom_id = l.classroom_id and e.active
          and (e.student_id = (select auth.uid())
            or (codelah_private.active_role() = 'parent' and exists (
              select 1 from public.parent_student_links p
              where p.parent_id = (select auth.uid()) and p.student_id = e.student_id and p.active)))
      )
    )
  ), false)
$$;

create function codelah_private.can_manage_lesson(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(codelah_private.is_admin() or exists (
    select 1 from public.lessons l where l.id = target and codelah_private.teaches(l.classroom_id)
  ), false)
$$;

create function codelah_private.can_manage_classroom(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(codelah_private.is_admin() or codelah_private.teaches(target), false)
$$;

revoke all on public.lessons, public.lesson_materials, public.lesson_submissions,
  public.lesson_attendance, public.lesson_feedback from public, anon, authenticated;
grant select, insert, update, delete on public.lessons, public.lesson_materials,
  public.lesson_submissions, public.lesson_attendance, public.lesson_feedback
  to authenticated, service_role;
grant execute on function codelah_private.can_read_lesson(uuid),
  codelah_private.can_manage_lesson(uuid), codelah_private.can_manage_classroom(uuid)
  to authenticated;

alter table public.lessons enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.lesson_submissions enable row level security;
alter table public.lesson_attendance enable row level security;
alter table public.lesson_feedback enable row level security;

create policy lessons_read on public.lessons for select to authenticated
  using (codelah_private.can_read_lesson(id));
create policy lessons_manage on public.lessons for all to authenticated
  using (codelah_private.is_admin() or codelah_private.teaches(classroom_id))
  with check (codelah_private.is_admin() or codelah_private.teaches(classroom_id));

create policy materials_read on public.lesson_materials for select to authenticated
  using (codelah_private.can_read_lesson(lesson_id));
create policy materials_manage on public.lesson_materials for all to authenticated
  using (codelah_private.can_manage_lesson(lesson_id))
  with check (codelah_private.can_manage_lesson(lesson_id));

create policy submissions_read on public.lesson_submissions for select to authenticated
  using (student_id = (select auth.uid()) or codelah_private.can_manage_lesson(lesson_id)
    or (codelah_private.active_role() = 'parent' and exists (
      select 1 from public.parent_student_links p where p.parent_id = (select auth.uid())
        and p.student_id = lesson_submissions.student_id and p.active)));
create policy submissions_student_write on public.lesson_submissions for all to authenticated
  using (student_id = (select auth.uid()) and codelah_private.can_read_lesson(lesson_id))
  with check (student_id = (select auth.uid()) and codelah_private.can_read_lesson(lesson_id));
create policy submissions_teacher_update on public.lesson_submissions for update to authenticated
  using (codelah_private.can_manage_lesson(lesson_id))
  with check (codelah_private.can_manage_lesson(lesson_id));

create policy attendance_read on public.lesson_attendance for select to authenticated
  using (codelah_private.can_read_lesson(lesson_id));
create policy attendance_manage on public.lesson_attendance for all to authenticated
  using (codelah_private.can_manage_lesson(lesson_id))
  with check (codelah_private.can_manage_lesson(lesson_id));

create policy feedback_read on public.lesson_feedback for select to authenticated
  using (codelah_private.can_manage_lesson(lesson_id)
    or (status = 'published' and codelah_private.can_read_lesson(lesson_id)
      and (student_id = (select auth.uid()) or exists (
        select 1 from public.parent_student_links p where p.parent_id = (select auth.uid())
          and p.student_id = lesson_feedback.student_id and p.active))));
create policy feedback_manage on public.lesson_feedback for all to authenticated
  using (codelah_private.can_manage_lesson(lesson_id))
  with check (codelah_private.can_manage_lesson(lesson_id));

-- Protect individual learning records and publish immutable family snapshots.
-- Keep drafts in a separate table: RLS protects rows, not individual columns.
create table public.lesson_reports (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.accounts(id) on delete cascade,
  topics text not null,
  note text not null,
  practice text not null,
  published_at timestamptz not null,
  primary key (lesson_id, student_id)
);
alter table public.lesson_reports enable row level security;
revoke all on public.lesson_reports from public, anon, authenticated;
grant select on public.lesson_reports to authenticated;
grant all on public.lesson_reports to service_role;

create or replace function codelah_private.can_read_lesson(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lessons l where l.id=target
    and codelah_private.can_read_classroom(l.classroom_id))
$$;
create function codelah_private.lesson_student(target uuid, student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lessons l
    join public.classrooms c on c.id=l.classroom_id and c.active
    join public.enrolments e on e.classroom_id=l.classroom_id and e.active
    join public.accounts a on a.id=e.student_id and a.role='student' and a.status='active'
    where l.id=target and e.student_id=student)
$$;
create function codelah_private.can_read_lesson_student(target uuid, student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select codelah_private.lesson_student(target,student) and
    (codelah_private.can_manage_lesson(target) or
      (codelah_private.active_role() in ('student','parent') and codelah_private.can_read_student(student)))
$$;
revoke all on function codelah_private.can_read_lesson(uuid),
  codelah_private.can_manage_lesson(uuid), codelah_private.can_manage_classroom(uuid),
  codelah_private.lesson_student(uuid,uuid), codelah_private.can_read_lesson_student(uuid,uuid)
  from public, anon, authenticated;
grant execute on function codelah_private.can_read_lesson(uuid),
  codelah_private.can_manage_lesson(uuid), codelah_private.can_manage_classroom(uuid),
  codelah_private.lesson_student(uuid,uuid), codelah_private.can_read_lesson_student(uuid,uuid)
  to authenticated;

-- Enforce the agreed 90–120 minute class format.
alter table public.lessons add constraint lesson_duration check
  (ends_at - starts_at between interval '90 minutes' and interval '120 minutes');
alter table public.lesson_materials add constraint material_safe_url check
  (resource_url is null or resource_url ~ '^https?://[^[:space:]]+$');

drop policy submissions_read on public.lesson_submissions;
drop policy submissions_student_write on public.lesson_submissions;
drop policy submissions_teacher_update on public.lesson_submissions;
create policy submissions_read on public.lesson_submissions for select to authenticated
  using (codelah_private.can_read_lesson_student(lesson_id,student_id));
create policy submissions_student_insert on public.lesson_submissions for insert to authenticated
  with check (codelah_private.active_role()='student' and student_id=(select auth.uid())
    and codelah_private.lesson_student(lesson_id,student_id));
create policy submissions_student_update on public.lesson_submissions for update to authenticated
  using (codelah_private.active_role()='student' and student_id=(select auth.uid())
    and codelah_private.lesson_student(lesson_id,student_id))
  with check (codelah_private.active_role()='student' and student_id=(select auth.uid())
    and codelah_private.lesson_student(lesson_id,student_id));
create policy submissions_teacher_update on public.lesson_submissions for update to authenticated
  using (codelah_private.can_manage_lesson(lesson_id) and codelah_private.lesson_student(lesson_id,student_id))
  with check (codelah_private.can_manage_lesson(lesson_id) and codelah_private.lesson_student(lesson_id,student_id));

drop policy attendance_read on public.lesson_attendance;
create policy attendance_read on public.lesson_attendance for select to authenticated
  using (codelah_private.can_read_lesson_student(lesson_id,student_id));
drop policy attendance_manage on public.lesson_attendance;
create policy attendance_manage on public.lesson_attendance for all to authenticated
  using (codelah_private.can_manage_lesson(lesson_id) and codelah_private.lesson_student(lesson_id,student_id))
  with check (codelah_private.can_manage_lesson(lesson_id) and codelah_private.lesson_student(lesson_id,student_id));
drop policy feedback_read on public.lesson_feedback;
drop policy feedback_manage on public.lesson_feedback;
create policy feedback_manage on public.lesson_feedback for all to authenticated
  using (codelah_private.can_manage_lesson(lesson_id) and codelah_private.lesson_student(lesson_id,student_id))
  with check (codelah_private.can_manage_lesson(lesson_id) and codelah_private.lesson_student(lesson_id,student_id));
create policy reports_read on public.lesson_reports for select to authenticated
  using (codelah_private.can_read_lesson_student(lesson_id,student_id));

-- Direct REST calls must obey the same ownership rules as the app forms.
create function codelah_private.guard_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and (new.id<>old.id or new.lesson_id<>old.lesson_id or new.student_id<>old.student_id) then
    raise exception 'Submission identity cannot change' using errcode='42501';
  end if;
  if codelah_private.active_role()='student' then
    if tg_op='INSERT' then
      if new.teacher_note is not null or new.reviewed_at is not null then
        raise exception 'Only a teacher can review submissions' using errcode='42501';
      end if;
    elsif new.teacher_note is distinct from old.teacher_note or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Only a teacher can review submissions' using errcode='42501';
    end if;
    if exists(select 1 from public.lessons where id=new.lesson_id and status='cancelled') then raise exception 'Submissions are closed' using errcode='42501'; end if;
    if length(trim(new.response))=0 then raise exception 'A response is required' using errcode='23514'; end if;
    new.submitted_at=now();
    -- A revised response needs a fresh review.
    new.teacher_note=null; new.reviewed_at=null;
  elsif codelah_private.can_manage_lesson(new.lesson_id) then
    if tg_op='UPDATE' and (new.response is distinct from old.response or new.submitted_at is distinct from old.submitted_at) then
      raise exception 'Teachers cannot rewrite student work' using errcode='42501';
    end if;
    new.reviewed_at=now();
  end if;
  return new;
end;
$$;
create trigger guard_submission before insert or update on public.lesson_submissions
  for each row execute function codelah_private.guard_submission();

create function codelah_private.guard_lesson_author() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='INSERT' then new.created_by=auth.uid();
  elsif new.created_by<>old.created_by or new.id<>old.id then
    raise exception 'Record identity cannot change' using errcode='42501';
  end if;
  if tg_op='UPDATE' then
    if tg_table_name='lessons' then
      if new.classroom_id<>old.classroom_id then raise exception 'A lesson cannot move to another class' using errcode='42501'; end if;
    elsif tg_table_name='lesson_materials' then
      if new.lesson_id<>old.lesson_id then raise exception 'A material cannot move to another lesson' using errcode='42501'; end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_lesson_author before insert or update on public.lessons
  for each row execute function codelah_private.guard_lesson_author();
create trigger guard_material_author before insert or update on public.lesson_materials
  for each row execute function codelah_private.guard_lesson_author();

create function codelah_private.guard_lesson_record() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and (new.lesson_id<>old.lesson_id or new.student_id<>old.student_id) then
    raise exception 'Learning record identity cannot change' using errcode='42501';
  end if;
  new.updated_by=auth.uid(); new.updated_at=now();
  if tg_table_name='lesson_feedback' then
    if new.status='published' then
      if length(trim(new.note))=0 then raise exception 'Feedback is required to publish' using errcode='23514'; end if;
      new.published_at=now();
    else new.published_at=null;
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_attendance before insert or update on public.lesson_attendance
  for each row execute function codelah_private.guard_lesson_record();
create trigger guard_feedback before insert or update on public.lesson_feedback
  for each row execute function codelah_private.guard_lesson_record();
create function codelah_private.publish_lesson_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status='published' then
    insert into public.lesson_reports(lesson_id,student_id,topics,note,practice,published_at)
      values(new.lesson_id,new.student_id,new.topics,new.note,new.practice,new.published_at)
      on conflict(lesson_id,student_id) do update set topics=excluded.topics,
        note=excluded.note,practice=excluded.practice,published_at=excluded.published_at;
  end if;
  return new;
end;
$$;
create trigger publish_lesson_report after insert or update on public.lesson_feedback
  for each row execute function codelah_private.publish_lesson_report();
revoke all on function codelah_private.guard_submission(), codelah_private.guard_lesson_author(),
  codelah_private.guard_lesson_record(), codelah_private.publish_lesson_report()
  from public, anon, authenticated;

-- Preserve any reports published before this access revision.
insert into public.lesson_reports(lesson_id,student_id,topics,note,practice,published_at)
select lesson_id,student_id,topics,note,practice,coalesce(published_at,updated_at)
from public.lesson_feedback where status='published';
