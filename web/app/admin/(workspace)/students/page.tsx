import Link from 'next/link';
import { adminData } from '@/lib/admin';
import {
  AdminHeading,
  AdminNotice,
  Status,
  Empty,
  AccessForm,
  ReturnTo,
} from '@/components/admin/ui';
export default async function Students({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const [{ people, usernames, enrolments, classes }, { message }] =
    await Promise.all([adminData(), searchParams]);
  const students = people.filter((p) => p.role === 'student');
  return (
    <>
      <AdminHeading
        title="Students"
        description="Student accounts, usernames, and password help."
        action={{ href: '/admin/students/new', label: '+ Create student' }}
      />
      <AdminNotice message={message} />
      <section className="panel">
        <div className="admin-section-heading">
          <h2>Student directory</h2>
          <span className="muted">{students.length} students</span>
        </div>
        {!students.length ? (
          <Empty>
            No students yet. Create your first student account to get started.
          </Empty>
        ) : (
          <ul className="admin-directory">
            {students.map((s) => (
              <li key={s.id}>
                <div className="admin-record">
                  <div className="admin-avatar" aria-hidden="true">
                    {s.display_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3>{s.display_name}</h3>
                    <p className="account-meta">
                      {usernames.find((u) => u.student_id === s.id)?.username ??
                        'Username pending'}
                    </p>
                  </div>
                  <Status value={s.status} />
                </div>
                <p className="muted admin-record-context">
                  {enrolments
                    .filter((e) => e.student_id === s.id && e.active)
                    .map(
                      (e) => classes.find((c) => c.id === e.classroom_id)?.name,
                    )
                    .filter(Boolean)
                    .join(' · ') || 'Not enrolled in a class yet'}
                </p>
                <div className="admin-record-actions">
                  <details>
                    <summary>Edit account</summary>
                    <AccessForm person={s} student returnTo="/admin/students" />
                  </details>
                  {s.status === 'active' && (
                    <details>
                      <summary>Reset password</summary>
                      <form
                        className="account-form"
                        action="/dashboard/student-password"
                        method="post"
                      >
                        <ReturnTo path="/admin/students" />
                        <input type="hidden" name="student_id" value={s.id} />
                        <label>
                          New password
                          <input
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            minLength={12}
                            maxLength={128}
                            required
                          />
                        </label>
                        <p className="muted">
                          This replaces the current password. Share it privately
                          with the student.
                        </p>
                        <button className="button">
                          Change student password
                        </button>
                      </form>
                    </details>
                  )}
                  <Link href="/admin/classes">Manage enrolment →</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
