import Link from 'next/link';
import { lessonDate, lessonTime, requestTimestamp } from '@/lib/lessons';
import { currentAccount } from '@/lib/supabase/access';

type Lesson = {
  id: string;
  classroom_id: string;
  title: string;
  objective: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};

type Classroom = { id: string; name: string };

function LessonList({
  lessons,
  className,
}: {
  lessons: Lesson[];
  className: (id: string) => string;
}) {
  return (
    <div className="lesson-list">
      {lessons.map((lesson) => (
        <article className="panel lesson-record" key={lesson.id}>
          <div>
            <p className="eyebrow">{className(lesson.classroom_id)}</p>
            <h3>
              <Link href={`/dashboard/lessons/${lesson.id}`}>
                {lesson.title}
              </Link>
            </h3>
            <p className="lesson-record-date">
              {lessonDate(lesson.starts_at)} ·{' '}
              {lessonTime(lesson.starts_at, lesson.ends_at)}
            </p>
            {lesson.objective && <p className="muted">{lesson.objective}</p>}
          </div>
          <span className={`status-chip status-${lesson.status}`}>
            {lesson.status}
          </span>
        </article>
      ))}
    </div>
  );
}

export default async function Lessons({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { client, account } = await currentAccount();
  const { message } = await searchParams;
  const isTeacher = account?.role === 'teacher' || account?.role === 'admin';
  const [lessonResult, classResult] = await Promise.all([
    client
      .from('lessons')
      .select('id,classroom_id,title,objective,starts_at,ends_at,status')
      .order('starts_at', { ascending: true }),
    client
      .from('classrooms')
      .select('id,name')
      .eq('active', true)
      .order('name'),
  ]);
  const lessons = (lessonResult.data ?? []) as Lesson[];
  const classrooms = (classResult.data ?? []) as Classroom[];
  const className = (id: string) =>
    classrooms.find((classroom) => classroom.id === id)?.name ?? 'Your class';
  const now = requestTimestamp();
  const upcoming = lessons.filter(
    (lesson) =>
      lesson.status === 'scheduled' &&
      new Date(lesson.ends_at).valueOf() >= now,
  );
  const previous = lessons
    .filter(
      (lesson) =>
        !upcoming.some((upcomingLesson) => upcomingLesson.id === lesson.id),
    )
    .reverse();

  return (
    <main id="main" className="account-shell">
      <header className="account-header">
        <Link className="wordmark" href="/dashboard">
          CodeLah<span>_</span>
        </Link>
        <nav aria-label="Account">
          <Link href="/dashboard">Dashboard</Link>
          <form action="/auth/logout" method="post">
            <button className="button">Sign out</button>
          </form>
        </nav>
      </header>
      <p className="eyebrow">TEACHING WEEK</p>
      <div className="page-heading-row">
        <div>
          <h1>Lesson schedule</h1>
          <p className="muted">All times are shown in Singapore time (SGT).</p>
        </div>
        {isTeacher && (
          <Link className="button primary" href="/dashboard/lessons/new">
            Schedule a lesson
          </Link>
        )}
      </div>
      {message === 'created' && (
        <output className="notice">Lesson scheduled.</output>
      )}
      {message === 'failed' && (
        <output className="notice" role="alert">
          That lesson could not be scheduled. Check the details and try again.
        </output>
      )}
      {lessonResult.error || classResult.error ? (
        <section className="panel" role="alert">
          <h2>We couldn’t load lessons.</h2>
          <p>Please refresh to try again.</p>
        </section>
      ) : lessons.length ? (
        <div className="schedule-groups">
          <section aria-labelledby="upcoming-lessons">
            <h2 id="upcoming-lessons">Upcoming lessons</h2>
            {upcoming.length ? (
              <LessonList lessons={upcoming} className={className} />
            ) : (
              <div className="panel">
                <p className="muted">No upcoming lessons are scheduled.</p>
              </div>
            )}
          </section>
          {previous.length > 0 && (
            <section aria-labelledby="previous-lessons">
              <h2 id="previous-lessons">Previous and cancelled lessons</h2>
              <LessonList lessons={previous} className={className} />
            </section>
          )}
        </div>
      ) : (
        <section className="panel">
          <h2>No lessons scheduled yet.</h2>
          <p className="muted">
            {isTeacher
              ? 'Schedule the first lesson for one of your classes.'
              : 'Your teacher has not scheduled a lesson yet.'}
          </p>
        </section>
      )}
    </main>
  );
}
