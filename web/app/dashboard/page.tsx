import Link from 'next/link';
import { currentAccount } from '@/lib/supabase/access';
import type { Account } from '@/lib/accounts';
type Classroom = { id: string; name: string; active: boolean };
const outcome: Record<string, string> = {
  saved: 'Changes saved.',
  password: 'Student password changed. Share it privately with the student.',
  created:
    'Student account created. Add their parent link and class enrolment below.',
  failed: 'That change could not be saved. Check the details and try again.',
  denied: 'You do not have permission to make that change.',
};
function PersonOptions({ people }: { people: Account[] }) {
  return (
    <>
      <option value="">Choose an account</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.contact_email ?? p.display_name} · {p.id.slice(0, 8)}
        </option>
      ))}
    </>
  );
}
function ClassOptions({ classes }: { classes: Classroom[] }) {
  return (
    <>
      <option value="">Choose a class</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </>
  );
}
function Submit() {
  return <button className="button primary">Save changes</button>;
}
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { client, account, error } = await currentAccount();
  const { message } = await searchParams;
  const active = account?.status === 'active' && account.role !== 'pending';
  const results = active
    ? await Promise.all([
        client
          .from('accounts')
          .select('id,display_name,role,status,contact_email')
          .order('display_name'),
        client.from('classrooms').select('id,name,active').order('name'),
        client.from('enrolments').select('classroom_id,student_id,active'),
        client
          .from('parent_student_links')
          .select('parent_id,student_id,active'),
        client
          .from('teacher_assignments')
          .select('classroom_id,teacher_id,active'),
        client.from('student_usernames').select('student_id,username'),
      ])
    : [];
  const failed = Boolean(error || results.some((r) => r.error));
  const people = (results[0]?.data ?? []) as Account[];
  const classes = (results[1]?.data ?? []) as Classroom[];
  const enrolments = (results[2]?.data ?? []) as {
    classroom_id: string;
    student_id: string;
    active: boolean;
  }[];
  const links = (results[3]?.data ?? []) as {
    parent_id: string;
    student_id: string;
    active: boolean;
  }[];
  const assignments = (results[4]?.data ?? []) as {
    classroom_id: string;
    teacher_id: string;
    active: boolean;
  }[];
  const usernames = (results[5]?.data ?? []) as {
    student_id: string;
    username: string;
  }[];
  const students = people.filter((p) => p.role === 'student');
  const name = (id: string) =>
    people.find((p) => p.id === id)?.display_name ?? 'Linked account';
  return (
    <main id="main" className="account-shell">
      <header className="account-header">
        <Link className="wordmark" href="/dashboard">
          CodeLah<span>_</span>
        </Link>
        <nav aria-label="Account">
          <Link href="/auth/password">Change password</Link>
          <form action="/auth/logout" method="post">
            <button className="button">Sign out</button>
          </form>
        </nav>
      </header>
      <p className="eyebrow">YOUR LEARNING STUDIO</p>
      <h1>Hello, {account?.display_name ?? 'there'}.</h1>
      {message && outcome[message] && (
        <output className="notice">{outcome[message]}</output>
      )}
      {failed ? (
        <section className="panel" role="alert">
          <h2>We couldn’t load your account.</h2>
          <p>Please refresh to try again. Your access has not changed.</p>
          <Link href="/dashboard">Try again</Link>
        </section>
      ) : !active ? (
        <section className="panel">
          <h2>
            {account?.status === 'suspended'
              ? 'Your account is paused.'
              : 'Your account is awaiting setup.'}
          </h2>
          <p>
            {account?.status === 'suspended'
              ? 'Please contact CodeLah to restore access.'
              : 'Your administrator will assign your role and connect your classes or children.'}
          </p>
        </section>
      ) : (
        <>
          <p className="muted">
            Signed in as {account?.role}. Your account and class connections are
            saved.
          </p>
          <div className="auth-grid">
            <section className="panel">
              <h2>Your classes</h2>
              {classes.length ? (
                <ul className="account-list">
                  {classes.map((c) => (
                    <li key={c.id}>
                      <strong>{c.name}</strong>
                      <p className="muted">
                        {c.active ? 'Active class' : 'Archived class'}
                      </p>
                      {enrolments
                        .filter((e) => e.classroom_id === c.id && e.active)
                        .map((e) => (
                          <p key={e.student_id}>{name(e.student_id)}</p>
                        ))}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No classes are connected yet.</p>
              )}
            </section>
            <section className="panel">
              <h2>
                {account?.role === 'student'
                  ? 'Your student account'
                  : 'Your students'}
              </h2>
              {students.length ? (
                <ul className="account-list">
                  {students.map((s) => (
                    <li key={s.id}>
                      <strong>{s.display_name}</strong>
                      <p className="account-meta">
                        {usernames.find((u) => u.student_id === s.id)
                          ?.username ?? 'Username setup pending'}{' '}
                        · {s.status}
                      </p>
                      {account?.role !== 'student' && s.status === 'active' && (
                        <details>
                          <summary>Set a new student password</summary>
                          <form
                            className="account-form"
                            method="post"
                            action="/dashboard/student-password"
                          >
                            <input
                              type="hidden"
                              name="student_id"
                              value={s.id}
                            />
                            <label>
                              New password
                              <input
                                type="password"
                                name="password"
                                autoComplete="new-password"
                                minLength={12}
                                maxLength={128}
                                required
                              />
                            </label>
                            <p className="muted">
                              This replaces the current password. Share the new
                              password privately with the student.
                            </p>
                            <button className="button">
                              Change student password
                            </button>
                          </form>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No students are connected yet.</p>
              )}
            </section>
          </div>
          {account?.role === 'admin' && (
            <section aria-labelledby="admin-heading">
              <h2 id="admin-heading">Account administration</h2>
              <p className="muted">
                Adults create and verify their own accounts. Assign their access
                here, then connect students and classes.
              </p>
              <div className="auth-grid">
                <section className="panel">
                  <h3>Account access</h3>
                  <form
                    className="account-form"
                    action="/dashboard/manage"
                    method="post"
                  >
                    <input type="hidden" name="action" value="account" />
                    <label>
                      Account
                      <select name="id" required>
                        <PersonOptions people={people} />
                      </select>
                    </label>
                    <label>
                      Display name
                      <input name="display_name" required maxLength={100} />
                    </label>
                    <label>
                      Role
                      <select name="role" required>
                        <option value="parent">Parent</option>
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                        <option value="pending">Pending</option>
                      </select>
                    </label>
                    <label>
                      Status
                      <select name="status">
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </label>
                    <Submit />
                  </form>
                  <ul className="account-list">
                    {people.map((p) => (
                      <li key={p.id}>
                        {p.display_name}
                        <p className="account-meta">
                          {p.contact_email && (
                            <>
                              {p.contact_email}
                              <br />
                            </>
                          )}
                          {p.role} · {p.status} · {p.id.slice(0, 8)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="panel">
                  <h3>Create a student</h3>
                  <form
                    className="account-form"
                    method="post"
                    action="/dashboard/create-student"
                  >
                    <label>
                      Student name
                      <input name="display_name" required maxLength={100} />
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
                      />
                    </label>
                    <p className="muted">
                      4–24 lowercase letters, numbers, or underscores. Start
                      with a letter.
                    </p>
                    <label>
                      Initial password
                      <input
                        type="password"
                        name="password"
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        required
                      />
                    </label>
                    <button className="button primary">Create student</button>
                  </form>
                  <h3>Add a class</h3>
                  <form
                    className="account-form"
                    method="post"
                    action="/dashboard/manage"
                  >
                    <input type="hidden" name="action" value="classroom" />
                    <label>
                      Class name
                      <input name="name" required maxLength={100} />
                    </label>
                    <button className="button">Create class</button>
                  </form>
                </section>
                <section className="panel">
                  <h3>Parent–student links</h3>
                  <form
                    className="account-form"
                    action="/dashboard/manage"
                    method="post"
                  >
                    <input type="hidden" name="action" value="parent_link" />
                    <label>
                      Parent
                      <select name="parent_id" required>
                        <PersonOptions
                          people={people.filter((p) => p.role === 'parent')}
                        />
                      </select>
                    </label>
                    <label>
                      Student
                      <select name="student_id" required>
                        <PersonOptions people={students} />
                      </select>
                    </label>
                    <label>
                      Access
                      <select name="active">
                        <option value="true">Connected</option>
                        <option value="false">Revoked</option>
                      </select>
                    </label>
                    <Submit />
                  </form>
                  <ul className="account-list">
                    {links.map((l) => (
                      <li key={`${l.parent_id}:${l.student_id}`}>
                        {name(l.parent_id)} → {name(l.student_id)}
                        <p className="account-meta">
                          {l.active ? 'Connected' : 'Revoked'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="panel">
                  <h3>Teacher assignments</h3>
                  <form
                    className="account-form"
                    action="/dashboard/manage"
                    method="post"
                  >
                    <input type="hidden" name="action" value="teacher" />
                    <label>
                      Teacher
                      <select name="teacher_id" required>
                        <PersonOptions
                          people={people.filter((p) => p.role === 'teacher')}
                        />
                      </select>
                    </label>
                    <label>
                      Class
                      <select name="classroom_id" required>
                        <ClassOptions classes={classes} />
                      </select>
                    </label>
                    <label>
                      Access
                      <select name="active">
                        <option value="true">Assigned</option>
                        <option value="false">Revoked</option>
                      </select>
                    </label>
                    <Submit />
                  </form>
                  <ul className="account-list">
                    {assignments.map((a) => (
                      <li key={`${a.classroom_id}:${a.teacher_id}`}>
                        {name(a.teacher_id)} →{' '}
                        {classes.find((c) => c.id === a.classroom_id)?.name}
                        <p className="account-meta">
                          {a.active ? 'Assigned' : 'Revoked'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="panel">
                  <h3>Student enrolment</h3>
                  <form
                    className="account-form"
                    action="/dashboard/manage"
                    method="post"
                  >
                    <input type="hidden" name="action" value="enrolment" />
                    <label>
                      Student
                      <select name="student_id" required>
                        <PersonOptions people={students} />
                      </select>
                    </label>
                    <label>
                      Class
                      <select name="classroom_id" required>
                        <ClassOptions classes={classes} />
                      </select>
                    </label>
                    <label>
                      Enrolment
                      <select name="active">
                        <option value="true">Active</option>
                        <option value="false">Ended</option>
                      </select>
                    </label>
                    <p className="muted">
                      Each class has up to four active students.
                    </p>
                    <Submit />
                  </form>
                </section>
              </div>
            </section>
          )}
          <section className="panel">
            <h2>Next: your teaching week</h2>
            <p className="muted">
              Lesson schedules, worksheets, and weekly reports will connect here
              in Phase 3.
            </p>
            <Link href="/demo">Explore the fictional dashboard demo</Link>
          </section>
        </>
      )}
    </main>
  );
}
