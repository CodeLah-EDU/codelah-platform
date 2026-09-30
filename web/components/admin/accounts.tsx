'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Link2,
  Mail,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { Account } from '@/lib/accounts';
import { attendanceSummary, money } from '@/lib/admin-workspace';
import {
  useAdmin,
  useAdminReady,
  Action,
  Avatar,
  Badge,
  Empty,
  Export,
  Field,
  Form,
  Heading,
  Metric,
  Modal,
  Pagination,
  SearchBox,
} from './console-ui';
import { FeeLedger } from './finance';
import { Attendance } from './attendance';

function AccessEditor({
  person,
  close,
}: {
  person: Account;
  close: () => void;
}) {
  const [role, setRole] = useState(person.role);
  return (
    <Form
      action="account_save"
      values={{ id: person.id }}
      onSaved={close}
      label="Save account"
    >
      <Field label="Display name">
        <input
          name="display_name"
          required
          maxLength={100}
          defaultValue={person.display_name}
        />
      </Field>
      {person.role === 'student' ? (
        <input type="hidden" name="role" value="student" />
      ) : (
        <Field label="Role">
          <select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Account['role'])}
          >
            <option value="pending">Awaiting a role</option>
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
          </select>
        </Field>
      )}
      <Field label="Account status">
        <select name="status" defaultValue={person.status}>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </Field>
      {person.role !== 'student' && (
        <p className="ops-form-note">
          Adult activation requires a verified email. Accounts with family or
          class connections must have those connections removed before changing
          their role.
        </p>
      )}
      <p className="ops-form-note">
        Suspending an account stops its access while preserving its records.
      </p>
    </Form>
  );
}
export function AccountDirectory({ role = 'all' }: { role?: string }) {
  const { data, href, search } = useAdmin();
  const ready = useAdminReady();
  const [query, setQuery] = useState(search.q ?? '');
  const [status, setStatus] = useState(search.status ?? 'all');
  const [page, setPage] = useState(1);
  const username = (id: string) =>
    data.usernames.find((u) => u.student_id === id)?.username ?? '';
  const filtered = data.people
    .filter(
      (p) =>
        (role === 'all' ||
          (role === 'pending'
            ? p.role === 'pending' || p.status === 'pending'
            : p.role === role)) &&
        (status === 'all' || p.status === status) &&
        `${p.display_name} ${p.contact_email ?? ''} ${username(p.id)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 12)),
  );
  const tabs = [
    ['all', 'All accounts', 'accounts'],
    ['student', 'Students', 'students'],
    ['parent', 'Parents', 'parents'],
    ['teacher', 'Teachers', 'teachers'],
    ['pending', 'Requests', 'adults'],
  ];
  const relation = (person: Account) =>
    person.role === 'student'
      ? `${data.enrolments.filter((e) => e.student_id === person.id && e.active).length} classes · ${data.links.filter((l) => l.student_id === person.id && l.active).length} parents`
      : person.role === 'parent'
        ? `${data.links.filter((l) => l.parent_id === person.id && l.active).length} linked children`
        : person.role === 'teacher'
          ? `${data.assignments.filter((a) => a.teacher_id === person.id && a.active).length} assigned classes`
          : person.role === 'admin'
            ? 'Studio administration'
            : 'Awaiting setup';
  return (
    <>
      <Heading
        title={
          role === 'pending'
            ? 'Account requests'
            : role === 'all'
              ? 'Accounts'
              : `${role[0].toUpperCase() + role.slice(1)}s`
        }
        action={
          <Link className="ops-button" href={href('accounts/new')}>
            <Plus size={18} />
            Create account
          </Link>
        }
      >
        People, family connections, and the right access for everyone.
      </Heading>
      <nav className="ops-tabs" aria-label="Account types">
        {tabs.map(([id, label, path]) => (
          <Link
            key={id}
            href={href(path)}
            aria-current={role === id ? 'page' : undefined}
          >
            {label}
            <span>
              {
                data.people.filter(
                  (p) =>
                    id === 'all' ||
                    (id === 'pending'
                      ? p.role === 'pending' || p.status === 'pending'
                      : p.role === id),
                ).length
              }
            </span>
          </Link>
        ))}
      </nav>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>
              {role === 'pending' ? 'Ready for review' : 'Account directory'}
            </h2>
            <p>
              {role === 'pending'
                ? 'Check the verified email, then assign a role and activate access.'
                : 'Open an account to see its details and connections.'}
            </p>
          </div>
          <Export
            name="account-directory"
            headers={[
              'Name',
              'Role',
              'Status',
              'Username',
              'Verified email',
              'Connections',
            ]}
            rows={filtered.map((p) => [
              p.display_name,
              p.role,
              p.status,
              username(p.id),
              p.contact_email,
              relation(p),
            ])}
          />
        </div>
        <div className="ops-toolbar">
          <SearchBox
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            label="Search accounts"
            placeholder="Search name, username, or email…"
          />
          <select
            aria-label="Account status filter"
            value={status}
            disabled={!ready}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <span className="ops-result-count">{filtered.length} accounts</span>
        </div>
        {!filtered.length ? (
          <Empty title="No accounts found">
            Try a different search or create a new account.
          </Empty>
        ) : (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Name / contact</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Connections</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice((currentPage - 1) * 12, currentPage * 12)
                  .map((person) => (
                    <tr key={person.id}>
                      <td>
                        <div className="ops-person">
                          <Avatar name={person.display_name} />
                          <div>
                            <Link
                              className="ops-record-link"
                              href={href(`accounts/${person.id}`)}
                            >
                              {person.display_name}
                            </Link>
                            <span className="ops-cell-note">
                              {person.role === 'student'
                                ? username(person.id) || 'Username pending'
                                : (person.contact_email ??
                                  'Email verification pending')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge value={person.role} />
                      </td>
                      <td>
                        <Badge value={person.status} />
                      </td>
                      <td>{relation(person)}</td>
                      <td>
                        <Link
                          className="ops-text-link"
                          href={href(`accounts/${person.id}`)}
                        >
                          {role === 'pending' ? 'Review' : 'View account'}
                          <ArrowRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={currentPage}
          total={filtered.length}
          size={12}
          onChange={setPage}
        />
      </section>
    </>
  );
}
export function CreateAccount({
  studentOnly = false,
}: {
  studentOnly?: boolean;
}) {
  const { href } = useAdmin();
  const router = useRouter();
  const [role, setRole] = useState(studentOnly ? 'student' : 'student');
  const ready = useAdminReady();
  return (
    <>
      <Link className="ops-back" href={href('accounts')}>
        <ArrowLeft size={16} />
        Accounts
      </Link>
      <Heading title="Create an account">
        Give a student their own login, or invite a parent or teacher.
      </Heading>
      <div className="ops-create-layout">
        <section className="ops-panel ops-form-panel">
          <fieldset className="ops-choice-grid" disabled={!ready}>
            <legend>Account type</legend>
            {['student', 'parent', 'teacher'].map((value) => (
              <label key={value} className={role === value ? 'selected' : ''}>
                <input
                  type="radio"
                  name="new-account-role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                />
                {value[0].toUpperCase() + value.slice(1)}
              </label>
            ))}
          </fieldset>
          <Form
            key={`create-${role}`}
            action={role === 'student' ? 'create_student' : 'invite_adult'}
            values={{ role }}
            label={
              role === 'student' ? 'Create student' : `Send ${role} invitation`
            }
            onSaved={(id) => router.push(href(`accounts/${id}`))}
          >
            <Field label={role === 'student' ? 'Student name' : 'Full name'}>
              <input
                name="display_name"
                maxLength={100}
                required
                autoComplete="off"
              />
            </Field>
            {role === 'student' ? (
              <>
                <Field
                  label="Username"
                  hint="4–24 lowercase letters, numbers, or underscores. Start with a letter."
                >
                  <input
                    name="username"
                    pattern="[a-z][a-z0-9_]{3,23}"
                    minLength={4}
                    maxLength={24}
                    required
                    autoComplete="off"
                    autoCapitalize="none"
                  />
                </Field>
                <Field
                  label="Initial password"
                  hint="Use 12–128 characters. Share it privately with the student."
                >
                  <input
                    name="password"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Email address">
                  <input
                    name="email"
                    type="email"
                    maxLength={254}
                    required
                    autoComplete="off"
                  />
                </Field>
                <p className="ops-form-note">
                  This sends an invitation to set a password and verify the
                  email. Review and activate the account after verification.
                </p>
              </>
            )}
          </Form>
        </section>
        <aside className="ops-setup-guide">
          <div className="ops-setup-icon">
            <Users size={29} />
          </div>
          <p className="ops-eyebrow">A GOOD START</p>
          <h2>
            A few steps,
            <br />
            ready to learn.
          </h2>
          <ol>
            <li>
              <strong>Create the account</strong>
              <p>
                Students use usernames. Parents and teachers use verified
                emails.
              </p>
            </li>
            <li>
              <strong>Make the connections</strong>
              <p>
                Link parents and children, then enrol the student in a class.
              </p>
            </li>
            <li>
              <strong>Keep everything together</strong>
              <p>
                Fees, attendance, and account details live in the same student
                record.
              </p>
            </li>
          </ol>
        </aside>
      </div>
    </>
  );
}
export function ParentLinkForm({
  studentId,
  parentId,
  close,
}: {
  studentId?: string;
  parentId?: string;
  close: () => void;
}) {
  const { data } = useAdmin();
  return (
    <Form
      action="parent_link"
      values={{ active: 'true' }}
      label="Link parent and student"
      onSaved={close}
    >
      <Field label="Student">
        <select name="student_id" required defaultValue={studentId ?? ''}>
          <option value="">Choose a student</option>
          {data.people
            .filter((p) => p.role === 'student')
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Parent">
        <select name="parent_id" required defaultValue={parentId ?? ''}>
          <option value="">Choose a parent</option>
          {data.people
            .filter((p) => p.role === 'parent' && p.status === 'active')
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
                {p.contact_email ? ` · ${p.contact_email}` : ''}
              </option>
            ))}
        </select>
      </Field>
      <p className="ops-form-note">
        A student can have multiple parents. A parent can be linked to multiple
        children.
      </p>
    </Form>
  );
}
export function AccountRecord({
  id,
  tab = 'overview',
}: {
  id: string;
  tab?: string;
}) {
  const { data, href, now } = useAdmin();
  const person = data.people.find((p) => p.id === id);
  if (!person)
    return (
      <Empty title="Account unavailable">
        Return to the directory and refresh to see current accounts.
      </Empty>
    );
  const student = person.role === 'student';
  const profile = data.profiles.find((p) => p.student_id === id);
  const parents = data.links
    .filter((l) => l.student_id === id && l.active)
    .map((l) => data.people.find((p) => p.id === l.parent_id))
    .filter((p): p is Account => Boolean(p));
  const children = data.links
    .filter((l) => l.parent_id === id && l.active)
    .map((l) => data.people.find((p) => p.id === l.student_id))
    .filter((p): p is Account => Boolean(p));
  const balance = data.payments
    .filter((p) => p.student_id === id && p.status === 'pending')
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const summary = attendanceSummary(data, now, id);
  const classIds = student
    ? data.enrolments
        .filter((e) => e.student_id === id && e.active)
        .map((e) => e.classroom_id)
    : data.assignments
        .filter((a) => a.teacher_id === id && a.active)
        .map((a) => a.classroom_id);
  return (
    <>
      <Link className="ops-back" href={href('accounts')}>
        <ArrowLeft size={16} />
        Accounts
      </Link>
      <Heading
        title={person.display_name}
        eyebrow="ACCOUNT RECORD"
        action={
          person.role !== 'admin' && (
            <Modal
              title="Edit account access"
              trigger={
                <>
                  <ShieldCheck size={18} />
                  Edit account
                </>
              }
            >
              {(close) => <AccessEditor person={person} close={close} />}
            </Modal>
          )
        }
      >
        <span className="ops-inline-badges">
          <Badge value={person.role} />
          <Badge value={person.status} />
        </span>
      </Heading>
      <nav className="ops-tabs" aria-label="Account sections">
        <Link
          href={href(`accounts/${id}`)}
          aria-current={tab === 'overview' ? 'page' : undefined}
        >
          Overview
        </Link>
        {student && (
          <>
            <Link
              href={href(`accounts/${id}/finances`)}
              aria-current={tab === 'finances' ? 'page' : undefined}
            >
              Fees & payments
            </Link>
            <Link
              href={href(`accounts/${id}/attendance`)}
              aria-current={tab === 'attendance' ? 'page' : undefined}
            >
              Attendance
            </Link>
          </>
        )}
      </nav>
      {student && tab === 'finances' ? (
        <FeeLedger studentId={id} compact />
      ) : student && tab === 'attendance' ? (
        <Attendance studentId={id} />
      ) : (
        <>
          {student && (
            <div className="ops-metrics three">
              <Metric
                title="Outstanding balance"
                value={
                  data.unavailable.includes('Student fees')
                    ? '—'
                    : money(balance)
                }
                detail="All pending fees"
              />
              <Metric
                title="Attendance rate"
                value={
                  data.unavailable.some((s) =>
                    ['Attendance', 'Lessons', 'Lesson rosters'].includes(s),
                  ) || summary.rate === null
                    ? '—'
                    : `${summary.rate}%`
                }
                detail="Present + late / marked past lessons"
              />
              <Metric
                title="Linked parents"
                value={parents.length}
                detail="Family accounts connected to this student"
              />
            </div>
          )}
          <div className="ops-record-grid">
            <section className="ops-panel">
              <div className="ops-panel-heading">
                <div>
                  <h2>Account details</h2>
                  <p>Identity and contact information.</p>
                </div>
                <Avatar name={person.display_name} />
              </div>
              <dl className="ops-detail-list">
                <div>
                  <dt>{student ? 'Username' : 'Verified email'}</dt>
                  <dd>
                    {student ? (
                      (data.usernames.find((u) => u.student_id === id)
                        ?.username ?? 'Not set')
                    ) : person.contact_email ? (
                      <a href={`mailto:${person.contact_email}`}>
                        {person.contact_email}
                      </a>
                    ) : (
                      'Verification pending'
                    )}
                  </dd>
                </div>
                {student && (
                  <>
                    <div>
                      <dt>School</dt>
                      <dd>{profile?.school || 'Not added'}</dd>
                    </div>
                    <div>
                      <dt>Year / level</dt>
                      <dd>{profile?.school_year || 'Not added'}</dd>
                    </div>
                    <div>
                      <dt>Contact phone</dt>
                      <dd>{profile?.phone || 'Not added'}</dd>
                    </div>
                    <div>
                      <dt>Notes</dt>
                      <dd className="ops-preserve">
                        {profile?.notes || 'No notes yet.'}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
              {student && (
                <div className="ops-panel-actions">
                  <Modal
                    title="Edit student details"
                    trigger="Edit student details"
                  >
                    {(close) => (
                      <Form
                        action="profile_save"
                        values={{ student_id: id }}
                        onSaved={close}
                      >
                        <Field label="School">
                          <input
                            name="school"
                            maxLength={160}
                            defaultValue={profile?.school}
                          />
                        </Field>
                        <Field label="School year">
                          <input
                            name="school_year"
                            maxLength={100}
                            defaultValue={profile?.school_year}
                          />
                        </Field>
                        <Field label="Phone">
                          <input
                            name="phone"
                            maxLength={40}
                            defaultValue={profile?.phone}
                          />
                        </Field>
                        <Field label="Notes">
                          <textarea
                            name="notes"
                            rows={4}
                            maxLength={5000}
                            defaultValue={profile?.notes}
                          />
                        </Field>
                      </Form>
                    )}
                  </Modal>
                  <Modal
                    title="Reset student password"
                    trigger={
                      <>
                        <KeyRound size={17} />
                        Reset password
                      </>
                    }
                  >
                    {(close) => (
                      <Form
                        action="reset_password"
                        values={{ student_id: id }}
                        label="Change student password"
                        onSaved={close}
                      >
                        <Field
                          label="New password"
                          hint="Share the new password privately with the student."
                        >
                          <input
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            minLength={12}
                            maxLength={128}
                            required
                          />
                        </Field>
                      </Form>
                    )}
                  </Modal>
                </div>
              )}
            </section>
            {(student || person.role === 'parent') && (
              <section className="ops-panel">
                <div className="ops-panel-heading">
                  <div>
                    <h2>{student ? 'Linked parents' : 'Linked children'}</h2>
                    <p>Family access and contact details.</p>
                  </div>
                  <Modal
                    title="Link a parent"
                    trigger={
                      <>
                        <Link2 size={17} />
                        Link
                      </>
                    }
                  >
                    {(close) => (
                      <ParentLinkForm
                        studentId={student ? id : undefined}
                        parentId={!student ? id : undefined}
                        close={close}
                      />
                    )}
                  </Modal>
                </div>
                {!(student ? parents : children).length ? (
                  <Empty title="No family links yet">
                    Connect the parent and student accounts here.
                  </Empty>
                ) : (
                  <ul className="ops-record-list">
                    {(student ? parents : children).map((p) => (
                      <li key={p.id}>
                        <div className="ops-person">
                          <Avatar name={p.display_name} />
                          <div>
                            <Link
                              className="ops-record-link"
                              href={href(`accounts/${p.id}`)}
                            >
                              {p.display_name}
                            </Link>
                            <span className="ops-cell-note">
                              {p.contact_email ? (
                                <a href={`mailto:${p.contact_email}`}>
                                  {p.contact_email}
                                </a>
                              ) : (
                                p.status
                              )}
                            </span>
                          </div>
                        </div>
                        <Action
                          action="parent_link"
                          values={{
                            parent_id: student ? p.id : id,
                            student_id: student ? id : p.id,
                            active: 'false',
                          }}
                          confirm={`Remove the family connection with ${p.display_name}? Their access to this student's records will end.`}
                        >
                          Unlink
                        </Action>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {(student || person.role === 'teacher') && (
              <section className="ops-panel">
                <div className="ops-panel-heading">
                  <div>
                    <h2>{student ? 'Enrolled classes' : 'Assigned classes'}</h2>
                    <p>Recurring class membership.</p>
                  </div>
                  <Link className="ops-text-link" href={href('classes')}>
                    Manage
                    <ArrowRight size={16} />
                  </Link>
                </div>
                {!classIds.length ? (
                  <Empty title="No classes connected">
                    Choose a class to set up the enrolment or teaching
                    assignment.
                  </Empty>
                ) : (
                  <ul className="ops-record-list">
                    {classIds.map((classId) => (
                      <li key={classId}>
                        <Link
                          className="ops-record-link"
                          href={href(`classes/${classId}`)}
                        >
                          {data.classes.find((c) => c.id === classId)?.name ??
                            'Class'}
                        </Link>
                        <Badge
                          value={
                            data.classes.find((c) => c.id === classId)?.active
                              ? 'active'
                              : 'archived'
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            {(person.role === 'pending' || person.status === 'pending') && (
              <section className="ops-panel ops-review-card">
                <Mail size={28} />
                <h2>Finish account setup</h2>
                <p>
                  {person.contact_email
                    ? 'The email is verified. Review the role and activate the account, then connect the family or classes.'
                    : 'Wait for email verification before activating this account.'}
                </p>
                <Modal
                  title="Review account"
                  trigger="Review access"
                  className="ops-button"
                >
                  {(close) => <AccessEditor person={person} close={close} />}
                </Modal>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}
export function Relationships() {
  const { data, href, search } = useAdmin();
  const [query, setQuery] = useState('');
  const links = data.links
    .filter(
      (l) => l.active && (!search.student || l.student_id === search.student),
    )
    .map((l) => ({
      ...l,
      parent: data.people.find((p) => p.id === l.parent_id),
      student: data.people.find((p) => p.id === l.student_id),
    }))
    .filter((l) =>
      `${l.parent?.display_name} ${l.student?.display_name} ${l.parent?.contact_email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  return (
    <>
      <Heading
        title="Family connections"
        action={
          <Modal
            title="Link a parent"
            trigger={
              <>
                <Link2 size={18} />
                Link a parent
              </>
            }
            className="ops-button"
          >
            {(close) => (
              <ParentLinkForm studentId={search.student} close={close} />
            )}
          </Modal>
        }
      >
        Multiple parents, multiple children. Keep every connection clear.
      </Heading>
      <section className="ops-panel">
        <div className="ops-toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            label="Search family connections"
            placeholder="Search parent, student, or email…"
          />
        </div>
        {!links.length ? (
          <Empty title="No matching family connections">
            Link a parent or change the search.
          </Empty>
        ) : (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Verified contact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={`${l.parent_id}-${l.student_id}`}>
                    <td>
                      <Link
                        className="ops-record-link"
                        href={href(`accounts/${l.student_id}`)}
                      >
                        {l.student?.display_name}
                      </Link>
                    </td>
                    <td>
                      <Link
                        className="ops-record-link"
                        href={href(`accounts/${l.parent_id}`)}
                      >
                        {l.parent?.display_name}
                      </Link>
                    </td>
                    <td>{l.parent?.contact_email ?? 'Verification pending'}</td>
                    <td>
                      <Action
                        action="parent_link"
                        values={{
                          parent_id: l.parent_id,
                          student_id: l.student_id,
                          active: 'false',
                        }}
                        confirm={`Unlink ${l.parent?.display_name} from ${l.student?.display_name}?`}
                      >
                        Unlink
                      </Action>
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
