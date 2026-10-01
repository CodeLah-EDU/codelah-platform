import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DailyClassroom } from '@/components/lessons/daily-classroom';
import { currentAccount } from '@/lib/supabase/access';
import { classroomWindow, dailyConfigured } from '@/lib/daily';
import { isId, lessonDate, lessonTime } from '@/lib/lessons';

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, { client, account }] = await Promise.all([
    params,
    currentAccount(),
  ]);
  if (
    !isId(id) ||
    !account ||
    !['admin', 'teacher', 'student'].includes(account.role)
  )
    notFound();
  const { data: lesson } = await client
    .from('lessons')
    .select('id,title,starts_at,ends_at,status')
    .eq('id', id)
    .single();
  if (!lesson) notFound();
  const access = classroomWindow(lesson.starts_at, lesson.ends_at);
  return (
    <main id="main" className="account-shell classroom-page">
      <header className="account-header">
        <Link className="wordmark" href="/dashboard">
          CodeLah<span>_</span>
        </Link>
        <Link
          href={
            account.role === 'admin'
              ? `/dashboard/lessons/${id}`
              : `/dashboard/calendar/${id}`
          }
        >
          ← Back to class
        </Link>
      </header>
      <p className="eyebrow">PRIVATE LIVE CLASSROOM</p>
      <h1>{lesson.title}</h1>
      <p>
        {lessonDate(lesson.starts_at)} ·{' '}
        {lessonTime(lesson.starts_at, lesson.ends_at)}
      </p>
      {!dailyConfigured() ? (
        <output className="panel">
          <h2>Daily connection needed</h2>
          <p>Add the server-only Daily API key to activate this classroom.</p>
        </output>
      ) : lesson.status !== 'scheduled' || access === 'closed' ? (
        <section className="panel">
          <h2>This classroom is closed.</h2>
        </section>
      ) : access === 'early' ? (
        <section className="panel">
          <h2>The classroom is not open yet.</h2>
          <p>Come back 15 minutes before the scheduled start time.</p>
        </section>
      ) : (
        <DailyClassroom lessonId={id} teacher={account.role !== 'student'} />
      )}
    </main>
  );
}
