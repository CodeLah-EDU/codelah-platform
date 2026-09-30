-- Administration finances and atomic attendance registers.
create table public.admin_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null check(length(trim(description)) between 1 and 200),
  category text not null check(category in ('Teaching','Software','Marketing','Rent & utilities','Equipment','Other')),
  vendor text not null default '' check(length(vendor)<=160),
  amount_cents integer not null check(amount_cents between 0 and 100000000),
  paid_on date not null,
  reference text not null default '' check(length(reference)<=160),
  notes text not null default '' check(length(notes)<=2000)
);
alter table public.admin_expenses enable row level security;
grant select,insert,update,delete on public.admin_expenses to authenticated,service_role;
create policy admin_expenses_manage on public.admin_expenses for all to authenticated
using(codelah_private.is_admin()) with check(codelah_private.is_admin());
create index admin_expenses_paid_on on public.admin_expenses(paid_on);
create index student_payments_paid_on on public.student_payments(paid_on) where status='paid';
create index student_payments_due_on on public.student_payments(due_on) where status='pending';

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null check(action in ('INSERT','UPDATE','DELETE')),
  changed_by uuid references public.accounts(id) on delete set null,
  before_record jsonb,
  after_record jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
grant select on public.admin_audit to authenticated;
grant all on public.admin_audit to service_role;
create policy admin_audit_read on public.admin_audit for select to authenticated using(codelah_private.is_admin());
create index admin_audit_created_at on public.admin_audit(created_at desc);
create function codelah_private.audit_finance_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and to_jsonb(new)=to_jsonb(old) then return new; end if;
  insert into public.admin_audit(table_name,record_id,action,changed_by,before_record,after_record)
  values(tg_table_name,coalesce(new.id,old.id)::text,tg_op,auth.uid(),
    case when tg_op<>'INSERT' then to_jsonb(old) end,
    case when tg_op<>'DELETE' then to_jsonb(new) end);
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function codelah_private.audit_finance_change() from public,anon,authenticated;
create trigger audit_fee after insert or update or delete on public.student_payments for each row execute function codelah_private.audit_finance_change();
create trigger audit_expense after insert or update or delete on public.admin_expenses for each row execute function codelah_private.audit_finance_change();

create function public.admin_save_attendance(target uuid, entries jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare entry jsonb; lesson public.lessons; affected integer := 0;
begin
  if not codelah_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select * into lesson from public.lessons where id=target for update;
  if lesson.id is null or lesson.status='cancelled' or lesson.starts_at>now() then
    raise exception 'Attendance is available once a non-cancelled lesson starts' using errcode='23514';
  end if;
  if jsonb_typeof(entries) is distinct from 'array' or jsonb_array_length(entries) not between 1 and 4 then
    raise exception 'Choose between one and four roster entries' using errcode='23514';
  end if;
  if (select count(distinct item->>'student_id') from jsonb_array_elements(entries) item) <> jsonb_array_length(entries) then
    raise exception 'Each student may appear only once' using errcode='23514';
  end if;
  for entry in select * from jsonb_array_elements(entries) loop
    if not exists(select 1 from public.lesson_roster where lesson_id=target and student_id=(entry->>'student_id')::uuid) then
      raise exception 'The student is not on this lesson roster' using errcode='23514';
    end if;
    insert into public.lesson_attendance(lesson_id,student_id,status,note,updated_by)
    values(target,(entry->>'student_id')::uuid,entry->>'status',coalesce(entry->>'note',''),auth.uid())
    on conflict(lesson_id,student_id) do update set status=excluded.status,note=excluded.note,updated_by=auth.uid(),updated_at=now();
    affected := affected+1;
  end loop;
  return affected;
end $$;
revoke all on function public.admin_save_attendance(uuid,jsonb) from public,anon;
grant execute on function public.admin_save_attendance(uuid,jsonb) to authenticated;
