'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  Video,
  Upload,
  X,
} from 'lucide-react';
import {
  calendarStatus,
  monthDays,
  singaporeDay,
  studentLessons,
  type Lesson,
  type WorkspaceData,
} from '@/lib/workspace';
import { lessonDate, lessonTime } from '@/lib/lessons';
import { LESSON_FILE_ACCEPT } from '@/lib/lesson-files';
import {
  Action,
  Empty,
  Field,
  FileRow,
  Modal,
  Person,
  SaveForm,
  Tag,
  Title,
  useStudio,
} from './ui';

const localInput = (value: string) =>
  new Date(new Date(value).valueOf() + 8 * 3600000).toISOString().slice(0, 16);
function LessonEditor({
  lesson,
  close,
}: {
  lesson?: Lesson;
  close: () => void;
}) {
  const { data, now } = useStudio();
  return (
    <SaveForm
      action="lesson_save"
      values={lesson ? { id: lesson.id } : {}}
      onSaved={close}
      label={lesson ? 'Save class' : 'Schedule class'}
    >
      <Field label="Class title">
        <input
          name="title"
          required
          maxLength={160}
          defaultValue={lesson?.title}
          placeholder="e.g. Build a guessing game"
        />
      </Field>
      {!lesson && (
        <Field label="Teaching group">
          <select name="classroom_id" required defaultValue="">
            <option value="" disabled>
              Choose a group
            </option>
            {data.classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="What will students learn?">
        <textarea
          name="objective"
          maxLength={2000}
          defaultValue={lesson?.objective}
          rows={3}
        />
      </Field>
      <div className="ws-form-grid">
        <Field label="Starts (Singapore time)">
          <input
            name="starts_at"
            type="datetime-local"
            required
            min={!lesson ? localInput(new Date(now).toISOString()) : undefined}
            defaultValue={lesson ? localInput(lesson.starts_at) : undefined}
          />
        </Field>
        <Field label="Ends (Singapore time)">
          <input
            name="ends_at"
            type="datetime-local"
            required
            defaultValue={lesson ? localInput(lesson.ends_at) : undefined}
          />
        </Field>
      </div>
      <p className="ws-muted">
        Classes last 90–120 minutes and have up to 4 students.
      </p>
      {lesson ? (
        <Field label="Class status">
          <select name="status" defaultValue={lesson?.status || 'scheduled'}>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
      ) : (
        <input type="hidden" name="status" value="scheduled" />
      )}
    </SaveForm>
  );
}
export function CalendarView({
  student,
  embedded = false,
}: {
  student?: string;
  embedded?: boolean;
}) {
  const { data, teacher, studentId, href, mutate, now, busy } = useStudio();
  const target = student || studentId;
  const [month, setMonth] = useState(
    singaporeDay(new Date(now).toISOString()).slice(0, 7),
  );
  const [view, setView] = useState('month');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [dragOver, setDragOver] = useState('');
  const lessons = studentLessons(data, target).filter(
    (l) => !group || l.classroom_id === group,
  );
  const students = data.people.filter(
    (p) =>
      p.role === 'student' &&
      p.status === 'active' &&
      p.display_name.toLowerCase().includes(search.toLowerCase()),
  );
  function moveMonth(direction: number) {
    const date = new Date(`${month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + direction);
    setMonth(date.toISOString().slice(0, 7));
  }
  const label = new Intl.DateTimeFormat('en-SG', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01`));
  const statusFor = (lesson: Lesson) =>
    calendarStatus(
      lesson,
      data.attendance.find(
        (a) => a.lesson_id === lesson.id && a.student_id === target,
      )?.status,
      now,
    );
  async function drop(lesson: Lesson, student: string) {
    setDragOver('');
    const form = new FormData();
    form.set('action', 'roster_add');
    form.set('lesson_id', lesson.id);
    form.set('student_id', student);
    await mutate(form);
  }
  const lessonCard = (lesson: Lesson) => {
    const roster = data.roster.filter((r) => r.lesson_id === lesson.id);
    const editable =
      teacher &&
      lesson.status === 'scheduled' &&
      new Date(lesson.starts_at).valueOf() > now;
    const status = statusFor(lesson);
    return (
      <div
        key={lesson.id}
        className={`ws-calendar-event ${status} ${dragOver === lesson.id ? 'drop-over' : ''}`}
        onDragOver={(event) => {
          if (editable && !busy) {
            event.preventDefault();
            setDragOver(lesson.id);
          }
        }}
        onDragLeave={() => setDragOver('')}
        onDrop={(event) => {
          event.preventDefault();
          const student = event.dataTransfer.getData('text/codelah-student');
          if (editable && student && !busy) void drop(lesson, student);
        }}
      >
        <Link href={href(`calendar/${lesson.id}`)}>
          <small>
            {lessonTime(lesson.starts_at, lesson.ends_at).replace(' SGT', '')}
          </small>
          <strong>{lesson.title}</strong>
          <span className="ws-event-state">
            {teacher && lesson.status === 'completed' ? 'Completed' : status}
          </span>
        </Link>
        {teacher && (
          <>
            <div className="ws-roster-mini">
              {roster.map((r) => (
                <Link
                  key={r.student_id}
                  href={href(`students/${r.student_id}/overview`)}
                  title={
                    data.people.find((p) => p.id === r.student_id)?.display_name
                  }
                >
                  {data.people
                    .find((p) => p.id === r.student_id)
                    ?.display_name.split(' ')[0] || 'Student'}
                </Link>
              ))}
            </div>
            <small className="ws-capacity">
              {roster.length}/4 students
              {editable && roster.length < 4 ? ' · drop here' : ''}
            </small>
          </>
        )}
      </div>
    );
  };
  return (
    <>
      {!embedded && (
        <Title
          title="Calendar"
          action={
            teacher && (
              <Modal
                title="Schedule a class"
                trigger={
                  <>
                    <Plus size={19} /> Schedule class
                  </>
                }
              >
                {(close) => <LessonEditor close={close} />}
              </Modal>
            )
          }
        />
      )}
      <div
        className={`ws-calendar-layout ${teacher && !target ? 'with-assignment' : ''}`}
      >
        <section className="ws-calendar-panel">
          <div className="ws-calendar-toolbar">
            <div className="ws-month-controls">
              <button
                className="ws-icon-button"
                aria-label="Previous month"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <h2>{label}</h2>
              <button
                className="ws-icon-button"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight size={20} />
              </button>
              <button
                className="ws-text-button"
                onClick={() =>
                  setMonth(
                    singaporeDay(new Date(now).toISOString()).slice(0, 7),
                  )
                }
              >
                Today
              </button>
            </div>
            <div className="ws-segment">
              <button
                aria-pressed={view === 'month'}
                onClick={() => setView('month')}
              >
                Month
              </button>
              <button
                aria-pressed={view === 'agenda'}
                onClick={() => setView('agenda')}
              >
                Agenda
              </button>
            </div>
          </div>
          <div className="ws-calendar-legend">
            <Tag tone="upcoming">Upcoming</Tag>
            <Tag tone="missed">Missed</Tag>
            <Tag tone="attended">Attended</Tag>
            <Tag>Unmarked / excused / cancelled</Tag>
            <span>Singapore time (SGT)</span>
          </div>
          {teacher && (
            <label className="ws-calendar-filter">
              Teaching group{' '}
              <select
                aria-label="Filter calendar by group"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                <option value="">All groups</option>
                {data.classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {view === 'month' ? (
            <div className="ws-calendar-scroll">
              <div className="ws-calendar-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div className="ws-weekday" key={d}>
                    {d}
                  </div>
                ))}
                {monthDays(month).map((day) => (
                  <div
                    key={day}
                    className={`ws-calendar-day ${!day.startsWith(month) ? 'outside' : ''}`}
                  >
                    <span
                      className={
                        day === singaporeDay(new Date(now).toISOString())
                          ? 'today'
                          : ''
                      }
                    >
                      {Number(day.slice(-2))}
                    </span>
                    {lessons
                      .filter((l) => singaporeDay(l.starts_at) === day)
                      .map(lessonCard)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="ws-agenda">
              {lessons.filter((l) =>
                singaporeDay(l.starts_at).startsWith(month),
              ).length ? (
                lessons
                  .filter((l) => singaporeDay(l.starts_at).startsWith(month))
                  .map((l) => (
                    <div className="ws-agenda-row" key={l.id}>
                      <p>{lessonDate(l.starts_at)}</p>
                      {lessonCard(l)}
                    </div>
                  ))
              ) : (
                <Empty title="No classes this month">
                  Use the arrows to explore another month.
                </Empty>
              )}
            </div>
          )}
        </section>
        {teacher && !target && (
          <aside className="ws-assignment-panel">
            <div className="ws-section-heading">
              <h2>Assign students</h2>
              <Tag>{students.length}</Tag>
            </div>
            <p>
              Drag a student onto a future class. You can also open a class and
              use “Add student”.
            </p>
            <input
              aria-label="Search students to assign"
              placeholder="Find a student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="ws-assignment-students">
              {students.map((s) => (
                <div
                  key={s.id}
                  className="ws-draggable"
                  draggable={!busy}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/codelah-student', s.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  <GripVertical size={17} />
                  <Link href={href(`students/${s.id}/overview`)}>
                    <Person name={s.display_name} />
                  </Link>
                </div>
              ))}
            </div>
            <p className="ws-assignment-hint">
              4 students, maximum.
              <br />
              Every student gets room to learn.
            </p>
          </aside>
        )}
      </div>
    </>
  );
}

export function LessonView({ id }: { id: string }) {
  const { data, teacher, studentId, href, now } = useStudio();
  const lesson = data.lessons.find((l) => l.id === id);
  if (!lesson)
    return (
      <Empty title="Class unavailable">
        Choose another class from your calendar.
      </Empty>
    );
  const roster = data.roster.filter((r) => r.lesson_id === id);
  const students = data.people.filter(
    (p) =>
      roster.some((r) => r.student_id === p.id) &&
      (!studentId || p.id === studentId),
  );
  if (!teacher && !students.length)
    return (
      <Empty title="This class is not on this child’s calendar">
        Switch to the child assigned to this class.
      </Empty>
    );
  const editable =
    teacher &&
    lesson.status === 'scheduled' &&
    new Date(lesson.starts_at).valueOf() > now;
  const files = data.files.filter(
    (f) =>
      f.lesson_id === id &&
      (teacher || !f.student_id || f.student_id === studentId),
  );
  return (
    <>
      <Link className="ws-back" href={href('calendar')}>
        <ArrowLeft size={17} /> Back to calendar
      </Link>
      <Title
        title={lesson.title}
        action={
          teacher && (
            <Modal title="Edit class" trigger="Edit class">
              {(close) => <LessonEditor lesson={lesson} close={close} />}
            </Modal>
          )
        }
      >
        {lessonDate(lesson.starts_at)} ·{' '}
        {lessonTime(lesson.starts_at, lesson.ends_at)}
      </Title>
      <div className="ws-lesson-banner">
        <CalendarDays size={26} />
        <div>
          <strong>
            {data.classrooms.find((c) => c.id === lesson.classroom_id)?.name ||
              'Your class'}
          </strong>
          {lesson.objective && <p>{lesson.objective}</p>}
        </div>
        <Tag tone={lesson.status === 'scheduled' ? 'upcoming' : ''}>
          {lesson.status}
        </Tag>
        {data.account.role !== 'parent' && lesson.status === 'scheduled' && (
          <Link
            className="ws-button"
            href={`/dashboard/lessons/${id}/classroom`}
          >
            <Video size={18} /> Classroom
          </Link>
        )}
      </div>
      <div className="ws-two-col">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>{teacher ? 'Class roster' : 'Attendance'}</h2>
            {teacher && <Tag>{roster.length}/4 students</Tag>}
          </div>
          {students.map((s) => {
            const attendance = data.attendance.find(
              (a) => a.student_id === s.id && a.lesson_id === id,
            );
            return (
              <div className="ws-roster-row" key={s.id}>
                {teacher ? (
                  <Link href={href(`students/${s.id}/overview`)}>
                    <Person name={s.display_name} />
                  </Link>
                ) : (
                  <Person name={s.display_name} />
                )}
                <Tag tone={calendarStatus(lesson, attendance?.status, now)}>
                  {attendance?.status || 'Unmarked'}
                </Tag>
                {teacher && (
                  <Modal
                    title={`Attendance · ${s.display_name}`}
                    trigger="Attendance"
                    className="ws-text-button"
                  >
                    {(close) => (
                      <>
                        <SaveForm
                          action="attendance_save"
                          values={{ lesson_id: id, student_id: s.id }}
                          label="Save attendance"
                          onSaved={close}
                        >
                          <Field label="Attendance">
                            <select
                              name="status"
                              defaultValue={attendance?.status || 'unmarked'}
                            >
                              {[
                                'unmarked',
                                'present',
                                'late',
                                'absent',
                                'excused',
                              ].map((status) => (
                                <option key={status}>{status}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Attendance note">
                            <input
                              name="note"
                              maxLength={1000}
                              defaultValue={attendance?.note}
                            />
                          </Field>
                        </SaveForm>
                        {attendance && (
                          <Action
                            action="attendance_delete"
                            values={{ lesson_id: id, student_id: s.id }}
                            confirm="Clear this attendance record?"
                          >
                            Clear attendance
                          </Action>
                        )}
                      </>
                    )}
                  </Modal>
                )}
                {editable && (
                  <Action
                    action="roster_remove"
                    values={{ lesson_id: id, student_id: s.id }}
                    confirm={`Remove ${s.display_name} from this class?`}
                  >
                    <X size={17} />
                    <span className="sr-only">Remove {s.display_name}</span>
                  </Action>
                )}
              </div>
            );
          })}
          {editable && (
            <SaveForm
              action="roster_add"
              values={{ lesson_id: id }}
              label="Add student"
            >
              <Field label="Student">
                <select name="student_id" required defaultValue="">
                  <option value="" disabled>
                    {roster.length >= 4 ? 'Class is full' : 'Choose a student'}
                  </option>
                  {data.people
                    .filter(
                      (p) =>
                        p.role === 'student' &&
                        p.status === 'active' &&
                        !roster.some((r) => r.student_id === p.id),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name}
                      </option>
                    ))}
                </select>
              </Field>
            </SaveForm>
          )}
        </section>
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>Lesson files</h2>
            <Upload size={20} />
          </div>
          {files.length ? (
            files.map((f) => <FileRow key={f.id} file={f} />)
          ) : (
            <p className="ws-muted">
              Files saved for this class will appear here.
            </p>
          )}
          {data.account.role !== 'parent' && lesson.status !== 'cancelled' && (
            <SaveForm
              action="file_upload"
              values={{ lesson_id: id }}
              label={teacher ? 'Upload class resource' : 'Save file'}
            >
              <Field
                label={
                  teacher
                    ? 'Class resource (up to 10 MB)'
                    : 'Your file (up to 10 MB)'
                }
              >
                <input
                  name="file"
                  type="file"
                  accept={LESSON_FILE_ACCEPT}
                  required
                />
              </Field>
            </SaveForm>
          )}
        </section>
      </div>
      {teacher ? (
        <ClassNotes lessonId={id} students={students} />
      ) : (
        students.map((s) => {
          const report = data.reports.find(
              (r) => r.lesson_id === id && r.student_id === s.id,
            ),
            feedback = data.feedback.find(
              (r) => r.lesson_id === id && r.student_id === s.id,
            );
          return (
            <section className="ws-panel ws-spaced" key={s.id}>
              <div className="ws-section-heading">
                <h2>
                  {teacher
                    ? `${s.display_name} · class notes`
                    : 'From your teacher'}
                </h2>
                {report && <Tag tone="attended">Published</Tag>}
              </div>
              {report ? (
                <div className="ws-report">
                  {report.topics && (
                    <p>
                      <strong>What we explored</strong>
                      <br />
                      {report.topics}
                    </p>
                  )}
                  <p className="preserve-lines">{report.note}</p>
                  {report.practice && (
                    <p>
                      <strong>Next steps</strong>
                      <br />
                      {report.practice}
                    </p>
                  )}
                </div>
              ) : (
                <p className="ws-muted">
                  Your teacher’s published comments will appear here.
                </p>
              )}
              {teacher && (
                <details>
                  <summary>
                    {feedback
                      ? 'Edit feedback and publication'
                      : 'Write a class update'}
                  </summary>
                  <SaveForm
                    action="feedback_save"
                    values={{ lesson_id: id, student_id: s.id }}
                    label="Save class update"
                  >
                    <Field label="Topics covered">
                      <textarea
                        name="topics"
                        maxLength={2000}
                        defaultValue={feedback?.topics}
                        rows={2}
                      />
                    </Field>
                    <Field label="Comments for the student and parents">
                      <textarea
                        name="note"
                        required
                        maxLength={5000}
                        defaultValue={feedback?.note}
                        rows={4}
                      />
                    </Field>
                    <Field label="Next steps">
                      <textarea
                        name="practice"
                        maxLength={2000}
                        defaultValue={feedback?.practice}
                        rows={2}
                      />
                    </Field>
                    <Field label="Visibility">
                      <select
                        name="status"
                        defaultValue={feedback?.status || 'draft'}
                      >
                        <option value="draft">
                          Private draft · teachers only
                        </option>
                        <option value="published">
                          Publish to student and linked parents
                        </option>
                      </select>
                    </Field>
                    <p className="ws-muted">
                      Saving a draft keeps the last published update visible to
                      the family.
                    </p>
                  </SaveForm>
                  {feedback && (
                    <Action
                      action="feedback_delete"
                      values={{ lesson_id: id, student_id: s.id }}
                      confirm="Delete this feedback and withdraw its published family update?"
                    >
                      Delete and withdraw update
                    </Action>
                  )}
                </details>
              )}
              <div className="ws-student-comments">
                <h3>{teacher ? 'Student reflections' : 'Your class notes'}</h3>
                {data.comments
                  .filter((c) => c.lesson_id === id && c.student_id === s.id)
                  .map((c) => (
                    <article key={c.id}>
                      <p className="preserve-lines">{c.body}</p>
                      <small>{lessonDate(c.created_at)}</small>
                      {data.account.role === 'student' && (
                        <div className="ws-inline-actions">
                          <Modal
                            title="Edit your note"
                            trigger="Edit"
                            className="ws-text-button"
                          >
                            {(close) => (
                              <SaveForm
                                action="comment_save"
                                values={{ id: c.id, lesson_id: id }}
                                onSaved={close}
                              >
                                <Field label="Your note">
                                  <textarea
                                    name="body"
                                    required
                                    maxLength={5000}
                                    defaultValue={c.body}
                                    rows={4}
                                  />
                                </Field>
                              </SaveForm>
                            )}
                          </Modal>
                          <Action
                            action="comment_delete"
                            values={{ id: c.id }}
                            confirm="Delete this note?"
                          >
                            Delete
                          </Action>
                        </div>
                      )}
                    </article>
                  ))}
                {data.account.role === 'student' && (
                  <SaveForm
                    action="comment_save"
                    values={{ lesson_id: id }}
                    label="Save note"
                  >
                    <Field label="Add your own note">
                      <textarea
                        name="body"
                        maxLength={5000}
                        required
                        placeholder="What did you build? What would you like to try next?"
                        rows={3}
                      />
                    </Field>
                  </SaveForm>
                )}
              </div>
            </section>
          );
        })
      )}
      {teacher && (
        <div className="ws-danger-zone">
          <Action
            action="lesson_delete"
            values={{ id }}
            confirm="Delete this class, attendance, comments, and feedback? Classes with saved files must be cancelled instead."
          >
            Delete class
          </Action>
          <Link className="ws-text-link" href={href('calendar')}>
            Back to calendar <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}

// Teachers see every student's update in one compact list; writing happens in a dialog.
function ClassNotes({
  lessonId,
  students,
}: {
  lessonId: string;
  students: WorkspaceData['people'];
}) {
  const { data } = useStudio();
  const published = students.filter((s) =>
    data.reports.some((r) => r.lesson_id === lessonId && r.student_id === s.id),
  ).length;
  return (
    <section className="ws-panel ws-spaced">
      <div className="ws-section-heading">
        <h2>Class notes</h2>
        <Tag>
          {published}/{students.length} published
        </Tag>
      </div>
      {!students.length && (
        <p className="ws-muted">Add students to write their class notes.</p>
      )}
      {students.map((s) => {
        const report = data.reports.find(
          (r) => r.lesson_id === lessonId && r.student_id === s.id,
        );
        const feedback = data.feedback.find(
          (r) => r.lesson_id === lessonId && r.student_id === s.id,
        );
        const comments = data.comments.filter(
          (c) => c.lesson_id === lessonId && c.student_id === s.id,
        );
        const note = feedback?.note ?? report?.note;
        return (
          <div className="ws-note-row" key={s.id}>
            <div className="ws-roster-row">
              <Person name={s.display_name} />
              <Tag tone={report ? 'attended' : ''}>
                {report ? 'Published' : feedback ? 'Draft' : 'Not written'}
              </Tag>
              <Modal
                title={`Class update · ${s.display_name}`}
                trigger={feedback || report ? 'Edit update' : 'Write update'}
                className="ws-text-button"
              >
                {(close) => (
                  <>
                    <SaveForm
                      action="feedback_save"
                      values={{ lesson_id: lessonId, student_id: s.id }}
                      label="Save class update"
                      onSaved={close}
                    >
                      <Field label="Topics covered">
                        <textarea
                          name="topics"
                          maxLength={2000}
                          defaultValue={feedback?.topics}
                          rows={2}
                        />
                      </Field>
                      <Field label="Comments for the student and parents">
                        <textarea
                          name="note"
                          required
                          maxLength={5000}
                          defaultValue={feedback?.note}
                          rows={4}
                        />
                      </Field>
                      <Field label="Next steps">
                        <textarea
                          name="practice"
                          maxLength={2000}
                          defaultValue={feedback?.practice}
                          rows={2}
                        />
                      </Field>
                      <Field label="Visibility">
                        <select
                          name="status"
                          defaultValue={feedback?.status || 'draft'}
                        >
                          <option value="draft">
                            Private draft · teachers only
                          </option>
                          <option value="published">
                            Publish to student and linked parents
                          </option>
                        </select>
                      </Field>
                      <p className="ws-muted">
                        Saving a draft keeps the last published update visible
                        to the family.
                      </p>
                    </SaveForm>
                    {feedback && (
                      <Action
                        action="feedback_delete"
                        values={{ lesson_id: lessonId, student_id: s.id }}
                        confirm="Delete this feedback and withdraw its published family update?"
                      >
                        Delete and withdraw update
                      </Action>
                    )}
                  </>
                )}
              </Modal>
            </div>
            {note && <p className="ws-note-snippet">{note}</p>}
            {comments.length > 0 && (
              <details className="ws-note-reflections">
                <summary>Student reflections ({comments.length})</summary>
                {comments.map((c) => (
                  <article key={c.id}>
                    <p className="preserve-lines">{c.body}</p>
                    <small>{lessonDate(c.created_at)}</small>
                  </article>
                ))}
              </details>
            )}
          </div>
        );
      })}
    </section>
  );
}
