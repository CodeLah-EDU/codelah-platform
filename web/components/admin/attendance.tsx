'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  ClipboardCheck,
  Clock3,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  attendanceStatuses,
  attendanceSummary,
  shortDate,
} from '@/lib/admin-workspace';
import { singaporeDay } from '@/lib/workspace';
import { lessonTime } from '@/lib/lessons';
import { LessonEditor } from './lesson-editor';
import {
  useAdmin,
  useAdminReady,
  Avatar,
  Badge,
  Empty,
  Export,
  Field,
  Form,
  Heading,
  Metric,
  Modal,
  SearchBox,
} from './console-ui';

export function Attendance({ studentId }: { studentId?: string }) {
  const { data, now, today, href, search } = useAdmin();
  const ready = useAdminReady();
  const [from, setFrom] = useState(search.from ?? `${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(search.to ?? today);
  const [classroom, setClassroom] = useState(search.classroom ?? '');
  const [status, setStatus] = useState(search.status ?? 'all');
  const [query, setQuery] = useState('');
  const classes = data.classes;
  const name = (id: string) =>
    classes.find((c) => c.id === id)?.name ?? 'Class';
  const lessons = data.lessons
    .filter(
      (l) =>
        (!studentId ||
          data.roster.some(
            (r) => r.lesson_id === l.id && r.student_id === studentId,
          )) &&
        (!classroom || l.classroom_id === classroom) &&
        (!from || singaporeDay(l.starts_at) >= from) &&
        (!to || singaporeDay(l.starts_at) <= to) &&
        `${l.title} ${name(l.classroom_id)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const rows = lessons
    .map((lesson) => {
      const roster = data.roster.filter(
        (r) =>
          r.lesson_id === lesson.id &&
          (!studentId || r.student_id === studentId),
      );
      const counts = Object.fromEntries(
        attendanceStatuses.map((s) => [
          s,
          roster.filter(
            (r) =>
              (data.attendance.find(
                (a) =>
                  a.lesson_id === lesson.id && a.student_id === r.student_id,
              )?.status ?? 'unmarked') === s,
          ).length,
        ]),
      );
      const future = new Date(lesson.starts_at).valueOf() > now;
      return { lesson, roster, counts, future };
    })
    .filter(
      (row) =>
        status === 'all' ||
        (status === 'upcoming'
          ? row.future && row.lesson.status !== 'cancelled'
          : row.lesson.status !== 'cancelled' &&
            !row.future &&
            row.counts[status] > 0),
    );
  const summary = attendanceSummary(
    { ...data, lessons: rows.map((r) => r.lesson) },
    now,
    studentId,
  );
  const unavailable = data.unavailable.some((s) =>
    ['Attendance', 'Lessons', 'Lesson rosters'].includes(s),
  );
  return (
    <>
      {!studentId && (
        <Heading
          title="Attendance"
          action={
            <Modal title="Schedule a lesson" trigger="Schedule lesson">
              {(close) => <LessonEditor close={close} />}
            </Modal>
          }
        >
          Every lesson, every student. Keep the register up to date.
        </Heading>
      )}
      <div className="ops-metrics">
        <Metric
          title="Attendance rate"
          value={
            unavailable || summary.rate === null ? '—' : `${summary.rate}%`
          }
          detail="Present + late / recorded attendance"
          icon={<UserCheck size={20} />}
        />
        <Metric
          title="Attended"
          value={unavailable ? '—' : summary.present + summary.late}
          detail={`${summary.late} late · filtered completed lessons`}
          icon={<ClipboardCheck size={20} />}
        />
        <Metric
          title="Absent"
          value={unavailable ? '—' : summary.absent}
          detail={`${summary.excused} excused, counted separately`}
          icon={<UserX size={20} />}
        />
        <Metric
          title="Need marking"
          value={unavailable ? '—' : summary.unmarked}
          detail="Unmarked entries in past lessons"
          icon={<Clock3 size={20} />}
          tone="highlight"
        />
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>{studentId ? 'Attendance history' : 'Lesson register'}</h2>
            <p>Select a lesson to review and update attendance.</p>
          </div>
          <Export
            name="attendance-register"
            headers={[
              'Lesson',
              'Class',
              'Starts (Singapore)',
              'Student',
              'Attendance',
              'Note',
            ]}
            rows={rows.flatMap(({ lesson, roster }) =>
              roster.map((r) => {
                const a = data.attendance.find(
                  (a) =>
                    a.lesson_id === lesson.id && a.student_id === r.student_id,
                );
                return [
                  lesson.title,
                  name(lesson.classroom_id),
                  new Date(lesson.starts_at).toLocaleString('en-SG', {
                    timeZone: 'Asia/Singapore',
                  }),
                  data.people.find((p) => p.id === r.student_id)
                    ?.display_name ?? 'Student',
                  lesson.status === 'cancelled'
                    ? 'cancelled'
                    : (a?.status ?? 'unmarked'),
                  a?.note ?? '',
                ];
              }),
            )}
          />
        </div>
        <div className="ops-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            label="Search attendance"
            placeholder="Search lesson or class…"
          />
          <select
            aria-label="Attendance class"
            value={classroom}
            disabled={!ready}
            onChange={(e) => setClassroom(e.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Attendance filter"
            value={status}
            disabled={!ready}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All registers</option>
            <option value="unmarked">Needs marking</option>
            <option value="absent">Has absences</option>
            <option value="excused">Has excused entries</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>
        <div className="ops-date-filters">
          <label>
            From
            <input
              aria-label="Attendance from date"
              type="date"
              value={from}
              disabled={!ready}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              aria-label="Attendance to date"
              type="date"
              value={to}
              disabled={!ready}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            className="ops-text-button"
            onClick={() => {
              setFrom('');
              setTo('');
              setClassroom('');
              setStatus('all');
              setQuery('');
            }}
          >
            All dates / reset
          </button>
          <span>
            Singapore time · future and cancelled lessons excluded from rates
          </span>
        </div>
        {unavailable ? (
          <Empty title="Attendance records unavailable">
            Refresh to load the complete register.
          </Empty>
        ) : !rows.length ? (
          <Empty title="No lessons in this view">
            Change the date range or filters to find a register.
          </Empty>
        ) : (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Lesson / class</th>
                  <th>When</th>
                  <th>Register</th>
                  <th>Attended</th>
                  <th>Absent</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ lesson, roster, counts, future }) => (
                  <tr key={lesson.id}>
                    <td>
                      <Link
                        className="ops-record-link"
                        href={href(`attendance/${lesson.id}`)}
                      >
                        {lesson.title}
                      </Link>
                      <span className="ops-cell-note">
                        {name(lesson.classroom_id)} · {roster.length} students
                      </span>
                    </td>
                    <td>
                      {shortDate(lesson.starts_at)}
                      <span className="ops-cell-note">
                        {lessonTime(lesson.starts_at, lesson.ends_at)}
                      </span>
                    </td>
                    <td>
                      <Badge
                        value={
                          lesson.status === 'cancelled'
                            ? 'cancelled'
                            : future
                              ? 'upcoming'
                              : counts.unmarked
                                ? 'unmarked'
                                : roster.length
                                  ? 'complete'
                                  : 'empty'
                        }
                      />
                    </td>
                    <td>
                      {counts.present + counts.late}
                      <span className="ops-cell-note">{counts.late} late</span>
                    </td>
                    <td>
                      {counts.absent}
                      <span className="ops-cell-note">
                        {counts.excused} excused
                      </span>
                    </td>
                    <td>
                      <Link
                        className="ops-text-link"
                        href={href(`attendance/${lesson.id}`)}
                      >
                        Open register
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export function LessonRegister({ id }: { id: string }) {
  const { data, now, href } = useAdmin();
  const lesson = data.lessons.find((l) => l.id === id);
  const roster = data.roster.filter((r) => r.lesson_id === id);
  const [entries, setEntries] = useState(() =>
    roster.map((r) => {
      const saved = data.attendance.find(
        (a) => a.lesson_id === id && a.student_id === r.student_id,
      );
      return {
        student_id: r.student_id,
        status: saved?.status ?? 'unmarked',
        note: saved?.note ?? '',
      };
    }),
  );
  const ready = useAdminReady();
  if (!lesson)
    return (
      <Empty title="Lesson unavailable">
        This record may have been removed. Return to attendance and refresh.
      </Empty>
    );
  const editable =
    lesson.status !== 'cancelled' &&
    new Date(lesson.starts_at).valueOf() <= now;
  return (
    <>
      <Link className="ops-back" href={href('attendance')}>
        <ArrowLeft size={16} />
        Attendance
      </Link>
      <Heading
        title={lesson.title}
        eyebrow="LESSON REGISTER"
        action={
          <Modal title="Edit lesson" trigger="Edit lesson">
            {(close) => <LessonEditor id={id} close={close} />}
          </Modal>
        }
      >
        {data.classes.find((c) => c.id === lesson.classroom_id)?.name} ·{' '}
        {shortDate(lesson.starts_at)} ·{' '}
        {lessonTime(lesson.starts_at, lesson.ends_at)}
      </Heading>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Student attendance</h2>
            <p>
              {roster.length} / 4 students · save the whole register together.
            </p>
          </div>
          <Badge value={lesson.status} />
        </div>
        {!editable && (
          <p className="ops-banner">
            {lesson.status === 'cancelled'
              ? 'This lesson was cancelled. Its existing register is available for reference.'
              : 'Attendance can be marked when the lesson starts.'}
          </p>
        )}
        {!roster.length ? (
          <Empty title="No students on this roster">
            Assign students to the lesson before taking attendance.
          </Empty>
        ) : (
          <Form
            action="attendance_save"
            values={{ lesson_id: id, entries: JSON.stringify(entries) }}
            label="Save attendance"
            disabled={!editable}
          >
            <div className="ops-form-topline">
              <p>
                Use “Excused” for an approved absence. Leave unknown attendance
                unmarked.
              </p>
              {editable && (
                <button
                  type="button"
                  className="ops-button secondary"
                  disabled={!ready}
                  onClick={() =>
                    setEntries(
                      entries.map((e) =>
                        e.status === 'unmarked'
                          ? { ...e, status: 'present' }
                          : e,
                      ),
                    )
                  }
                >
                  <CheckCheck size={17} />
                  Mark unmarked present
                </button>
              )}
            </div>
            <fieldset disabled={!editable} className="ops-register-fields">
              {entries.map((entry, index) => {
                const person = data.people.find(
                  (p) => p.id === entry.student_id,
                );
                return (
                  <div className="ops-register-row" key={entry.student_id}>
                    <div className="ops-person">
                      <Avatar name={person?.display_name ?? 'Student'} />
                      <div>
                        <Link
                          className="ops-record-link"
                          href={href(`accounts/${entry.student_id}`)}
                        >
                          {person?.display_name ?? 'Student'}
                        </Link>
                        <span className="ops-cell-note">
                          {data.usernames.find(
                            (u) => u.student_id === entry.student_id,
                          )?.username ?? 'Student account'}
                        </span>
                      </div>
                    </div>
                    <Field
                      label={`Attendance for ${person?.display_name ?? 'student'}`}
                    >
                      <select
                        value={entry.status}
                        onChange={(e) =>
                          setEntries(
                            entries.map((item, i) =>
                              i === index
                                ? { ...item, status: e.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        {attendanceStatuses.map((s) => (
                          <option key={s} value={s}>
                            {s[0].toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field
                      label={`Note for ${person?.display_name ?? 'student'}`}
                    >
                      <input
                        value={entry.note}
                        maxLength={1000}
                        placeholder="Optional note"
                        onChange={(e) =>
                          setEntries(
                            entries.map((item, i) =>
                              i === index
                                ? { ...item, note: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </Field>
                  </div>
                );
              })}
            </fieldset>
            {!editable && (
              <p className="ops-form-note">
                Saving is unavailable for this lesson.
              </p>
            )}
          </Form>
        )}
      </section>
    </>
  );
}
