-- Who changed a student's password and when, so administrators can see resets made by parents.
-- Rows are written only by the student-accounts function (service role); passwords are never stored.
create table public.student_password_changes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.accounts(id) on delete cascade,
  changed_by uuid references public.accounts(id) on delete set null,
  changed_by_role text not null check (changed_by_role in ('admin','parent')),
  created_at timestamptz not null default now()
);
alter table public.student_password_changes enable row level security;
revoke all on public.student_password_changes from public,anon,authenticated;
grant select on public.student_password_changes to authenticated;
grant select,insert on public.student_password_changes to service_role;
create policy student_password_changes_read on public.student_password_changes for select to authenticated
  using (codelah_private.is_admin());
create index student_password_changes_student on public.student_password_changes(student_id, created_at desc);
