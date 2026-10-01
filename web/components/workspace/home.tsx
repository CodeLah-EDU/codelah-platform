'use client';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CalendarDays } from 'lucide-react';
import { studentLessons } from '@/lib/workspace';
import { lessonDate, lessonTime } from '@/lib/lessons';
import { useStudio, Title, Tag, Empty } from './ui';
import { ClassesSummary } from './classes';

export function HomeView() {
  const { data, teacher, studentId, href, now } = useStudio();
  const parent = data.account.role === 'parent';
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
  const reports = data.reports
    .filter((r) => !studentId || r.student_id === studentId)
    .slice(0, 3);
  return (
    <>
      <Title title={`Hello, ${data.account.display_name.split(' ')[0]}.`} />
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
              {next.objective && <p>{next.objective}</p>}
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
              <h2>No class scheduled yet</h2>
              <Link className="ws-button lime" href={href('calendar')}>
                Open calendar <ArrowUpRight size={19} />
              </Link>
            </>
          )}
        </section>
        {teacher ? (
          <ClassesSummary />
        ) : (
          <section className="ws-panel ws-home-progress">
            <h2>Progress</h2>
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
              View progress <ArrowRight size={18} />
            </Link>
          </section>
        )}
      </div>
      <div className={teacher ? 'ws-home-single' : 'ws-two-col'}>
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
            <Empty title="No upcoming classes" />
          )}
        </section>
        {!teacher && (
          <section className="ws-panel">
            <div className="ws-section-heading">
              <h2>Teacher notes</h2>
            </div>
            {reports.length ? (
              reports.map((report) => (
                <Link
                  href={href(`calendar/${report.lesson_id}`)}
                  key={`${report.lesson_id}-${report.student_id}`}
                  className="ws-note-preview"
                >
                  <span>
                    {data.lessons.find((l) => l.id === report.lesson_id)
                      ?.title || 'Class update'}
                  </span>
                  <p>{report.note}</p>
                  <small>
                    {lessonDate(report.published_at)} <ArrowUpRight size={14} />
                  </small>
                </Link>
              ))
            ) : (
              <Empty title="No teacher notes yet" />
            )}
          </section>
        )}
      </div>
    </>
  );
}
