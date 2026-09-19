import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Account } from '@/lib/accounts';
export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="admin-heading">
      <div>
        <p className="eyebrow">ADMINISTRATION</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action && (
        <Link className="button primary" href={action.href}>
          {action.label}
        </Link>
      )}
    </header>
  );
}
export function AdminNotice({ message }: { message?: string }) {
  const messages: Record<string, string> = {
    saved: 'Changes saved.',
    created:
      'Student account created. You can now enrol them in a class or link a parent.',
    password: 'Student password changed. Share it privately with the student.',
    failed: 'We couldn’t save that change. Check the details and try again.',
    denied: 'You do not have permission to make that change.',
  };
  return message && messages[message] ? (
    <output className="notice">{messages[message]}</output>
  ) : null;
}
export function Status({ value }: { value: string }) {
  return (
    <span
      className={`admin-status ${value === 'active' || value === 'connected' ? 'is-active' : ''}`}
    >
      {value}
    </span>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="admin-empty">{children}</div>;
}
export function ReturnTo({ path }: { path: string }) {
  return <input type="hidden" name="return_to" value={path} />;
}
export function PeopleOptions({ people }: { people: Account[] }) {
  return (
    <>
      <option value="">Choose an account</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.display_name}
          {p.contact_email ? ` · ${p.contact_email}` : ''}
        </option>
      ))}
    </>
  );
}
export function AccessForm({
  person,
  returnTo,
  student = false,
}: {
  person: Account;
  returnTo: string;
  student?: boolean;
}) {
  return (
    <form className="account-form" method="post" action="/dashboard/manage">
      <ReturnTo path={returnTo} />
      <input type="hidden" name="action" value="account" />
      <input type="hidden" name="id" value={person.id} />
      <label>
        Display name
        <input
          name="display_name"
          defaultValue={person.display_name}
          required
          maxLength={100}
        />
      </label>
      {student ? (
        <input type="hidden" name="role" value="student" />
      ) : (
        <label>
          Role
          <select name="role" defaultValue={person.role}>
            <option value="pending">Pending assignment</option>
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
          </select>
        </label>
      )}
      <label>
        Account status
        <select name="status" defaultValue={person.status}>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </label>
      <button className="button">Save account</button>
    </form>
  );
}
