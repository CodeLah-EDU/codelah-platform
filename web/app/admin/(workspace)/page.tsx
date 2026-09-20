import Link from 'next/link';
import { adminData } from '@/lib/admin';
import { AdminHeading, AdminNotice } from '@/components/admin/ui';
export default async function AdminOverview({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const [{ people, classes, enrolments }, { message }] = await Promise.all([
    adminData(),
    searchParams,
  ]);
  const students = people.filter((p) => p.role === 'student');
  const pending = people.filter((p) => p.role === 'pending');
  return (
    <>
      <AdminHeading
        title="Overview"
        description="Manage the people and classes at CodeLah."
      />
      <AdminNotice message={message} />
      <div className="admin-metrics">
        <Link href="/admin/students">
          <span>Students</span>
          <strong>{students.length}</strong>
          <small>View student accounts →</small>
        </Link>
        <Link href="/admin/classes">
          <span>Active classes</span>
          <strong>{classes.filter((c) => c.active).length}</strong>
          <small>Manage class rosters →</small>
        </Link>
        <Link href="/admin/adults">
          <span>Account requests</span>
          <strong>{pending.length}</strong>
          <small>Review account access →</small>
        </Link>
      </div>
      <section className="panel">
        <div className="admin-section-heading">
          <h2>Set up your teaching community</h2>
        </div>
        <div className="admin-actions">
          <Link href="/admin/students/new">
            <span className="admin-step">01</span>
            <div>
              <h3>Create a student</h3>
              <p>Add their name, username, and initial password.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/admin/classes/new">
            <span className="admin-step">02</span>
            <div>
              <h3>Create a class</h3>
              <p>Give the class a name, then enrol up to four students.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/admin/adults">
            <span className="admin-step">03</span>
            <div>
              <h3>Review account requests</h3>
              <p>Assign access after adults verify their accounts.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/admin/relationships">
            <span className="admin-step">04</span>
            <div>
              <h3>Link a parent</h3>
              <p>Connect a parent to the student they support.</p>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <p className="muted">
        {enrolments.filter((e) => e.active).length} active student enrolment
        {enrolments.filter((e) => e.active).length === 1 ? '' : 's'} across your
        classes.
      </p>
    </>
  );
}
