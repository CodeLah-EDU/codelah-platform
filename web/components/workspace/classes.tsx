'use client';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileText,
  Lock,
} from 'lucide-react';
import {
  classCourseNames,
  classStudents,
  studentCourseNames,
  type WorkspaceData,
} from '@/lib/workspace';
import { lessonDate, lessonTime } from '@/lib/lessons';
import { Download, Empty, FileRow, Person, Tag, Title, useStudio } from './ui';
import { lessonWorksheetList } from './calendar';

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
                <small>{plural(students.length, 'student')}</small>
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
      <PastLessons classId={id} />
    </>
  );
}

// Lessons that have already happened, newest first. Each opens to show what was shared,
// the teacher's comment for each student, and the students' own notes.
function PastLessons({ classId }: { classId: string }) {
  const { data, href, now } = useStudio();
  const lessons = data.lessons
    .filter(
      (l) =>
        l.classroom_id === classId &&
        l.status !== 'cancelled' &&
        new Date(l.starts_at).valueOf() <= now,
    )
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return (
    <section className="ws-panel ws-spaced ws-past-lessons">
      <div className="ws-section-heading">
        <h2>Past lessons</h2>
        <Tag>{lessons.length}</Tag>
      </div>
      {!lessons.length && (
        <p className="ws-muted">Lessons will show here after they happen.</p>
      )}
      {lessons.map((lesson) => {
        const roster = data.roster.filter((r) => r.lesson_id === lesson.id);
        const students = data.people
          .filter((p) => roster.some((r) => r.student_id === p.id))
          .sort((a, b) => a.display_name.localeCompare(b.display_name));
        const attendance = (studentId: string) =>
          data.attendance.find(
            (a) => a.lesson_id === lesson.id && a.student_id === studentId,
          )?.status;
        const present = students.filter((s) =>
          ['present', 'late'].includes(attendance(s.id) ?? ''),
        ).length;
        const shared = data.files.filter(
          (f) => f.lesson_id === lesson.id && f.kind === 'material',
        );
        const worksheets = lessonWorksheetList(data, lesson.id);
        const privateNote = data.teacherNotes.find(
          (n) => n.lesson_id === lesson.id,
        );
        return (
          <details className="ws-past-lesson" key={lesson.id}>
            <summary>
              <span className="ws-grow">
                <strong>{lesson.title}</strong>
                <small>
                  {lessonDate(lesson.starts_at)} ·{' '}
                  {lessonTime(lesson.starts_at, lesson.ends_at)}
                </small>
              </span>
              <Tag>
                {present}/{students.length} attended
              </Tag>
              <ChevronDown className="ws-past-chevron" size={18} />
            </summary>
            <div className="ws-past-lesson-body">
              {lesson.objective && <p>{lesson.objective}</p>}
              <h3>Shared in this lesson</h3>
              {worksheets.map((w) => (
                <div className="ws-file-row" key={w.id}>
                  <span className="ws-file-icon">
                    <FileText size={21} />
                  </span>
                  <div className="ws-grow">
                    <strong>{w.title}</strong>
                    <small>Worksheet</small>
                  </div>
                  {data.assets.some((a) => a.worksheet_id === w.id) && (
                    <Download id={w.id} kind="worksheet" open />
                  )}
                </div>
              ))}
              {shared.map((f) => (
                <FileRow key={f.id} file={f} />
              ))}
              {!worksheets.length && !shared.length && (
                <p className="ws-muted">Nothing was shared.</p>
              )}
              <h3>
                Private notes <Lock size={12} />
              </h3>
              <p className="preserve-lines">
                {privateNote?.body || 'No private notes.'}
              </p>
              <h3>Students</h3>
              {students.map((s) => {
                const feedback = data.feedback.find(
                  (f) => f.lesson_id === lesson.id && f.student_id === s.id,
                );
                const report = data.reports.find(
                  (r) => r.lesson_id === lesson.id && r.student_id === s.id,
                );
                const teacherNote = feedback?.note ?? report?.note;
                const notes = data.comments.filter(
                  (c) => c.lesson_id === lesson.id && c.student_id === s.id,
                );
                const files = data.files.filter(
                  (f) =>
                    f.lesson_id === lesson.id &&
                    f.kind === 'submission' &&
                    f.student_id === s.id,
                );
                return (
                  <div className="ws-past-student" key={s.id}>
                    <div className="ws-roster-row">
                      <Person name={s.display_name} />
                      <Tag
                        tone={
                          ['present', 'late'].includes(attendance(s.id) ?? '')
                            ? 'attended'
                            : attendance(s.id) === 'absent'
                              ? 'missed'
                              : ''
                        }
                      >
                        {attendance(s.id) || 'Unmarked'}
                      </Tag>
                    </div>
                    <dl>
                      <dt>
                        Your comment
                        {feedback && (
                          <Tag tone={report ? 'attended' : ''}>
                            {feedback.status === 'published'
                              ? 'Published'
                              : 'Draft'}
                          </Tag>
                        )}
                      </dt>
                      <dd className="preserve-lines">
                        {teacherNote || 'No comment yet.'}
                      </dd>
                      <dt>Student’s notes</dt>
                      <dd>
                        {notes.length
                          ? notes.map((c) => (
                              <p className="preserve-lines" key={c.id}>
                                {c.body}
                              </p>
                            ))
                          : 'No notes yet.'}
                      </dd>
                      {files.length > 0 && (
                        <>
                          <dt>Student’s files</dt>
                          <dd>
                            {files.map((f) => (
                              <FileRow key={f.id} file={f} />
                            ))}
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>
                );
              })}
              <Link
                className="ws-text-link"
                href={href(`calendar/${lesson.id}`)}
              >
                Open lesson to edit <ArrowUpRight size={16} />
              </Link>
            </div>
          </details>
        );
      })}
    </section>
  );
}
