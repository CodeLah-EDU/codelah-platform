'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import {
  classCourseNames,
  classStudents,
  studentCourseNames,
  type WorkspaceData,
} from '@/lib/workspace';
import { lessonDate, lessonTime } from '@/lib/lessons';
import { Empty, Person, Tag, Title, useStudio } from './ui';

type Classroom = WorkspaceData['classrooms'][number];

function sortedClasses(data: WorkspaceData) {
  return [...data.classrooms].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
  );
}
function upcomingLessons(data: WorkspaceData, classId: string, now: number) {
  return data.lessons
    .filter(
      (l) =>
        l.classroom_id === classId &&
        l.status === 'scheduled' &&
        new Date(l.ends_at).valueOf() >= now,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
const plural = (n: number, word: string) =>
  `${n} ${n === 1 ? word : word.endsWith('s') ? `${word}es` : `${word}s`}`;

function Courses({ names }: { names: string[] }) {
  return (
    <div className="ws-class-courses">
      {names.length ? (
        names.map((name) => (
          <Tag key={name} tone="sage">
            {name}
          </Tag>
        ))
      ) : (
        <Tag>No course yet</Tag>
      )}
    </div>
  );
}

// Home page card: each class with its course and students.
export function ClassesSummary() {
  const { data, href } = useStudio();
  const classes = sortedClasses(data).filter((c) => c.active);
  return (
    <section className="ws-panel ws-home-classes">
      <div className="ws-section-heading">
        <h2>Your classes</h2>
        <Tag>{plural(classes.length, 'class')}</Tag>
      </div>
      {classes.length ? (
        classes.slice(0, 3).map((c) => {
          const students = classStudents(data, c.id);
          return (
            <Link
              key={c.id}
              className="ws-home-class"
              href={href(`classes/${c.id}`)}
            >
              <div className="ws-grow">
                <strong>{c.name}</strong>
                <Courses names={classCourseNames(data, c.id)} />
                <small>
                  {students.length
                    ? students.map((s) => s.display_name).join(', ')
                    : 'No students yet'}
                </small>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          );
        })
      ) : (
        <p className="ws-muted">
          Your administrator will assign classes to you.
        </p>
      )}
      <Link className="ws-text-link" href={href('classes')}>
        All classes <ArrowRight size={18} />
      </Link>
    </section>
  );
}

export function ClassesView() {
  const { data } = useStudio();
  const classes = sortedClasses(data);
  return (
    <>
      <Title title="Classes">{plural(classes.length, 'class')}</Title>
      {classes.length ? (
        <div className="ws-class-grid">
          {classes.map((c) => (
            <ClassCard key={c.id} classroom={c} />
          ))}
        </div>
      ) : (
        <Empty title="No classes yet">
          Your administrator will assign classes to you.
        </Empty>
      )}
    </>
  );
}

function ClassCard({ classroom }: { classroom: Classroom }) {
  const { data, href, now } = useStudio();
  const students = classStudents(data, classroom.id);
  const next = upcomingLessons(data, classroom.id, now)[0];
  return (
    <Link
      className="ws-panel ws-class-card"
      href={href(`classes/${classroom.id}`)}
    >
      <div className="ws-class-card-head">
        <h2>{classroom.name}</h2>
        {!classroom.active && <Tag>Archived</Tag>}
        <ArrowUpRight size={18} />
      </div>
      <Courses names={classCourseNames(data, classroom.id)} />
      <p className="ws-class-count">{plural(students.length, 'student')}</p>
      <ul className="ws-class-students">
        {students.map((s) => (
          <li key={s.id}>
            <Person name={s.display_name} />
          </li>
        ))}
      </ul>
      <p className="ws-class-next">
        {next
          ? `Next class: ${lessonDate(next.starts_at)} · ${lessonTime(next.starts_at, next.ends_at)}`
          : 'No upcoming class scheduled'}
      </p>
    </Link>
  );
}

export function ClassView({ id }: { id: string }) {
  const { data, href, now } = useStudio();
  const classroom = data.classrooms.find((c) => c.id === id);
  if (!classroom)
    return (
      <Empty title="Class unavailable">
        Choose another class from your class list.
      </Empty>
    );
  const students = classStudents(data, id);
  const upcoming = upcomingLessons(data, id, now);
  return (
    <>
      <Link className="ws-back" href={href('classes')}>
        <ArrowLeft size={17} /> All classes
      </Link>
      <Title title={classroom.name}>
        {[
          classCourseNames(data, id).join(', ') || 'No course yet',
          plural(students.length, 'student'),
          ...(classroom.active ? [] : ['archived']),
        ].join(' · ')}
      </Title>
      <div className="ws-two-col ws-class-detail">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>Students</h2>
            <Tag>{students.length}</Tag>
          </div>
          {students.length ? (
            students.map((s) => {
              const courses = studentCourseNames(data, s.id);
              return (
                <div className="ws-roster-row ws-class-student" key={s.id}>
                  <Person
                    name={s.display_name}
                    subtitle={
                      courses.length ? courses.join(', ') : 'No course yet'
                    }
                  />
                  <Link
                    className="ws-text-link"
                    href={href(`students/${s.id}/overview`)}
                  >
                    Open details <ArrowUpRight size={16} />
                  </Link>
                </div>
              );
            })
          ) : (
            <p className="ws-muted">No students are enrolled yet.</p>
          )}
        </section>
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>Upcoming classes</h2>
            <Link className="ws-text-link" href={href('calendar')}>
              Calendar <ArrowUpRight size={16} />
            </Link>
          </div>
          {upcoming.length ? (
            upcoming.slice(0, 5).map((lesson) => (
              <Link
                className="ws-lesson-row"
                key={lesson.id}
                href={href(`calendar/${lesson.id}`)}
              >
                <div className="ws-grow">
                  <h3>{lesson.title}</h3>
                  <p>
                    {lessonDate(lesson.starts_at)} ·{' '}
                    {lessonTime(lesson.starts_at, lesson.ends_at)}
                  </p>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))
          ) : (
            <p className="ws-muted">No upcoming classes are scheduled.</p>
          )}
        </section>
      </div>
    </>
  );
}
