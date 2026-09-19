-- Usernames are application handles, not personal email addresses.
create table public.student_usernames (
  student_id uuid primary key,
  student_role text not null default 'student' check(student_role='student'),
  username text not null unique check(username ~ '^[a-z][a-z0-9_]{3,23}$'),
  foreign key(student_id,student_role) references public.accounts(id,role) on delete cascade
);
alter table public.student_usernames enable row level security;
revoke all on public.student_usernames from public,anon,authenticated;
grant select on public.student_usernames to authenticated;
grant all on public.student_usernames to service_role;
create policy usernames_read on public.student_usernames for select to authenticated
  using(codelah_private.can_read_student(student_id));

create function public.can_manage_student(target uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select coalesce(codelah_private.active_role() in ('admin','parent','teacher')
    and codelah_private.can_read_student(target)
    and exists(select 1 from public.accounts where id=target and role='student' and status='active'),false)
$$;
revoke all on function public.can_manage_student(uuid) from public,anon;
grant execute on function public.can_manage_student(uuid) to authenticated;

-- Shared across app instances; unknown and real identifiers use the same limits.
create table codelah_private.login_attempts (
  identity_hash text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
revoke all on codelah_private.login_attempts from public,anon,authenticated;
create function public.consume_sign_in_attempt(identifier text) returns boolean
language plpgsql security definer set search_path='' as $$
declare allowed boolean;
begin
  if identifier is null or length(identifier)>254 or length(identifier)<1 then return false; end if;
  delete from codelah_private.login_attempts where expires_at<now();
  insert into codelah_private.login_attempts(identity_hash,attempts,expires_at)
    values(md5(lower(trim(identifier))),1,now()+interval '10 minutes')
    on conflict(identity_hash) do update set attempts=codelah_private.login_attempts.attempts+1
    returning attempts<=10 into allowed;
  return allowed;
end;
$$;
revoke all on function public.consume_sign_in_attempt(text) from public;
grant execute on function public.consume_sign_in_attempt(text) to anon,authenticated;

-- A privileged, one-use bootstrap reservation. Configure its email separately.
create table codelah_private.admin_bootstrap (
  singleton boolean primary key default true check(singleton),
  email text not null,
  consumed_by uuid,
  consumed_at timestamptz
);
revoke all on codelah_private.admin_bootstrap from public,anon,authenticated;
create function codelah_private.claim_initial_admin() returns trigger
language plpgsql security definer set search_path='' as $$
declare reservation codelah_private.admin_bootstrap%rowtype;
begin
  if new.email_confirmed_at is null then return new; end if;
  select * into reservation from codelah_private.admin_bootstrap
    where singleton and consumed_at is null for update;
  if found and lower(new.email)=lower(reservation.email) then
    update public.accounts set role='admin',status='active',display_name='CodeLah administrator'
      where id=new.id and role='pending' and status='pending';
    if found then
      update codelah_private.admin_bootstrap set consumed_by=new.id,consumed_at=now() where singleton;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function codelah_private.claim_initial_admin() from public,anon,authenticated;
-- Alphabetical ordering ensures the account-created trigger runs first on INSERT.
create trigger codelah_initial_admin_verified after insert or update of email_confirmed_at on auth.users
for each row execute function codelah_private.claim_initial_admin();
