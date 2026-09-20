import { adminData } from '@/lib/admin';
import {
  AdminHeading,
  AdminNotice,
  Empty,
  Status,
  PeopleOptions,
  ReturnTo,
} from '@/components/admin/ui';
export default async function Relationships({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; student?: string }>;
}) {
  const [{ people, links }, { message, student }] = await Promise.all([
    adminData(),
    searchParams,
  ]);
  const parents = people.filter(
    (p) => p.role === 'parent' && p.status === 'active',
  );
  const students = people.filter(
    (p) => p.role === 'student' && p.status === 'active',
  );
  const name = (id: string) =>
    people.find((p) => p.id === id)?.display_name ?? 'Account unavailable';
  return (
    <>
      <AdminHeading
        title="Parent links"
        description="Give parents access to the students they support."
      />
      <AdminNotice message={message} />
      <div className="admin-split">
        <section className="panel">
          <h2>Connected families</h2>
          {!links.length ? (
            <Empty>No parent links yet.</Empty>
          ) : (
            <ul className="admin-directory">
              {links.map((l) => (
                <li key={`${l.parent_id}:${l.student_id}`}>
                  <div className="admin-record">
                    <div>
                      <h3>{name(l.parent_id)}</h3>
                      <p className="muted">Student: {name(l.student_id)}</p>
                    </div>
                    <Status value={l.active ? 'connected' : 'revoked'} />
                  </div>
                  <form action="/dashboard/manage" method="post">
                    <ReturnTo path="/admin/relationships" />
                    <input type="hidden" name="action" value="parent_link" />
                    <input type="hidden" name="parent_id" value={l.parent_id} />
                    <input
                      type="hidden"
                      name="student_id"
                      value={l.student_id}
                    />
                    <input
                      type="hidden"
                      name="active"
                      value={l.active ? 'false' : 'true'}
                    />
                    <button className="admin-text-button">
                      {l.active ? 'Revoke access' : 'Restore access'}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel">
          <h2>Link a parent</h2>
          {!parents.length || !students.length ? (
            <Empty>
              You’ll need an active parent and student account before linking
              them.
            </Empty>
          ) : (
            <form
              className="account-form"
              action="/dashboard/manage"
              method="post"
            >
              <ReturnTo path="/admin/relationships" />
              <input type="hidden" name="action" value="parent_link" />
              <input type="hidden" name="active" value="true" />
              <label>
                Parent
                <select name="parent_id" required>
                  <PeopleOptions people={parents} />
                </select>
              </label>
              <label>
                Student
                <select
                  name="student_id"
                  required
                  defaultValue={
                    students.some((s) => s.id === student) ? student : ''
                  }
                >
                  <PeopleOptions people={students} />
                </select>
              </label>
              <button className="button primary">Link parent to student</button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
