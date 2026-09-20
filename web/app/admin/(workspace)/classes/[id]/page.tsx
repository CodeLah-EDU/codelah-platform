import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminData } from '@/lib/admin';
import {
  AdminHeading,
  AdminNotice,
  Empty,
  Status,
  ReturnTo,
  PeopleOptions,
} from '@/components/admin/ui';
export default async function ClassDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const [data, { id }, { message }] = await Promise.all([
    adminData(),
    params,
    searchParams,
  ]);
  const classroom = data.classes.find((c) => c.id === id);
  if (!classroom) notFound();
  const path = `/admin/classes/${id}`;
  const roster = data.enrolments.filter(
    (e) => e.classroom_id === id && e.active,
  );
  const teachers = data.assignments.filter(
    (a) => a.classroom_id === id && a.active,
  );
  const name = (id: string) =>
    data.people.find((p) => p.id === id)?.display_name ?? 'Account unavailable';
  const available = data.people.filter(
    (p) =>
      p.role === 'student' &&
      p.status === 'active' &&
      !roster.some((e) => e.student_id === p.id),
  );
  return (
    <>
      <Link className="admin-back" href="/admin/classes">
        ← Classes
      </Link>
      <AdminHeading
        title={classroom.name}
        description="Manage this class’s students and teachers."
      />
      <AdminNotice message={message} />
      <div className="admin-class-grid">
        <section className="panel">
          <div className="admin-section-heading">
            <h2>Student roster</h2>
            <Status value={`${roster.length} / 4 places`} />
          </div>
          {!roster.length ? (
            <Empty>No students enrolled yet.</Empty>
          ) : (
            <ul className="admin-directory">
              {roster.map((e) => (
                <li key={e.student_id}>
                  <div className="admin-record">
                    <strong>{name(e.student_id)}</strong>
                    <form action="/dashboard/manage" method="post">
                      <ReturnTo path={path} />
                      <input type="hidden" name="action" value="enrolment" />
                      <input type="hidden" name="classroom_id" value={id} />
                      <input
                        type="hidden"
                        name="student_id"
                        value={e.student_id}
                      />
                      <input type="hidden" name="active" value="false" />
                      <button
                        className="admin-text-button"
                        aria-label={`End enrolment for ${name(e.student_id)}`}
                      >
                        End enrolment
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {roster.length >= 4 ? (
            <p className="notice">This class is full.</p>
          ) : available.length ? (
            <form
              className="account-form"
              action="/dashboard/manage"
              method="post"
            >
              <ReturnTo path={path} />
              <input type="hidden" name="action" value="enrolment" />
              <input type="hidden" name="classroom_id" value={id} />
              <input type="hidden" name="active" value="true" />
              <label>
                Add a student
                <select name="student_id" required>
                  <PeopleOptions people={available} />
                </select>
              </label>
              <button className="button primary">Enrol student</button>
            </form>
          ) : (
            <p className="muted">
              No other active students available.{' '}
              <Link href="/admin/students/new">Create a student</Link>.
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Teachers</h2>
          {!teachers.length ? (
            <Empty>No teacher assigned yet.</Empty>
          ) : (
            <ul className="admin-directory">
              {teachers.map((a) => (
                <li key={a.teacher_id}>
                  <div className="admin-record">
                    <strong>{name(a.teacher_id)}</strong>
                    <form action="/dashboard/manage" method="post">
                      <ReturnTo path={path} />
                      <input type="hidden" name="action" value="teacher" />
                      <input type="hidden" name="classroom_id" value={id} />
                      <input
                        type="hidden"
                        name="teacher_id"
                        value={a.teacher_id}
                      />
                      <input type="hidden" name="active" value="false" />
                      <button
                        className="admin-text-button"
                        aria-label={`Remove assignment for ${name(a.teacher_id)}`}
                      >
                        Remove assignment
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.people.some(
            (p) =>
              p.role === 'teacher' &&
              p.status === 'active' &&
              !teachers.some((a) => a.teacher_id === p.id),
          ) ? (
            <form
              className="account-form"
              action="/dashboard/manage"
              method="post"
            >
              <ReturnTo path={path} />
              <input type="hidden" name="action" value="teacher" />
              <input type="hidden" name="classroom_id" value={id} />
              <input type="hidden" name="active" value="true" />
              <label>
                Assign a teacher
                <select name="teacher_id" required>
                  <PeopleOptions
                    people={data.people.filter(
                      (p) =>
                        p.role === 'teacher' &&
                        p.status === 'active' &&
                        !teachers.some((a) => a.teacher_id === p.id),
                    )}
                  />
                </select>
              </label>
              <button className="button">Assign teacher</button>
            </form>
          ) : (
            <p className="muted">
              Set up teacher access in{' '}
              <Link href="/admin/teachers">Teachers</Link> before assigning
              another teacher.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
