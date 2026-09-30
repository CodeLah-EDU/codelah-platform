'use client';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  attendanceSummary,
  financeSummary,
  money,
  monthLabel,
  paymentStatus,
  shortDate,
} from '@/lib/admin-workspace';
import { lessonTime } from '@/lib/lessons';
import { useAdmin, Avatar, Badge, Empty, Heading, Metric } from './console-ui';
import { CashChart } from './finance';

export function Overview() {
  const { data, today, now, href } = useAdmin();
  const month = today.slice(0, 7);
  const finance = financeSummary(data, month, today);
  const attendance = attendanceSummary(data, now);
  const students = data.people.filter(
    (p) => p.role === 'student' && p.status === 'active',
  );
  const requests = data.people.filter(
    (p) => p.role === 'pending' || p.status === 'pending',
  );
  const overdue = data.payments
    .filter((p) => paymentStatus(p, today) === 'overdue')
    .sort((a, b) => a.due_on.localeCompare(b.due_on));
  const upcoming = data.lessons
    .filter(
      (l) => l.status === 'scheduled' && new Date(l.ends_at).valueOf() >= now,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const financialFailure = data.unavailable.some((s) =>
    ['Student fees', 'Business expenses'].includes(s),
  );
  return (
    <>
      <Heading
        title="Overview"
        action={
          <Link className="ops-button" href={href('accounts/new')}>
            <Plus size={18} />
            Create account
          </Link>
        }
      >
        Welcome back, {data.account.display_name.split(' ')[0]}. Here’s your
        studio at a glance.
      </Heading>
      <div className="ops-overview-banner">
        <div>
          <p className="ops-eyebrow">ROOM TO GROW</p>
          <h2>
            A little clarity.
            <br />
            More room to teach.
          </h2>
          <p>
            {students.length} active students ·{' '}
            {data.classes.filter((c) => c.active).length} active classes
          </p>
        </div>
        <div className="ops-banner-date">
          <CalendarDays size={20} />
          <span>{shortDate(today)}</span>
          <small>All times in Singapore</small>
        </div>
        <svg viewBox="0 0 140 160" fill="none" aria-hidden="true">
          <path
            d="M70 153V60M70 113C40 110 23 94 20 70M70 90C92 82 102 63 107 40"
            stroke="#8daa68"
            strokeWidth="3"
          />
          <path
            d="M0 0C-18-2-21-19-13-30C2-26 12-12 0 0Z"
            transform="translate(70 72) scale(1.7)"
            fill="#c6f568"
          />
          <path
            d="M0 0C-18-2-21-19-13-30C2-26 12-12 0 0Z"
            transform="translate(20 70) scale(1.1)"
            fill="#8daa68"
          />
          <path
            d="M0 0C-18-2-21-19-13-30C2-26 12-12 0 0Z"
            transform="translate(106 40) scale(1.1)"
            fill="#8daa68"
          />
        </svg>
      </div>
      <div className="ops-metrics">
        <Metric
          title="Payments received"
          value={financialFailure ? '—' : money(finance.received)}
          detail={monthLabel(month)}
          icon={<ArrowDownLeft size={20} />}
        />
        <Metric
          title="Cash profit"
          value={financialFailure ? '—' : money(finance.profit)}
          detail="This month · after paid expenses"
          icon={<TrendingUp size={20} />}
        />
        <Metric
          title="Overdue fees"
          value={financialFailure ? '—' : money(finance.overdue)}
          detail={`${overdue.length} unpaid records · all dates`}
          icon={<Wallet size={20} />}
          tone="warm"
        />
        <Metric
          title="Attendance rate"
          value={attendance.rate === null ? '—' : `${attendance.rate}%`}
          detail="All marked past lessons"
          icon={<ClipboardCheck size={20} />}
        />
      </div>
      <section className="ops-attention">
        <div>
          <p className="ops-eyebrow">NEEDS YOUR ATTENTION</p>
          <h2>Keep the day moving.</h2>
        </div>
        <Link href={href('finances/fees?status=overdue')}>
          <span className="ops-attention-icon">
            <Wallet size={20} />
          </span>
          <span>
            <strong>{overdue.length} overdue fees</strong>
            <small>Review outstanding payments</small>
          </span>
          <ArrowRight size={18} />
        </Link>
        <Link href={href('attendance?status=unmarked&from=&to=')}>
          <span className="ops-attention-icon">
            <ClipboardCheck size={20} />
          </span>
          <span>
            <strong>
              {attendance.unmarked} unmarked{' '}
              {attendance.unmarked === 1 ? 'entry' : 'entries'}
            </strong>
            <small>Complete lesson registers</small>
          </span>
          <ArrowRight size={18} />
        </Link>
        <Link href={href('adults')}>
          <span className="ops-attention-icon">
            <Users size={20} />
          </span>
          <span>
            <strong>{requests.length} account requests</strong>
            <small>Review and activate access</small>
          </span>
          <ArrowRight size={18} />
        </Link>
      </section>
      <div className="ops-overview-grid">
        <CashChart month={month} />
        <section className="ops-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Coming up</h2>
              <p>Next scheduled lessons.</p>
            </div>
            <Link
              className="ops-text-link"
              href={href('attendance?from=&to=&status=upcoming')}
            >
              View all
              <ArrowRight size={16} />
            </Link>
          </div>
          {!upcoming.length ? (
            <Empty title="A little breathing room">
              No upcoming lessons are scheduled.
            </Empty>
          ) : (
            <ul className="ops-upcoming">
              {upcoming.slice(0, 3).map((l) => (
                <li key={l.id}>
                  <div className="ops-date-tile">
                    <strong>
                      {new Date(l.starts_at).toLocaleDateString('en-SG', {
                        day: '2-digit',
                        timeZone: 'Asia/Singapore',
                      })}
                    </strong>
                    <span>
                      {new Date(l.starts_at).toLocaleDateString('en-SG', {
                        month: 'short',
                        timeZone: 'Asia/Singapore',
                      })}
                    </span>
                  </div>
                  <div>
                    <Link
                      className="ops-record-link"
                      href={href(`attendance/${l.id}`)}
                    >
                      {l.title}
                    </Link>
                    <p>
                      {data.classes.find((c) => c.id === l.classroom_id)?.name}
                    </p>
                    <small>
                      {lessonTime(l.starts_at, l.ends_at)} ·{' '}
                      {data.roster.filter((r) => r.lesson_id === l.id).length}{' '}
                      students
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="ops-overview-grid">
        <section className="ops-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Outstanding payments</h2>
              <p>Oldest overdue records first.</p>
            </div>
            <Link
              className="ops-text-link"
              href={href('finances/fees?status=overdue')}
            >
              Open ledger
              <ArrowRight size={16} />
            </Link>
          </div>
          {!overdue.length ? (
            <Empty title="Nothing overdue">
              All recorded fees are paid, waived, or not yet due.
            </Empty>
          ) : (
            <ul className="ops-record-list">
              {overdue.slice(0, 4).map((p) => {
                const person = data.people.find((s) => s.id === p.student_id);
                return (
                  <li key={p.id}>
                    <div className="ops-person">
                      <Avatar name={person?.display_name ?? 'Student'} />
                      <div>
                        <Link
                          className="ops-record-link"
                          href={href(`accounts/${p.student_id}/finances`)}
                        >
                          {person?.display_name}
                        </Link>
                        <span className="ops-cell-note">
                          Due {shortDate(p.due_on)}
                        </span>
                      </div>
                    </div>
                    <strong>{money(p.amount_cents)}</strong>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="ops-panel">
          <div className="ops-panel-heading">
            <div>
              <h2>Account requests</h2>
              <p>The next members of your teaching community.</p>
            </div>
            <Link className="ops-text-link" href={href('adults')}>
              Review all
              <ArrowRight size={16} />
            </Link>
          </div>
          {!requests.length ? (
            <Empty title="Everyone is set up">
              New registrations will appear here for review.
            </Empty>
          ) : (
            <ul className="ops-record-list">
              {requests.slice(0, 4).map((p) => (
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
                        {p.contact_email ?? 'Email verification pending'}
                      </span>
                    </div>
                  </div>
                  <Badge value="pending" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
