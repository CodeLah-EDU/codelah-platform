import Link from 'next/link';
import { requireAdministrator } from '@/lib/admin';
import { AdminHeading, AdminNotice, ReturnTo } from '@/components/admin/ui';
export default async function NewClass({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  await requireAdministrator();
  const { message } = await searchParams;
  return (
    <>
      <Link className="admin-back" href="/admin/classes">
        ← Classes
      </Link>
      <AdminHeading
        title="Create a class"
        description="Start with a class name. Add the roster and teacher on the class page."
      />
      <AdminNotice message={message} />
      <section className="panel admin-form-panel">
        <form className="account-form" method="post" action="/dashboard/manage">
          <input type="hidden" name="action" value="classroom" />
          <ReturnTo path="/admin/classes/new" />
          <label>
            Class name
            <input
              name="name"
              required
              maxLength={100}
              placeholder="e.g. Saturday Scratch Explorers"
            />
          </label>
          <p className="muted">Each class has space for up to four students.</p>
          <div className="admin-form-actions">
            <button className="button primary">Create class</button>
            <Link href="/admin/classes">Cancel</Link>
          </div>
        </form>
      </section>
    </>
  );
}
