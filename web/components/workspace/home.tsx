'use client';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Files,
  FolderOpen,
} from 'lucide-react';
import { studentLessons, worksheetAvailable } from '@/lib/workspace';
import { lessonDate, lessonTime } from '@/lib/lessons';
import { useStudio, Title, Tag, Empty } from './ui';

export function HomeView() {
  const { data, teacher, studentId, href, now } = useStudio();
  const parent = data.account.role === 'parent';
  const student = data.people.find((p) => p.id === studentId);
  const lessons = studentLessons(data, studentId);
  const upcoming = lessons
    .filter(
      (l) => l.status === 'scheduled' && new Date(l.ends_at).valueOf() >= now,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = upcoming[0];
  const selectedCourses = data.studentCourses
    .filter((c) => c.student_id === studentId)
    .map((c) => c.course_id);
  const levels = data.levels.filter((l) =>
    selectedCourses.includes(l.course_id),
  );
  const objectives = data.objectives.filter((o) =>
    levels.some((l) => l.id === o.level_id),
  );
  const completed = objectives.filter((o) =>
    data.progress.some(
      (p) => p.student_id === studentId && p.objective_id === o.id,
    ),
  ).length;
  const unlocked = data.worksheets.filter((w) =>
    worksheetAvailable(data, w, studentId),
  ).length;
  const students = data.people.filter((p) => p.role === 'student');
  const reports = data.reports
    .filter((r) => !studentId || r.student_id === studentId)
    .slice(0, 3);
  return (
    <>
      <Title title={`Hello, ${data.account.display_name.split(' ')[0]}.`}>
        {teacher
          ? 'A little planning. A lot of room to grow.'
          : parent
            ? `Follow ${student?.display_name || 'your child'}’s learning, one class at a time.`
            : 'Your next idea starts here. Let’s keep building.'}
      </Title>
      <div className="ws-home-grid">
        <section className="ws-next-card">
          <div className="ws-section-heading">
            <span className="ws-caption">
              {teacher ? 'NEXT ON YOUR CALENDAR' : 'YOUR NEXT CLASS'}
            </span>
            <CalendarDays size={23} />
          </div>
          {next ? (
            <>
              <div className="ws-next-date">
                {lessonDate(next.starts_at)}{' '}
                <span>· {lessonTime(next.starts_at, next.ends_at)}</span>
              </div>
              <h2>{next.title}</h2>
              <p>
                {next.objective ||
                  'Get ready to explore, experiment, and build something new.'}
              </p>
              <div className="ws-next-footer">
                <Tag tone="upcoming">Upcoming</Tag>
                <Link
                  className="ws-button lime"
                  href={href(`calendar/${next.id}`)}
                >
                  View class <ArrowUpRight size={19} />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>
                Your next chapter
                <br />
                is on its way.
              </h2>
              <p>
                {teacher
                  ? 'Schedule a class and bring your students together.'
                  : 'Your next class will appear here once it is scheduled.'}
              </p>
              <Link className="ws-button lime" href={href('calendar')}>
                Open calendar <ArrowUpRight size={19} />
              </Link>
            </>
          )}
        </section>
        <section className="ws-panel ws-home-progress">
          <span className="ws-caption">
            {teacher ? 'YOUR TEACHING SPACE' : 'SMALL STEPS, REAL PROGRESS'}
          </span>
          <h2>
            {teacher ? 'Ready for a good week.' : 'Look how far you’ve come.'}
          </h2>
          {teacher ? (
            <>
              <div className="ws-big-number">
                {students.length}
                <span>students learning with you</span>
              </div>
              <p>
                {data.classrooms.length} assigned classes · Up to 4 students per
                lesson
              </p>
              <Link className="ws-text-link" href={href('students')}>
                View your students <ArrowRight size={18} />
              </Link>
            </>
          ) : (
            <>
              <div className="ws-progress-track">
                <span
                  style={{
                    width: `${objectives.length ? (completed / objectives.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <p>
                <strong>
                  {completed} of {objectives.length}
                </strong>{' '}
                learning objectives completed
              </p>
              <Link
                className="ws-text-link"
                href={href(
                  parent ? `students/${studentId}/objectives` : 'progress',
                )}
              >
                Explore progress <ArrowRight size={18} />
              </Link>
            </>
          )}
        </section>
      </div>
      <div className="ws-stat-grid">
        {(teacher
          ? [
              {
                label: 'Upcoming classes',
                value: upcoming.length,
                icon: CalendarDays,
                link: 'calendar',
              },
              {
                label: 'Worksheets in library',
                value: data.worksheets.length,
                icon: Files,
                link: 'worksheets',
              },
              {
                label: 'Published class updates',
                value: data.reports.length,
                icon: CheckCircle2,
                link: 'students',
              },
            ]
          : [
              {
                label: 'Upcoming classes',
                value: upcoming.length,
                icon: CalendarDays,
                link: 'calendar',
              },
              {
                label: 'Objectives completed',
                value: completed,
                icon: CheckCircle2,
                link: parent ? `students/${studentId}/objectives` : 'progress',
              },
              {
                label: parent
                  ? 'Saved student files'
                  : 'Worksheets ready for you',
                value: parent
                  ? data.files.filter((f) => f.student_id === studentId).length
                  : unlocked,
                icon: parent ? FolderOpen : Files,
                link: parent ? `students/${studentId}/timeline` : 'worksheets',
              },
            ]
        ).map((stat) => (
          <Link key={stat.label} href={href(stat.link)} className="ws-stat">
            <stat.icon size={22} />
            <div>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
      <div className="ws-two-col">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>Coming up</h2>
            <Link className="ws-text-link" href={href('calendar')}>
              Calendar <ArrowUpRight size={16} />
            </Link>
          </div>
          {upcoming.length ? (
            upcoming.slice(0, 3).map((lesson) => (
              <Link
                className="ws-lesson-row"
                key={lesson.id}
                href={href(`calendar/${lesson.id}`)}
              >
                <span className="ws-date-tile">
                  <strong>
                    {new Intl.DateTimeFormat('en', {
                      timeZone: 'Asia/Singapore',
                      day: '2-digit',
                    }).format(new Date(lesson.starts_at))}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat('en', {
                      timeZone: 'Asia/Singapore',
                      month: 'short',
                    }).format(new Date(lesson.starts_at))}
                  </span>
                </span>
                <div>
                  <h3>{lesson.title}</h3>
                  <p>{lessonTime(lesson.starts_at, lesson.ends_at)}</p>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))
          ) : (
            <Empty title="A little space in your calendar">
              New classes will appear here.
            </Empty>
          )}
        </section>
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>Latest class notes</h2>
            <span className="ws-caption">FROM YOUR TEACHER</span>
          </div>
          {reports.length ? (
            reports.map((report) => (
              <Link
                href={href(`calendar/${report.lesson_id}`)}
                key={`${report.lesson_id}-${report.student_id}`}
                className="ws-note-preview"
              >
                <span>
                  {data.lessons.find((l) => l.id === report.lesson_id)?.title ||
                    'Class update'}
                </span>
                <p>{report.note}</p>
                <small>
                  {lessonDate(report.published_at)} <ArrowUpRight size={14} />
                </small>
              </Link>
            ))
          ) : (
            <Empty title="Every class tells a story">
              Published teacher notes will be saved here.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
