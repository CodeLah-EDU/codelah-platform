import Link from 'next/link';
import { requireAdministrator } from '@/lib/admin';
import { AdminHeading, AdminNotice, ReturnTo } from '@/components/admin/ui';
export default async function NewStudent({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  await requireAdministrator();
  const { message } = await searchParams;
  return (
    <>
      <Link className="admin-back" href="/admin/students">
        ← Students
      </Link>
      <AdminHeading
        title="Create a student"
        description="Set up a student login. You can add classes and parent links afterwards."
      />
      <AdminNotice message={message} />
      <section className="panel admin-form-panel">
        <form
          className="account-form"
          method="post"
          action="/dashboard/create-student"
        >
          <ReturnTo path="/admin/students/new" />
          <label>
            Student name
            <input
              name="display_name"
              required
              maxLength={100}
              autoComplete="off"
            />
          </label>
          <label>
            Username
            <input
              name="username"
              required
              pattern="[a-z][a-z0-9_]{3,23}"
              minLength={4}
              maxLength={24}
              autoComplete="off"
              aria-describedby="username-help"
            />
          </label>
          <p className="muted" id="username-help">
            4–24 lowercase letters, numbers, or underscores. Start with a
            letter.
          </p>
          <label>
            Initial password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              aria-describedby="password-help"
            />
          </label>
          <p className="muted" id="password-help">
            Use at least 12 characters. Share this password privately with the
            student.
          </p>
          <div className="admin-form-actions">
            <button className="button primary">Create student</button>
            <Link href="/admin/students">Cancel</Link>
          </div>
        </form>
      </section>
    </>
  );
}
