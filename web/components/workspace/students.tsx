'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Circle,
  GraduationCap,
  KeyRound,
  Plus,
  Search,
} from 'lucide-react';
import { lessonDate } from '@/lib/lessons';
import { studentLessons } from '@/lib/workspace';
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
import { CalendarView } from './calendar';
import { WorksheetLibrary } from './worksheets';

export function StudentDirectory() {
  const { data, href } = useStudio();
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('');
  const students = data.people.filter(
    (p) =>
      p.role === 'student' &&
      p.display_name.toLowerCase().includes(search.toLowerCase()) &&
      (!course ||
        data.studentCourses.some(
          (c) => c.course_id === course && c.student_id === p.id,
        )),
  );
  return (
    <>
      <Title title="Students">
        A clear picture of every learner, all in one place.
      </Title>
      <div className="ws-library-toolbar">
        <label className="ws-search">
          <Search size={19} />
          <input
            aria-label="Search students"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a student…"
          />
        </label>
        <select
          aria-label="Filter students by course"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
        >
          <option value="">All courses</option>
          {data.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <p className="ws-results-line">{students.length} students</p>
      {!students.length ? (
        <Empty title="No students found">
          Students assigned to your teaching groups appear here.
        </Empty>
      ) : (
        <div className="ws-student-grid">
          {students.map((s) => {
            const courses = data.courses.filter((c) =>
              data.studentCourses.some(
                (sc) => sc.course_id === c.id && sc.student_id === s.id,
              ),
            );
            const attendance = data.attendance.filter(
              (a) =>
                a.student_id === s.id && ['present', 'late'].includes(a.status),
            );
            return (
              <Link
                href={href(`students/${s.id}/overview`)}
                className="ws-student-card"
                key={s.id}
              >
                <div className="ws-section-heading">
                  <Person
                    name={s.display_name}
                    subtitle={
                      data.profiles.find((p) => p.student_id === s.id)
                        ?.school_year || 'Student'
                    }
                  />
                  <ArrowUpRight size={20} />
                </div>
                <div className="ws-tags">
                  {courses.length ? (
                    courses.map((c) => (
                      <Tag key={c.id} tone="sage">
                        {c.name}
                      </Tag>
                    ))
                  ) : (
                    <Tag>Course not assigned</Tag>
                  )}
                </div>
                <div className="ws-student-card-footer">
                  <span>{attendance.length} classes attended</span>
                  <span>
                    {data.parents.filter((p) => p.student_id === s.id).length}{' '}
                    linked parents
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

export function StudentView({ id, tab }: { id?: string; tab: string }) {
  const { data, teacher, href } = useStudio();
  const student = data.people.find((p) => p.id === id && p.role === 'student');
  if (!student)
    return (
      <Empty title="No student connected yet">
        Your linked student records will appear here.
      </Empty>
    );
  const tabs = [
    ['overview', 'Overview'],
    ['calendar', 'Calendar'],
    ['timeline', 'Timeline'],
    ...(teacher ? [['worksheets', 'Worksheet assignment']] : []),
    ['objectives', 'Objective tracker'],
  ];
  const active = tabs.some((t) => t[0] === tab) ? tab : 'overview';
  return (
    <>
      {teacher && (
        <Link className="ws-back" href={href('students')}>
          <ArrowLeft size={17} /> All students
        </Link>
      )}
      <Title
        title={student.display_name}
        action={
          data.account.role === 'parent' && (
            <Modal
              title={`Reset ${student.display_name}’s password`}
              trigger={
                <>
                  <KeyRound size={17} /> Reset password
                </>
              }
            >
              {(close) => (
                <SaveForm
                  action="student_password"
                  values={{ student_id: student.id }}
                  label="Change password"
                  onSaved={close}
                >
                  <Field label="New password">
                    <input
                      type="password"
                      name="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                    />
                  </Field>
                  <p className="ws-muted">
                    At least 12 characters. This replaces the current password,
                    so share the new one with {student.display_name} privately.
                  </p>
                </SaveForm>
              )}
            </Modal>
          )
        }
      >
        {teacher
          ? 'One learner. Every part of their journey.'
          : 'Your child’s classes, progress, and teacher updates.'}
      </Title>
      <nav className="ws-tabs" aria-label="Student record">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={href(`students/${id}/${key}`)}
            aria-current={active === key ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {active === 'overview' && <Overview studentId={student.id} />}
      {active === 'calendar' && (
        <CalendarView key={student.id} student={student.id} embedded />
      )}
      {active === 'timeline' && <Timeline studentId={student.id} />}
      {active === 'worksheets' && teacher && (
        <WorksheetLibrary assignTo={student.id} />
      )}
      {active === 'objectives' && (
        <ProgressView student={student.id} embedded />
      )}
    </>
  );
}
function ProfileEditor({
  studentId,
  close,
}: {
  studentId: string;
  close: () => void;
}) {
  const { data } = useStudio();
  const student = data.people.find((s) => s.id === studentId)!;
  const profile = data.profiles.find((s) => s.student_id === studentId);
  return (
    <SaveForm
      action="profile_save"
      values={{ student_id: studentId }}
      onSaved={close}
    >
      <Field label="Full name">
        <input
          name="display_name"
          required
          maxLength={100}
          defaultValue={student.display_name}
        />
      </Field>
      <Field label="School">
        <input name="school" maxLength={200} defaultValue={profile?.school} />
      </Field>
      <div className="ws-form-grid">
        <Field label="School year">
          <input
            name="school_year"
            maxLength={100}
            defaultValue={profile?.school_year}
          />
        </Field>
        <Field label="Contact phone">
          <input
            name="phone"
            type="tel"
            maxLength={40}
            defaultValue={profile?.phone}
          />
        </Field>
      </div>
      <Field label="Learning notes (visible to the family)">
        <textarea
          name="notes"
          maxLength={5000}
          defaultValue={profile?.notes}
          rows={4}
        />
      </Field>
    </SaveForm>
  );
}
function PaymentEditor({
  studentId,
  paymentId,
  close,
}: {
  studentId: string;
  paymentId?: string;
  close: () => void;
}) {
  const { data } = useStudio();
  const payment = data.payments.find((p) => p.id === paymentId);
  const [status, setStatus] = useState(payment?.status || 'pending');
  return (
    <SaveForm
      action="payment_save"
      values={{
        student_id: studentId,
        ...(paymentId ? { id: paymentId } : {}),
      }}
      onSaved={close}
      label="Save payment record"
    >
      <p className="ws-muted">
        Record payment information here. This does not charge a card or collect
        a payment.
      </p>
      <Field label="Description">
        <input
          name="description"
          required
          maxLength={200}
          defaultValue={payment?.description}
          placeholder="e.g. October classes"
        />
      </Field>
      <div className="ws-form-grid">
        <Field label="Amount (SGD)">
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            max="1000000"
            required
            defaultValue={payment ? payment.amount_cents / 100 : undefined}
          />
        </Field>
        <Field label="Due date">
          <input
            name="due_on"
            type="date"
            required
            defaultValue={payment?.due_on}
          />
        </Field>
      </div>
      <Field label="Status">
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>
      </Field>
      {status === 'paid' && (
        <Field label="Payment date">
          <input
            name="paid_on"
            type="date"
            required
            defaultValue={payment?.paid_on || undefined}
          />
        </Field>
      )}
    </SaveForm>
  );
}
function Overview({ studentId }: { studentId: string }) {
  const { data, teacher } = useStudio();
  const student = data.people.find((p) => p.id === studentId)!;
  const profile = data.profiles.find((p) => p.student_id === studentId);
  const parents = data.people.filter((p) =>
    data.parents.some(
      (l) => l.student_id === studentId && l.parent_id === p.id,
    ),
  );
  const attendance = data.attendance.filter((a) => a.student_id === studentId);
  const payments = data.payments.filter((p) => p.student_id === studentId);
  return (
    <>
      <div className="ws-two-col">
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>Student details</h2>
            {teacher && (
              <Modal
                title="Edit student details"
                trigger="Edit"
                className="ws-text-button"
              >
                {(close) => (
                  <ProfileEditor studentId={studentId} close={close} />
                )}
              </Modal>
            )}
          </div>
          <dl className="ws-details">
            <div>
              <dt>Name</dt>
              <dd>{student.display_name}</dd>
            </div>
            <div>
              <dt>School</dt>
              <dd>{profile?.school || 'Not recorded'}</dd>
            </div>
            <div>
              <dt>School year</dt>
              <dd>{profile?.school_year || 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{profile?.phone || 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>
                <Tag tone="sage">{student.status}</Tag>
              </dd>
            </div>
          </dl>
          {profile?.notes && (
            <div className="ws-profile-note">
              <h3>Learning notes</h3>
              <p className="preserve-lines">{profile.notes}</p>
            </div>
          )}
          {teacher && profile && (
            <Action
              action="profile_delete"
              values={{ student_id: studentId }}
              confirm="Clear the school, phone, and learning notes? The student account is kept."
            >
              Clear profile details
            </Action>
          )}
        </section>
        <section className="ws-panel">
          <div className="ws-section-heading">
            <h2>Linked parents</h2>
            <Tag>{parents.length}</Tag>
          </div>
          {parents.length ? (
            parents.map((p) => (
              <div className="ws-parent" key={p.id}>
                <Person name={p.display_name} subtitle="Parent / guardian" />
                {p.contact_email ? (
                  <a href={`mailto:${p.contact_email}`}>{p.contact_email}</a>
                ) : (
                  <p className="ws-muted">Email not recorded</p>
                )}
              </div>
            ))
          ) : (
            <Empty title="No parents linked yet">
              An administrator can connect parent accounts to this student.
            </Empty>
          )}
        </section>
      </div>
      <div className="ws-stat-grid">
        {[
          {
            label: 'Classes attended',
            value: attendance.filter((a) =>
              ['present', 'late'].includes(a.status),
            ).length,
            tone: 'attended',
          },
          {
            label: 'Classes missed',
            value: attendance.filter((a) => a.status === 'absent').length,
            tone: 'missed',
          },
          {
            label: 'Excused classes',
            value: attendance.filter((a) => a.status === 'excused').length,
            tone: '',
          },
        ].map((s) => (
          <div className="ws-stat" key={s.label}>
            <Tag tone={s.tone}>{s.value}</Tag>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <section className="ws-panel">
        <div className="ws-section-heading">
          <div>
            <h2>Payment information</h2>
            <p className="ws-muted">
              Payment records maintained by your teacher.
            </p>
          </div>
          {teacher && (
            <Modal
              title="Record a payment"
              trigger={
                <>
                  <Plus size={17} /> Add record
                </>
              }
            >
              {(close) => <PaymentEditor studentId={studentId} close={close} />}
            </Modal>
          )}
        </div>
        {payments.length ? (
          <div className="ws-table-scroll">
            <table className="ws-table" aria-label="Payment records">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Paid on</th>
                  {teacher && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.description}</td>
                    <td>
                      {new Intl.NumberFormat('en-SG', {
                        style: 'currency',
                        currency: 'SGD',
                      }).format(p.amount_cents / 100)}
                    </td>
                    <td>{p.due_on}</td>
                    <td>
                      <Tag
                        tone={
                          p.status === 'paid'
                            ? 'attended'
                            : p.status === 'pending'
                              ? 'upcoming'
                              : ''
                        }
                      >
                        {p.status}
                      </Tag>
                    </td>
                    <td>{p.paid_on || '—'}</td>
                    {teacher && (
                      <td>
                        <div
                          className="ws-inline-actions"
                          aria-label="Payment record actions"
                        >
                          <Modal
                            title="Edit payment record"
                            trigger="Edit"
                            className="ws-text-button"
                          >
                            {(close) => (
                              <PaymentEditor
                                studentId={studentId}
                                paymentId={p.id}
                                close={close}
                              />
                            )}
                          </Modal>
                          <Action
                            action="payment_delete"
                            values={{ id: p.id }}
                            confirm="Delete this payment record?"
                          >
                            Delete
                          </Action>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No payment records yet">
            Recorded payments and due dates will appear here.
          </Empty>
        )}
      </section>
    </>
  );
}
function Timeline({ studentId }: { studentId: string }) {
  const { data, href, now, teacher } = useStudio();
  const lessons = studentLessons(data, studentId)
    .filter(
      (l) => new Date(l.starts_at).valueOf() < now || l.status === 'completed',
    )
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return (
    <>
      <div className="ws-section-heading">
        <h2>Learning timeline</h2>
        <span className="ws-muted">Most recent first</span>
      </div>
      {lessons.length ? (
        <div className="ws-timeline">
          {lessons.map((l) => {
            const report = data.reports.find(
              (r) => r.student_id === studentId && r.lesson_id === l.id,
            );
            const attendance = data.attendance.find(
              (a) => a.student_id === studentId && a.lesson_id === l.id,
            );
            return (
              <article className="ws-timeline-item" key={l.id}>
                <div className="ws-timeline-date">
                  {lessonDate(l.starts_at)}
                </div>
                <div className="ws-panel">
                  <div className="ws-section-heading">
                    <h3>
                      <Link href={href(`calendar/${l.id}`)}>{l.title}</Link>
                    </h3>
                    <Tag
                      tone={
                        attendance?.status === 'absent'
                          ? 'missed'
                          : ['present', 'late'].includes(
                                attendance?.status || '',
                              )
                            ? 'attended'
                            : ''
                      }
                    >
                      {attendance?.status || 'Unmarked'}
                    </Tag>
                  </div>
                  {report ? (
                    <div className="ws-report">
                      <p>
                        <strong>{report.topics}</strong>
                      </p>
                      <p className="preserve-lines">{report.note}</p>
                      {report.practice && (
                        <p>
                          <strong>Next steps:</strong> {report.practice}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="ws-muted">No published teacher update yet.</p>
                  )}
                  {data.comments
                    .filter(
                      (c) => c.lesson_id === l.id && c.student_id === studentId,
                    )
                    .map((c) => (
                      <blockquote key={c.id}>
                        <span>Student note</span>
                        <p>{c.body}</p>
                      </blockquote>
                    ))}
                  {data.files
                    .filter(
                      (f) => f.lesson_id === l.id && f.student_id === studentId,
                    )
                    .map((f) => (
                      <FileRow key={f.id} file={f} />
                    ))}
                  <Link
                    className="ws-text-link"
                    href={href(`calendar/${l.id}`)}
                  >
                    {teacher ? 'Manage class activity' : 'View class'}{' '}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty title="A new learning story">
          Past classes and comments will appear here.
        </Empty>
      )}
    </>
  );
}

function CurriculumEditor() {
  const { data } = useStudio();
  return (
    <div className="ws-curriculum-editor">
      <p className="ws-muted">
        Courses and objectives are shared across the studio. Deleting a level
        removes its objectives and completion records.
      </p>
      <details>
        <summary>Add course</summary>
        <SaveForm action="course_save" label="Create course">
          <Field label="Course name">
            <input name="name" maxLength={100} required />
          </Field>
          <Field label="Description">
            <textarea name="description" maxLength={2000} rows={2} />
          </Field>
        </SaveForm>
      </details>
      {data.courses.map((course) => (
        <details key={course.id}>
          <summary>{course.name}</summary>
          <SaveForm action="course_save" values={{ id: course.id }}>
            <Field label="Course name">
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={course.name}
              />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                maxLength={2000}
                defaultValue={course.description}
                rows={2}
              />
            </Field>
          </SaveForm>
          <Action
            action="course_delete"
            values={{ id: course.id }}
            confirm={`Delete ${course.name}, all its levels and objectives, and student progress?`}
          >
            Delete course
          </Action>
          <details>
            <summary>Add level</summary>
            <SaveForm
              action="level_save"
              values={{ course_id: course.id }}
              label="Add level"
            >
              <Field label="Level name">
                <input name="name" required maxLength={100} />
              </Field>
              <Field label="Level number">
                <input
                  name="position"
                  type="number"
                  min="1"
                  max="100"
                  required
                />
              </Field>
            </SaveForm>
          </details>
          {data.levels
            .filter((l) => l.course_id === course.id)
            .map((level) => (
              <details key={level.id}>
                <summary>
                  Level {level.position} · {level.name}
                </summary>
                <SaveForm
                  action="level_save"
                  values={{ id: level.id, course_id: course.id }}
                >
                  <Field label="Level name">
                    <input
                      name="name"
                      required
                      maxLength={100}
                      defaultValue={level.name}
                    />
                  </Field>
                  <Field label="Level number">
                    <input
                      name="position"
                      type="number"
                      min="1"
                      max="100"
                      required
                      defaultValue={level.position}
                    />
                  </Field>
                </SaveForm>
                <Action
                  action="level_delete"
                  values={{ id: level.id }}
                  confirm="Delete this level and all its objectives and completion records?"
                >
                  Delete level
                </Action>
                <details>
                  <summary>Add objective</summary>
                  <SaveForm
                    action="objective_save"
                    values={{ level_id: level.id }}
                    label="Add objective"
                  >
                    <Field label="Objective">
                      <textarea
                        name="title"
                        required
                        maxLength={500}
                        rows={2}
                      />
                    </Field>
                    <Field label="Order">
                      <input
                        name="position"
                        type="number"
                        min="1"
                        max="100"
                        defaultValue="1"
                        required
                      />
                    </Field>
                  </SaveForm>
                </details>
                {data.objectives
                  .filter((o) => o.level_id === level.id)
                  .map((o) => (
                    <details key={o.id}>
                      <summary>{o.title}</summary>
                      <SaveForm
                        action="objective_save"
                        values={{ id: o.id, level_id: level.id }}
                      >
                        <Field label="Objective">
                          <textarea
                            name="title"
                            required
                            maxLength={500}
                            defaultValue={o.title}
                            rows={2}
                          />
                        </Field>
                        <Field label="Order">
                          <input
                            name="position"
                            type="number"
                            min="1"
                            max="100"
                            defaultValue={o.position}
                            required
                          />
                        </Field>
                      </SaveForm>
                      <Action
                        action="objective_delete"
                        values={{ id: o.id }}
                        confirm="Delete this objective and its completion records?"
                      >
                        Delete objective
                      </Action>
                    </details>
                  ))}
              </details>
            ))}
        </details>
      ))}
    </div>
  );
}
export function ProgressView({
  student,
  embedded = false,
}: {
  student?: string;
  embedded?: boolean;
}) {
  const { data, teacher } = useStudio();
  const courses = data.courses.filter((c) =>
    data.studentCourses.some(
      (s) => s.student_id === student && s.course_id === c.id,
    ),
  );
  const [selected, setSelected] = useState('');
  const course = courses.find((c) => c.id === selected) || courses[0];
  const levels = data.levels.filter((l) => l.course_id === course?.id);
  const objectives = data.objectives.filter((o) =>
    levels.some((l) => l.id === o.level_id),
  );
  const completed = data.progress.filter(
    (p) =>
      p.student_id === student &&
      objectives.some((o) => o.id === p.objective_id),
  );
  return (
    <>
      {!embedded && (
        <Title title="Progress">
          See what you’ve learned. Discover what comes next.
        </Title>
      )}
      {teacher && (
        <div className="ws-section-heading">
          <h2>Learning objectives</h2>
          <Modal title="Manage curriculum" trigger="Manage curriculum">
            {() => <CurriculumEditor />}
          </Modal>
        </div>
      )}
      {teacher && student && (
        <div className="ws-course-assignment">
          <SaveForm
            action="course_assign"
            values={{ student_id: student }}
            label="Assign course"
          >
            <Field label="Enrol in a course">
              <select name="course_id" defaultValue="" required>
                <option value="" disabled>
                  Choose a course
                </option>
                {data.courses
                  .filter((c) => !courses.some((s) => s.id === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
          </SaveForm>
        </div>
      )}
      {courses.length ? (
        <>
          <fieldset className="ws-course-tabs" aria-label="Course">
            {courses.map((c) => (
              <button
                key={c.id}
                className={c.id === course?.id ? 'active' : ''}
                onClick={() => setSelected(c.id)}
              >
                <GraduationCap size={19} />
                {c.name}
              </button>
            ))}
          </fieldset>
          <section className="ws-progress-summary">
            <div>
              <span className="ws-caption">YOUR LEARNING PATH</span>
              <h2>{course?.name}</h2>
              <p>{course?.description}</p>
            </div>
            <div className="ws-progress-total">
              <strong>
                {completed.length}
                <span> / {objectives.length}</span>
              </strong>
              <p>objectives completed</p>
              <div className="ws-progress-track">
                <span
                  style={{
                    width: `${objectives.length ? (completed.length / objectives.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </section>
          <div className="ws-levels">
            {levels.map((level) => {
              const goals = objectives.filter((o) => o.level_id === level.id);
              const done = goals.filter((o) =>
                completed.some((p) => p.objective_id === o.id),
              ).length;
              return (
                <section key={level.id} className="ws-level-card">
                  <div className="ws-level-number">
                    {String(level.position).padStart(2, '0')}
                  </div>
                  <div className="ws-level-content">
                    <div className="ws-section-heading">
                      <div>
                        <span className="ws-caption">
                          LEVEL {level.position}
                        </span>
                        <h2>{level.name}</h2>
                      </div>
                      <Tag
                        tone={done && done === goals.length ? 'attended' : ''}
                      >
                        {done}/{goals.length} complete
                      </Tag>
                    </div>
                    {goals.length ? (
                      <ul className="ws-objectives">
                        {goals.map((o) => {
                          const progress = completed.find(
                            (p) => p.objective_id === o.id,
                          );
                          return (
                            <li
                              key={o.id}
                              className={progress ? 'complete' : ''}
                            >
                              {progress ? (
                                <Check size={19} />
                              ) : (
                                <Circle size={19} />
                              )}
                              <span>
                                {o.title}
                                {progress && (
                                  <small>
                                    Completed{' '}
                                    {lessonDate(progress.completed_at)}
                                  </small>
                                )}
                              </span>
                              {teacher && student && (
                                <Action
                                  action={
                                    progress
                                      ? 'objective_reset'
                                      : 'objective_complete'
                                  }
                                  values={{
                                    student_id: student,
                                    objective_id: o.id,
                                  }}
                                >
                                  {progress ? 'Reset' : 'Mark complete'}
                                </Action>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="ws-muted">Objectives will be added here.</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {teacher && student && course && (
            <Action
              action="course_remove"
              values={{ student_id: student, course_id: course.id }}
              confirm={`Remove ${course.name} from this student’s current courses? Existing completion records are retained.`}
            >
              Remove course assignment
            </Action>
          )}
        </>
      ) : (
        <Empty title="Your learning path starts here">
          {teacher
            ? 'Create a course and its levels in Manage curriculum, then assign it to this student.'
            : 'Your teacher will connect your course and learning objectives here.'}
        </Empty>
      )}
    </>
  );
}
