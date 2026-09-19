-- Adult contact details come from verified Auth identities, not profile forms.
alter table public.accounts add column contact_email text;
create function codelah_private.sync_contact_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.accounts set contact_email=case
    when new.email_confirmed_at is not null and new.email not like '%@students.codelah.invalid' then new.email
    else null end where id=new.id;
  return new;
end;
$$;
revoke all on function codelah_private.sync_contact_email() from public,anon,authenticated;
create trigger codelah_sync_contact after insert or update of email,email_confirmed_at on auth.users
for each row execute function codelah_private.sync_contact_email();
update public.accounts a set contact_email=u.email from auth.users u
where a.id=u.id and u.email_confirmed_at is not null and u.email not like '%@students.codelah.invalid';
