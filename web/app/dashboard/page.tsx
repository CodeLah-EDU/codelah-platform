import { redirect } from 'next/navigation';
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
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { client, account, error } = await currentAccount();
  const { message } = await searchParams;
  const active = account?.status === 'active' && account.role !== 'pending';
  if (active && account?.role === 'admin')
    redirect(
      `/admin${message ? `?message=${encodeURIComponent(message)}` : ''}`,
    );
  const results = active
    ? await Promise.all([
        client
          .from('accounts')
          .select('id,display_name,role,status,contact_email')
          .order('display_name'),
        client.from('classrooms').select('id,name,active').order('name'),
        client.from('enrolments').select('classroom_id,student_id,active'),
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
  const usernames = (results[3]?.data ?? []) as {
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
