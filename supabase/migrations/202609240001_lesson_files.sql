-- Phase 3. Private worksheet and student-submission files.
create table public.lesson_files (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  kind text not null check (kind in ('material','submission')),
  student_id uuid,
  student_role text,
  storage_path text not null unique check (length(storage_path) between 1 and 500),
  file_name text not null check (length(trim(file_name)) between 1 and 180),
  mime_type text not null check (length(mime_type) between 1 and 120),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_by uuid not null references public.accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (kind='material' and student_id is null and student_role is null) or
    (kind='submission' and student_id is not null and student_role='student')
  ),
  foreign key(student_id,student_role) references public.accounts(id,role) on delete cascade
);
create index lesson_files_lesson on public.lesson_files(lesson_id,kind);
create index lesson_files_student on public.lesson_files(student_id) where student_id is not null;

alter table public.lesson_files enable row level security;
revoke all on public.lesson_files from public, anon, authenticated;
grant select,insert,delete on public.lesson_files to authenticated,service_role;

create policy lesson_files_read on public.lesson_files for select to authenticated using (
  (kind='material' and codelah_private.can_read_lesson(lesson_id)) or
  (kind='submission' and codelah_private.can_read_lesson_student(lesson_id,student_id))
);
create policy lesson_files_insert on public.lesson_files for insert to authenticated with check (
  (kind='material' and student_id is null and codelah_private.can_manage_lesson(lesson_id)) or
  (kind='submission' and student_id=(select auth.uid())
    and codelah_private.active_role()='student'
    and codelah_private.lesson_student(lesson_id,student_id))
);
create policy lesson_files_delete on public.lesson_files for delete to authenticated using (
  (kind='material' and codelah_private.can_manage_lesson(lesson_id)) or
  (kind='submission' and (codelah_private.can_manage_lesson(lesson_id)
    or (student_id=(select auth.uid()) and codelah_private.active_role()='student')))
);

create function codelah_private.guard_lesson_file() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.created_by=auth.uid();
  if new.kind='material' then
    if new.storage_path not like new.lesson_id::text||'/materials/%' then
      raise exception 'Invalid material path' using errcode='23514';
    end if;
  elsif new.storage_path not like new.lesson_id::text||'/submissions/'||new.student_id::text||'/%' then
    raise exception 'Invalid submission path' using errcode='23514';
  end if;
  if new.storage_path like '%..%' or new.storage_path ~ '[[:space:]]' then
    raise exception 'Invalid storage path' using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger guard_lesson_file before insert on public.lesson_files
  for each row execute function codelah_private.guard_lesson_file();
revoke all on function codelah_private.guard_lesson_file() from public,anon,authenticated;

create function codelah_private.file_lesson(target text) returns uuid
language plpgsql immutable set search_path='' as $$
begin
  return split_part(target,'/',1)::uuid;
exception when invalid_text_representation then return null;
end;
$$;
create function codelah_private.file_student(target text) returns uuid
language plpgsql immutable set search_path='' as $$
begin
  return split_part(target,'/',3)::uuid;
exception when invalid_text_representation then return null;
end;
$$;
revoke all on function codelah_private.file_lesson(text),codelah_private.file_student(text)
  from public,anon,authenticated;
grant execute on function codelah_private.file_lesson(text),codelah_private.file_student(text)
  to authenticated;

-- A private bucket. The publishable client can only operate through the policies below.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lesson-files','lesson-files',false,10485760,array[
  'application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv',
  'application/json','application/zip','application/x-zip-compressed',
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy codelah_lesson_file_read on storage.objects for select to authenticated using (
  bucket_id='lesson-files' and (
    (split_part(name,'/',2)='materials'
      and codelah_private.can_read_lesson(codelah_private.file_lesson(name))) or
    (split_part(name,'/',2)='submissions'
      and codelah_private.can_read_lesson_student(
        codelah_private.file_lesson(name),codelah_private.file_student(name)))
  )
);
create policy codelah_lesson_file_upload on storage.objects for insert to authenticated with check (
  bucket_id='lesson-files' and (
    (split_part(name,'/',2)='materials'
      and codelah_private.can_manage_lesson(codelah_private.file_lesson(name))) or
    (split_part(name,'/',2)='submissions'
      and codelah_private.file_student(name)=(select auth.uid())
      and codelah_private.active_role()='student'
      and codelah_private.lesson_student(
        codelah_private.file_lesson(name),codelah_private.file_student(name)))
  )
);
create policy codelah_lesson_file_delete on storage.objects for delete to authenticated using (
  bucket_id='lesson-files' and (
    (split_part(name,'/',2)='materials'
      and codelah_private.can_manage_lesson(codelah_private.file_lesson(name))) or
    (split_part(name,'/',2)='submissions' and (
      codelah_private.can_manage_lesson(codelah_private.file_lesson(name)) or
      (codelah_private.file_student(name)=(select auth.uid())
        and codelah_private.active_role()='student')))
  )
);
