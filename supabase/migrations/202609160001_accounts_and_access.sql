-- Phase 2. Supabase Auth owns credentials; these records own teaching access.
create schema codelah_private;
revoke all on schema codelah_private from public, anon;
grant usage on schema codelah_private to authenticated, service_role;

create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  role text not null default 'pending' check (role in ('pending','student','parent','teacher','admin')),
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now(),
  unique(id, role)
);
create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.parent_student_links (
  parent_id uuid not null,
  student_id uuid not null,
  parent_role text not null default 'parent' check (parent_role = 'parent'),
  student_role text not null default 'student' check (student_role = 'student'),
  active boolean not null default true,
  primary key (parent_id,student_id),
  foreign key (parent_id,parent_role) references public.accounts(id,role) on delete cascade,
  foreign key (student_id,student_role) references public.accounts(id,role) on delete cascade
);
create table public.teacher_assignments (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null,
  teacher_role text not null default 'teacher' check (teacher_role = 'teacher'),
  active boolean not null default true,
  primary key (classroom_id,teacher_id),
  foreign key (teacher_id,teacher_role) references public.accounts(id,role) on delete cascade
);
create table public.enrolments (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null,
  student_role text not null default 'student' check (student_role = 'student'),
  active boolean not null default true,
  primary key (classroom_id,student_id),
  foreign key (student_id,student_role) references public.accounts(id,role) on delete cascade
);
create index parent_links_student on public.parent_student_links(student_id);
create index teacher_assignments_teacher on public.teacher_assignments(teacher_id);
create index enrolments_student on public.enrolments(student_id);

-- Private helpers bypass recursive RLS lookups, never trust JWT user metadata.
create function codelah_private.active_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.accounts where id = (select auth.uid()) and status = 'active'
$$;
create function codelah_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(codelah_private.active_role() = 'admin', false)
$$;
create function codelah_private.teaches(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select codelah_private.active_role() = 'teacher' and exists (
    select 1 from public.teacher_assignments t join public.classrooms c on c.id=t.classroom_id
    where t.teacher_id=(select auth.uid()) and t.classroom_id=target and t.active and c.active)
$$;
create function codelah_private.can_read_student(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(codelah_private.is_admin() or
    (codelah_private.active_role()='student' and target=(select auth.uid())) or
    (codelah_private.active_role()='parent' and exists (
      select 1 from public.parent_student_links p
      where p.parent_id=(select auth.uid()) and p.student_id=target and p.active)) or
    (codelah_private.active_role()='teacher' and exists (
      select 1 from public.enrolments e where e.student_id=target and e.active
      and codelah_private.teaches(e.classroom_id))), false)
$$;
create function codelah_private.can_read_classroom(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(codelah_private.is_admin() or exists (
    select 1 from public.classrooms c where c.id=target and c.active and (
      codelah_private.teaches(target) or exists (
        select 1 from public.enrolments e where e.classroom_id=target and e.active
        and codelah_private.active_role() in ('student','parent')
        and codelah_private.can_read_student(e.student_id)))), false)
$$;

create function codelah_private.on_auth_user_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts(id,display_name) values (new.id,'New account');
  return new;
end;
$$;
create trigger codelah_account_created after insert on auth.users
for each row execute function codelah_private.on_auth_user_created();
-- Existing identities are unassigned; migration grants nobody a privileged role.
insert into public.accounts(id,display_name) select id,'New account' from auth.users;

-- A database lock serializes enrolment changes to a class across requests.
create function codelah_private.limit_class_size() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.active then
    perform 1 from public.classrooms where id=new.classroom_id for update;
    if (select count(*) from public.enrolments where classroom_id=new.classroom_id
        and active and student_id<>new.student_id) >= 4 then
      raise exception 'A CodeLah class has at most four active students' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger codelah_class_capacity before insert or update on public.enrolments
for each row execute function codelah_private.limit_class_size();

revoke all on all functions in schema codelah_private from public, anon, authenticated;
grant execute on function codelah_private.active_role(),codelah_private.is_admin(),
  codelah_private.teaches(uuid),codelah_private.can_read_student(uuid),
  codelah_private.can_read_classroom(uuid) to authenticated;

alter table public.accounts enable row level security;
alter table public.classrooms enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.enrolments enable row level security;
revoke all on public.accounts,public.classrooms,public.parent_student_links,
  public.teacher_assignments,public.enrolments from public,anon,authenticated;
grant select,insert,update,delete on public.accounts,public.classrooms,
  public.parent_student_links,public.teacher_assignments,public.enrolments to authenticated,service_role;

create policy accounts_read on public.accounts for select to authenticated using (
  id=(select auth.uid()) or codelah_private.is_admin() or
  (role='student' and codelah_private.can_read_student(id)));
create policy accounts_admin on public.accounts for all to authenticated
  using (codelah_private.is_admin()) with check (codelah_private.is_admin());
create policy classrooms_read on public.classrooms for select to authenticated
  using (codelah_private.can_read_classroom(id));
create policy classrooms_admin on public.classrooms for all to authenticated
  using (codelah_private.is_admin()) with check (codelah_private.is_admin());
create policy links_read on public.parent_student_links for select to authenticated using (
  active and ((parent_id=(select auth.uid()) and codelah_private.active_role()='parent') or
    (student_id=(select auth.uid()) and codelah_private.active_role()='student')));
create policy links_admin on public.parent_student_links for all to authenticated
  using (codelah_private.is_admin()) with check (codelah_private.is_admin());
create policy assignments_read on public.teacher_assignments for select to authenticated using (
  active and teacher_id=(select auth.uid()) and codelah_private.active_role()='teacher');
create policy assignments_admin on public.teacher_assignments for all to authenticated
  using (codelah_private.is_admin()) with check (codelah_private.is_admin());
create policy enrolments_read on public.enrolments for select to authenticated using (
  active and codelah_private.can_read_classroom(classroom_id) and (
    codelah_private.teaches(classroom_id) or codelah_private.can_read_student(student_id)));
create policy enrolments_admin on public.enrolments for all to authenticated
  using (codelah_private.is_admin()) with check (codelah_private.is_admin());
