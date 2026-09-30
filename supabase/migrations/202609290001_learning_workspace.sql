-- Learning workspace. Existing administrative enrolments remain unchanged.
create function codelah_private.is_teacher() returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(codelah_private.active_role() in ('teacher','admin'),false)
$$;

create table public.lesson_roster (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null,
  student_role text not null default 'student' check(student_role='student'),
  primary key(lesson_id,student_id),
  foreign key(student_id,student_role) references public.accounts(id,role) on delete cascade
);
insert into public.lesson_roster(lesson_id,student_id)
select l.id,e.student_id from public.lessons l join public.enrolments e on e.classroom_id=l.classroom_id and e.active;
create index lesson_roster_student on public.lesson_roster(student_id);

create or replace function codelah_private.can_read_student(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(codelah_private.is_admin() or
 (codelah_private.active_role()='student' and target=auth.uid()) or
 (codelah_private.active_role()='parent' and exists(select 1 from public.parent_student_links p where p.parent_id=auth.uid() and p.student_id=target and p.active)) or
 (codelah_private.active_role()='teacher' and (
 exists(select 1 from public.enrolments e where e.student_id=target and e.active and codelah_private.teaches(e.classroom_id)) or
 exists(select 1 from public.lesson_roster r join public.lessons l on l.id=r.lesson_id where r.student_id=target and codelah_private.teaches(l.classroom_id)))),false)
$$;
create function codelah_private.can_manage_student(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select codelah_private.is_teacher() and codelah_private.can_read_student(target)
$$;
create or replace function codelah_private.lesson_student(target uuid,student uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lesson_roster r join public.lessons l on l.id=r.lesson_id
 join public.classrooms c on c.id=l.classroom_id and c.active
 join public.accounts a on a.id=r.student_id and a.status='active' and a.role='student'
 where r.lesson_id=target and r.student_id=student)
$$;
create or replace function codelah_private.can_read_lesson(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(codelah_private.can_manage_lesson(target) or
 (codelah_private.active_role() in ('student','parent') and exists(
 select 1 from public.lesson_roster r where r.lesson_id=target
 and codelah_private.lesson_student(target,r.student_id) and codelah_private.can_read_student(r.student_id))),false)
$$;

create function codelah_private.guard_roster() returns trigger
language plpgsql security definer set search_path='' as $$
declare target public.lessons;
begin
 if tg_op='UPDATE' then raise exception 'Remove and reassign a student instead' using errcode='23514'; end if;
 -- Serialize per student as well as per lesson: concurrent bookings cannot overfill or overlap.
 perform 1 from public.accounts where id=new.student_id and status='active' and role='student' for update;
 if not found then raise exception 'Choose an active student' using errcode='23514'; end if;
 select * into target from public.lessons where id=new.lesson_id for update;
 if target.status<>'scheduled' or target.starts_at<=now() then raise exception 'Only future scheduled lessons accept assignments' using errcode='23514'; end if;
 if (select count(*) from public.lesson_roster where lesson_id=new.lesson_id and student_id<>new.student_id)>=4 then
 raise exception 'A class can have at most four students' using errcode='23514'; end if;
 if exists(select 1 from public.lesson_roster r join public.lessons l on l.id=r.lesson_id
 where r.student_id=new.student_id and l.id<>target.id and l.status='scheduled'
 and l.starts_at<target.ends_at and l.ends_at>target.starts_at) then
 raise exception 'This student already has a class at that time' using errcode='23514'; end if;
 return new;
end $$;
create trigger guard_roster before insert or update on public.lesson_roster for each row execute function codelah_private.guard_roster();
create function codelah_private.snapshot_roster() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.lesson_roster(lesson_id,student_id) select new.id,e.student_id from public.enrolments e
 join public.accounts a on a.id=e.student_id and a.status='active' where e.classroom_id=new.classroom_id and e.active order by e.student_id;
 return new;
end $$;
create trigger snapshot_roster after insert on public.lessons for each row execute function codelah_private.snapshot_roster();
create function codelah_private.guard_lesson_overlap() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at or new.status is distinct from old.status then
 perform 1 from public.accounts a join public.lesson_roster r on r.student_id=a.id where r.lesson_id=new.id order by a.id for update of a;
 if new.status='scheduled' and exists(select 1 from public.lesson_roster own join public.lesson_roster other on other.student_id=own.student_id
 join public.lessons l on l.id=other.lesson_id where own.lesson_id=new.id and l.id<>new.id and l.status='scheduled'
 and l.starts_at<new.ends_at and l.ends_at>new.starts_at) then raise exception 'A student already has a class at that time' using errcode='23514'; end if;
 end if;
 return new;
end $$;
create trigger guard_lesson_overlap before update on public.lessons for each row execute function codelah_private.guard_lesson_overlap();

alter table public.lesson_roster enable row level security;
grant select,insert,delete on public.lesson_roster to authenticated;
create policy roster_read on public.lesson_roster for select to authenticated using(codelah_private.can_read_lesson_student(lesson_id,student_id));
create policy roster_insert on public.lesson_roster for insert to authenticated with check(codelah_private.can_manage_lesson(lesson_id) and codelah_private.can_manage_student(student_id));
create policy roster_delete on public.lesson_roster for delete to authenticated using(codelah_private.can_manage_lesson(lesson_id) and exists(select 1 from public.lessons l where l.id=lesson_id and l.status='scheduled' and l.starts_at>now()));

-- Families are many-to-many; expose contacts only to teachers of the linked child.
create policy links_teacher_read on public.parent_student_links for select to authenticated using(active and codelah_private.can_manage_student(student_id));
create function codelah_private.can_read_parent(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.parent_student_links p where p.parent_id=target and p.active and
 (codelah_private.can_manage_student(p.student_id) or (codelah_private.active_role() in ('student','parent') and codelah_private.can_read_student(p.student_id))))
$$;
create policy parent_contact_read on public.accounts for select to authenticated using(role='parent' and codelah_private.can_read_parent(id));
create policy family_links_read on public.parent_student_links for select to authenticated using(active and codelah_private.active_role() in ('student','parent') and codelah_private.can_read_student(student_id));

create table public.courses(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 1 and 100),description text not null default '' check(length(description)<=2000));
create table public.course_levels(id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id) on delete cascade,name text not null check(length(trim(name)) between 1 and 100),position int not null check(position between 1 and 100),unique(course_id,position));
create table public.course_objectives(id uuid primary key default gen_random_uuid(),level_id uuid not null references public.course_levels(id) on delete cascade,title text not null check(length(trim(title)) between 1 and 500),position int not null default 1 check(position between 1 and 1000));
create table public.student_courses(student_id uuid not null references public.accounts(id) on delete cascade,course_id uuid not null references public.courses(id) on delete cascade,primary key(student_id,course_id));
create table public.objective_progress(student_id uuid not null references public.accounts(id) on delete cascade,objective_id uuid not null references public.course_objectives(id) on delete cascade,completed_at timestamptz not null default now(),primary key(student_id,objective_id));
create table public.student_profiles(student_id uuid primary key references public.accounts(id) on delete cascade,school text not null default '' check(length(school)<=200),school_year text not null default '' check(length(school_year)<=100),phone text not null default '' check(length(phone)<=40),notes text not null default '' check(length(notes)<=5000));
create table public.student_payments(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.accounts(id) on delete cascade,description text not null check(length(trim(description)) between 1 and 200),amount_cents int not null check(amount_cents between 0 and 100000000),due_on date not null,status text not null check(status in ('pending','paid','waived')),paid_on date,check((status='paid' and paid_on is not null) or (status<>'paid' and paid_on is null)));
create table public.lesson_comments(id uuid primary key default gen_random_uuid(),lesson_id uuid not null references public.lessons(id) on delete cascade,student_id uuid not null references public.accounts(id) on delete cascade,body text not null check(length(trim(body)) between 1 and 5000),created_at timestamptz not null default now());

create table public.worksheets(id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title)) between 1 and 160),description text not null default '' check(length(description)<=2000),tags text[] not null default '{}' check(cardinality(tags)<=12),course_id uuid references public.courses(id) on delete set null,level_id uuid references public.course_levels(id) on delete set null,visibility text not null default 'locked' check(visibility in ('unlocked','locked','restricted')),created_at timestamptz not null default now());
create table public.worksheet_assignments(worksheet_id uuid not null references public.worksheets(id) on delete cascade,student_id uuid not null references public.accounts(id) on delete cascade,primary key(worksheet_id,student_id));
-- Content pointers live separately: locked metadata queries cannot disclose them.
create table public.worksheet_assets(worksheet_id uuid primary key references public.worksheets(id) on delete cascade,storage_path text not null unique,file_name text not null check(length(file_name) between 1 and 180),size_bytes bigint not null check(size_bytes between 1 and 10485760),mime_type text not null,check(storage_path like worksheet_id::text||'/%' and storage_path not like '%..%'));
create function codelah_private.can_open_worksheet(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(codelah_private.is_teacher() or exists(select 1 from public.worksheets w where w.id=target
 and codelah_private.active_role() in ('student','parent') and (w.visibility='unlocked' or
 (w.visibility='locked' and exists(select 1 from public.worksheet_assignments a where a.worksheet_id=w.id and codelah_private.can_read_student(a.student_id))))),false)
$$;

do $$ declare t text; begin
 foreach t in array array['courses','course_levels','course_objectives'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy curriculum_read on public.%I for select to authenticated using(codelah_private.active_role() in (''student'',''parent'',''teacher'',''admin''))',t);
 execute format('create policy curriculum_manage on public.%I for all to authenticated using(codelah_private.is_teacher()) with check(codelah_private.is_teacher())',t);
 end loop;
 foreach t in array array['student_courses','objective_progress','student_profiles','student_payments','worksheet_assignments'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy student_read on public.%I for select to authenticated using(codelah_private.can_read_student(student_id))',t);
 execute format('create policy teacher_manage on public.%I for all to authenticated using(codelah_private.can_manage_student(student_id)) with check(codelah_private.can_manage_student(student_id))',t);
 end loop;
end $$;
alter table public.worksheets enable row level security;
alter table public.worksheet_assets enable row level security;
alter table public.lesson_comments enable row level security;
grant select,insert,update,delete on public.worksheets,public.worksheet_assets,public.lesson_comments to authenticated;
create policy worksheets_read on public.worksheets for select to authenticated using(codelah_private.is_teacher() or (codelah_private.active_role() in ('student','parent') and visibility<>'restricted'));
create policy worksheets_manage on public.worksheets for all to authenticated using(codelah_private.is_teacher()) with check(codelah_private.is_teacher());
create policy worksheet_assets_read on public.worksheet_assets for select to authenticated using(codelah_private.can_open_worksheet(worksheet_id));
create policy worksheet_assets_manage on public.worksheet_assets for all to authenticated using(codelah_private.is_teacher()) with check(codelah_private.is_teacher());
create policy comments_read on public.lesson_comments for select to authenticated using(codelah_private.can_read_lesson_student(lesson_id,student_id));
create policy comments_student on public.lesson_comments for all to authenticated using(codelah_private.active_role()='student' and student_id=auth.uid() and codelah_private.can_read_lesson_student(lesson_id,student_id)) with check(codelah_private.active_role()='student' and student_id=auth.uid() and codelah_private.can_read_lesson_student(lesson_id,student_id));

-- Allow explicit withdrawal of a published report when a teacher deletes feedback.
create function codelah_private.withdraw_report() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.lesson_reports where lesson_id=old.lesson_id and student_id=old.student_id; return old; end $$;
create trigger withdraw_report after delete on public.lesson_feedback for each row execute function codelah_private.withdraw_report();

create function public.update_student_name(student uuid,full_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not codelah_private.can_manage_student(student) then raise exception 'Student access denied' using errcode='42501'; end if;
 update public.accounts set display_name=trim(full_name) where id=student and role='student';
end $$;
revoke all on function public.update_student_name(uuid,text) from public,anon;
grant execute on function public.update_student_name(uuid,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit) values('worksheet-library','worksheet-library',false,10485760);
create policy worksheet_storage_read on storage.objects for select to authenticated using(bucket_id='worksheet-library' and codelah_private.can_open_worksheet(codelah_private.file_lesson(name)));
create policy worksheet_storage_insert on storage.objects for insert to authenticated with check(bucket_id='worksheet-library' and codelah_private.is_teacher() and exists(select 1 from public.worksheets w where w.id=codelah_private.file_lesson(name)));
create policy worksheet_storage_delete on storage.objects for delete to authenticated using(bucket_id='worksheet-library' and codelah_private.is_teacher());

revoke all on function codelah_private.is_teacher(),codelah_private.can_manage_student(uuid),codelah_private.can_read_parent(uuid),codelah_private.can_open_worksheet(uuid),codelah_private.guard_roster(),codelah_private.snapshot_roster(),codelah_private.guard_lesson_overlap(),codelah_private.withdraw_report() from public,anon,authenticated;
grant execute on function codelah_private.is_teacher(),codelah_private.can_manage_student(uuid),codelah_private.can_read_parent(uuid),codelah_private.can_open_worksheet(uuid) to authenticated;
grant all on public.lesson_roster,public.courses,public.course_levels,public.course_objectives,public.student_courses,public.objective_progress,public.student_profiles,public.student_payments,public.lesson_comments,public.worksheets,public.worksheet_assets,public.worksheet_assignments to service_role;

-- Maintain relational correctness even for direct REST clients.
create function codelah_private.guard_workspace_student() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.accounts where id=new.student_id and role='student') then
 raise exception 'Choose a student account' using errcode='23514'; end if;
 if tg_table_name='objective_progress' then
   if not exists(select 1 from public.course_objectives o join public.course_levels l on l.id=o.level_id
     join public.student_courses sc on sc.course_id=l.course_id and sc.student_id=new.student_id where o.id=new.objective_id) then
     raise exception 'Assign the objective course to this student first' using errcode='23514'; end if;
   new.completed_at=now();
 elsif tg_table_name='lesson_comments' and tg_op='UPDATE' then
   if new.student_id<>old.student_id or new.lesson_id<>old.lesson_id or new.created_at<>old.created_at then
   raise exception 'A note cannot move to another class or author' using errcode='23514'; end if;
 end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['student_courses','objective_progress','student_profiles','student_payments','worksheet_assignments','lesson_comments'] loop
 execute format('create trigger guard_workspace_student before insert or update on public.%I for each row execute function codelah_private.guard_workspace_student()',t);
 end loop;
end $$;
create function codelah_private.guard_worksheet_metadata() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.course_id is null then new.level_id=null; end if;
 if new.level_id is not null and not exists(select 1 from public.course_levels l where l.id=new.level_id and l.course_id=new.course_id) then
 raise exception 'Choose a level from the selected course' using errcode='23514'; end if;
 if exists(select 1 from unnest(new.tags) tag where tag is null or length(trim(tag)) not between 1 and 40) then
 raise exception 'Tags must have between 1 and 40 characters' using errcode='23514'; end if;
 return new;
end $$;
create trigger guard_worksheet_metadata before insert or update on public.worksheets for each row execute function codelah_private.guard_worksheet_metadata();
revoke all on function codelah_private.guard_workspace_student(),codelah_private.guard_worksheet_metadata() from public,anon,authenticated;
