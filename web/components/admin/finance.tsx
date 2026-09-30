'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  expenseCategories,
  financeSummary,
  money,
  monthLabel,
  paymentStatus,
  previousMonths,
  shortDate,
  type AdminData,
  type Expense,
} from '@/lib/admin-workspace';
import {
  useAdmin,
  useAdminReady,
  Action,
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

export function FeeForm({
  payment,
  studentId,
  close,
}: {
  payment?: AdminData['payments'][number];
  studentId?: string;
  close: () => void;
}) {
  const { data, today } = useAdmin();
  const [status, setStatus] = useState(payment?.status ?? 'pending');
  return (
    <Form
      action="fee_save"
      values={payment ? { id: payment.id } : {}}
      onSaved={close}
      label={payment ? 'Save fee record' : 'Add fee record'}
    >
      <Field label="Student">
        <select
          name="student_id"
          defaultValue={payment?.student_id ?? studentId ?? ''}
          required
        >
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
      <Field label="Description">
        <input
          name="description"
          required
          maxLength={200}
          placeholder="e.g. October Python tuition"
          defaultValue={payment?.description}
        />
      </Field>
      <div className="ops-form-grid">
        <Field label="Amount (SGD)">
          <input
            name="amount"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={
              payment ? (payment.amount_cents / 100).toFixed(2) : ''
            }
          />
        </Field>
        <Field label="Due date">
          <input
            name="due_on"
            type="date"
            required
            defaultValue={payment?.due_on ?? today}
          />
        </Field>
      </div>
      <Field label="Payment status">
        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>
      </Field>
      {status === 'paid' && (
        <Field label="Date received">
          <input
            name="paid_on"
            type="date"
            required
            defaultValue={payment?.paid_on ?? today}
            max={today}
          />
        </Field>
      )}
      <p className="ops-form-note">
        A fee record tracks one full payment. Mark it paid after receiving the
        money. Waived fees are excluded from income and balances.
      </p>
    </Form>
  );
}
function ExpenseForm({
  expense,
  close,
}: {
  expense?: Expense;
  close: () => void;
}) {
  const { today } = useAdmin();
  return (
    <Form
      action="expense_save"
      values={expense ? { id: expense.id } : {}}
      label={expense ? 'Save expense' : 'Add expense'}
      onSaved={close}
    >
      <Field label="Description">
        <input
          name="description"
          required
          maxLength={200}
          defaultValue={expense?.description}
          placeholder="e.g. September teaching sessions"
        />
      </Field>
      <div className="ops-form-grid">
        <Field label="Amount (SGD)">
          <input
            name="amount"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={
              expense ? (expense.amount_cents / 100).toFixed(2) : ''
            }
          />
        </Field>
        <Field label="Date paid">
          <input
            name="paid_on"
            type="date"
            required
            max={today}
            defaultValue={expense?.paid_on ?? today}
          />
        </Field>
      </div>
      <Field label="Category">
        <select name="category" defaultValue={expense?.category ?? 'Teaching'}>
          {expenseCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Paid to">
        <input
          name="vendor"
          maxLength={160}
          defaultValue={expense?.vendor}
          placeholder="Supplier or teacher name"
        />
      </Field>
      <Field label="Receipt or payment reference">
        <input
          name="reference"
          maxLength={160}
          defaultValue={expense?.reference}
        />
      </Field>
      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={expense?.notes}
        />
      </Field>
      <p className="ops-form-note">
        Record expenses that have been paid. They appear in the cash profit for
        the month of payment.
      </p>
    </Form>
  );
}
export function CashChart({ month }: { month: string }) {
  const { data, today } = useAdmin();
  if (
    data.unavailable.some((s) =>
      ['Student fees', 'Business expenses'].includes(s),
    )
  )
    return (
      <section className="ops-panel">
        <Empty title="Cash summary unavailable">
          Fee and expense records must both load before a total can be shown.
        </Empty>
      </section>
    );
  const months = previousMonths(month).map((m) => ({
    month: m,
    ...financeSummary(data, m, today),
  }));
  const max = Math.max(1, ...months.flatMap((m) => [m.received, m.spent]));
  return (
    <section className="ops-panel ops-cash-chart">
      <div className="ops-panel-heading">
        <div>
          <h2>Money in, money out</h2>
          <p>Six months ending {monthLabel(month)}</p>
        </div>
        <div className="ops-chart-key">
          <span>
            <i />
            Received
          </span>
          <span>
            <i />
            Expenses
          </span>
        </div>
      </div>
      <figure
        className="ops-bars"
        aria-label={months
          .map(
            (m) =>
              `${monthLabel(m.month)}: received ${money(m.received)}, expenses ${money(m.spent)}`,
          )
          .join('; ')}
      >
        {months.map((m) => (
          <div key={m.month} className="ops-bar-group">
            <div className="ops-bar-pair">
              <div
                style={{ height: `${(m.received / max) * 100}%` }}
                title={`Received: ${money(m.received)}`}
              />
              <div
                style={{ height: `${(m.spent / max) * 100}%` }}
                title={`Expenses: ${money(m.spent)}`}
              />
            </div>
            <span>{monthLabel(m.month).split(' ')[0].slice(0, 3)}</span>
          </div>
        ))}
      </figure>
      <p className="ops-caption">
        Income is counted on the date received; expenses on the date paid. All
        amounts in SGD.
      </p>
    </section>
  );
}
export function FeeLedger({
  studentId,
  compact = false,
}: {
  studentId?: string;
  compact?: boolean;
}) {
  const { data, today, href, search } = useAdmin();
  const ready = useAdminReady();
  const [query, setQuery] = useState(search.q ?? '');
  const [status, setStatus] = useState(search.status ?? 'all');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const name = (id: string) =>
    data.people.find((p) => p.id === id)?.display_name ?? 'Student';
  const filtered = data.payments
    .filter(
      (p) =>
        (!studentId || p.student_id === studentId) &&
        (!search.student || p.student_id === search.student) &&
        (!month || p.due_on.startsWith(month)) &&
        (status === 'all' ||
          (status === 'pending'
            ? p.status === 'pending'
            : paymentStatus(p, today) === status)) &&
        `${name(p.student_id)} ${p.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) => b.due_on.localeCompare(a.due_on) || a.id.localeCompare(b.id),
    );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 12)),
  );
  return (
    <section className="ops-panel ops-ledger">
      <div className="ops-panel-heading">
        <div>
          <h2>{compact ? 'Student fees' : 'Fee ledger'}</h2>
          <p>Charges, due dates, and payment records.</p>
        </div>
        <div className="ops-row-actions">
          <Export
            name="student-fees"
            headers={[
              'Student',
              'Description',
              'Amount (SGD)',
              'Due date',
              'Status',
              'Received on',
            ]}
            rows={filtered.map((p) => [
              name(p.student_id),
              p.description,
              (p.amount_cents / 100).toFixed(2),
              p.due_on,
              paymentStatus(p, today),
              p.paid_on,
            ])}
          />
          <Modal
            title="Add a fee"
            trigger={
              <>
                <Plus size={17} />
                Add fee
              </>
            }
            className="ops-button"
          >
            {(close) => <FeeForm studentId={studentId} close={close} />}
          </Modal>
        </div>
      </div>
      <div className="ops-toolbar">
        <SearchBox
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          label="Search fees"
          placeholder="Search students or fee descriptions…"
        />
        <select
          aria-label="Filter fees by status"
          value={status}
          disabled={!ready}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="pending">All outstanding</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="waived">Waived</option>
        </select>
        <label className="ops-inline-field">
          Due month
          <input
            type="month"
            aria-label="Fee due month"
            value={month}
            disabled={!ready}
            onChange={(event) => {
              setMonth(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <button
          className="ops-text-button"
          onClick={() => {
            setQuery('');
            setStatus('all');
            setMonth('');
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>
      {data.unavailable.includes('Student fees') ? (
        <Empty title="Fee records unavailable">
          Refresh to load the ledger before reviewing balances.
        </Empty>
      ) : !filtered.length ? (
        <Empty title="No fees match these filters">
          Add a fee or adjust the search to see payment records.
        </Empty>
      ) : (
        <div className="ops-table-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Student / description</th>
                <th>Due date</th>
                <th>Status</th>
                <th className="ops-number">Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice((currentPage - 1) * 12, currentPage * 12)
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={href(`accounts/${p.student_id}`)}
                        className="ops-record-link"
                      >
                        {name(p.student_id)}
                      </Link>
                      <span className="ops-cell-note">{p.description}</span>
                    </td>
                    <td>
                      {shortDate(p.due_on)}
                      {p.status === 'paid' && p.paid_on && (
                        <span className="ops-cell-note">
                          Received {shortDate(p.paid_on)}
                        </span>
                      )}
                    </td>
                    <td>
                      <Badge value={paymentStatus(p, today)} />
                    </td>
                    <td
                      className="ops-number"
                      aria-label={`Amount ${money(p.amount_cents)}`}
                    >
                      {money(p.amount_cents)}
                    </td>
                    <td aria-label="Fee actions">
                      <div className="ops-row-actions">
                        <Modal
                          title="Edit fee"
                          trigger="Edit"
                          className="ops-text-button"
                        >
                          {(close) => <FeeForm payment={p} close={close} />}
                        </Modal>
                        <Action
                          action="fee_delete"
                          values={{ id: p.id }}
                          confirm={`Delete ${p.description} for ${name(p.student_id)}? The change remains in finance history.`}
                          className="ops-text-button danger"
                        >
                          Delete
                        </Action>
                      </div>
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
  );
}
function Expenses() {
  const { data } = useAdmin();
  const ready = useAdminReady();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const filtered = data.expenses
    .filter(
      (e) =>
        (!category || e.category === category) &&
        (!month || e.paid_on.startsWith(month)) &&
        `${e.description} ${e.vendor} ${e.reference}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.paid_on.localeCompare(a.paid_on));
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 12)),
  );
  return (
    <section className="ops-panel">
      <div className="ops-panel-heading">
        <div>
          <h2>Business expenses</h2>
          <p>
            {money(filtered.reduce((sum, e) => sum + e.amount_cents, 0))} across
            the filtered records.
          </p>
        </div>
        <div className="ops-row-actions">
          <Export
            name="business-expenses"
            headers={[
              'Description',
              'Category',
              'Paid to',
              'Amount (SGD)',
              'Paid on',
              'Reference',
              'Notes',
            ]}
            rows={filtered.map((e) => [
              e.description,
              e.category,
              e.vendor,
              (e.amount_cents / 100).toFixed(2),
              e.paid_on,
              e.reference,
              e.notes,
            ])}
          />
          <Modal
            title="Add an expense"
            trigger={
              <>
                <Plus size={17} />
                Add expense
              </>
            }
            className="ops-button"
          >
            {(close) => <ExpenseForm close={close} />}
          </Modal>
        </div>
      </div>
      <div className="ops-toolbar">
        <SearchBox
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          label="Search expenses"
          placeholder="Search description, supplier, reference…"
        />
        <select
          aria-label="Expense category"
          disabled={!ready}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {expenseCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="ops-inline-field">
          Paid month
          <input
            aria-label="Expense paid month"
            type="month"
            disabled={!ready}
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <button
          className="ops-text-button"
          onClick={() => {
            setQuery('');
            setCategory('');
            setMonth('');
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>
      {data.unavailable.includes('Business expenses') ? (
        <Empty title="Expense records unavailable">
          Refresh to load the expense ledger.
        </Empty>
      ) : !filtered.length ? (
        <Empty title="No expenses to show">
          Record a paid expense or change the filters.
        </Empty>
      ) : (
        <div className="ops-table-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Expense / paid to</th>
                <th>Category</th>
                <th>Date paid</th>
                <th className="ops-number">Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice((currentPage - 1) * 12, currentPage * 12)
                .map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.description}</strong>
                      <span className="ops-cell-note">
                        {e.vendor || 'No supplier'}
                        {e.reference && ` · ${e.reference}`}
                      </span>
                    </td>
                    <td>
                      <Badge value={e.category} />
                    </td>
                    <td>{shortDate(e.paid_on)}</td>
                    <td
                      className="ops-number"
                      aria-label={`Amount ${money(e.amount_cents)}`}
                    >
                      {money(e.amount_cents)}
                    </td>
                    <td aria-label="Expense actions">
                      <div className="ops-row-actions">
                        <Modal
                          title="Edit expense"
                          trigger="Edit"
                          className="ops-text-button"
                        >
                          {(close) => <ExpenseForm expense={e} close={close} />}
                        </Modal>
                        <Action
                          action="expense_delete"
                          values={{ id: e.id }}
                          confirm={`Delete expense “${e.description}”? The change remains in finance history.`}
                          className="ops-text-button danger"
                        >
                          Delete
                        </Action>
                      </div>
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
  );
}
function auditText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return String(value);
  return JSON.stringify(value);
}
function FinanceHistory() {
  const { data } = useAdmin();
  return (
    <section className="ops-panel">
      <div className="ops-panel-heading">
        <div>
          <h2>Finance history</h2>
          <p>Latest 200 saved changes, including edits and deletions.</p>
        </div>
      </div>
      {!data.audit.length ? (
        <Empty title="No changes recorded yet">
          New fee and expense changes will appear here.
        </Empty>
      ) : (
        <div className="ops-table-scroll">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Change</th>
                <th>By / date</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {data.audit.map((entry) => {
                const record = entry.after_record ?? entry.before_record;
                return (
                  <tr key={entry.id}>
                    <td>
                      <strong>
                        {auditText(record?.description ?? 'Finance record')}
                      </strong>
                      <span className="ops-cell-note">
                        {entry.table_name === 'student_payments'
                          ? 'Student fee'
                          : 'Expense'}
                      </span>
                    </td>
                    <td>
                      <Badge value={entry.action.toLowerCase()} />
                    </td>
                    <td>
                      {data.people.find((p) => p.id === entry.changed_by)
                        ?.display_name ?? 'System'}
                      <span className="ops-cell-note">
                        {shortDate(entry.created_at)}
                      </span>
                    </td>
                    <td aria-label="Change details">
                      <details>
                        <summary>View changes</summary>
                        <div className="ops-audit-details">
                          {[
                            'amount_cents',
                            'status',
                            'due_on',
                            'paid_on',
                            'category',
                            'vendor',
                            'description',
                            'student_id',
                            'reference',
                            'notes',
                          ]
                            .filter(
                              (key) =>
                                entry.before_record?.[key] !==
                                entry.after_record?.[key],
                            )
                            .map((key) => (
                              <p key={key}>
                                <strong>{key.replaceAll('_', ' ')}</strong>:{' '}
                                {key === 'amount_cents' &&
                                entry.before_record?.[key] !== undefined
                                  ? money(Number(entry.before_record[key]))
                                  : auditText(
                                      entry.before_record?.[key] ?? '—',
                                    )}{' '}
                                →{' '}
                                {key === 'amount_cents' &&
                                entry.after_record?.[key] !== undefined
                                  ? money(Number(entry.after_record[key]))
                                  : auditText(entry.after_record?.[key] ?? '—')}
                              </p>
                            ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export function Finances({ tab = 'fees' }: { tab?: string }) {
  const { data, today, href } = useAdmin();
  const [month, setMonth] = useState(today.slice(0, 7));
  const ready = useAdminReady();
  const summary = financeSummary(data, month, today);
  const failed = data.unavailable.some((s) =>
    ['Student fees', 'Business expenses'].includes(s),
  );
  return (
    <>
      <Heading
        title="Finances"
        action={
          <label className="ops-inline-field">
            Summary month
            <input
              type="month"
              aria-label="Finance summary month"
              value={month}
              required
              disabled={!ready}
              onChange={(e) => {
                if (/^\d{4}-\d{2}$/.test(e.target.value))
                  setMonth(e.target.value);
              }}
            />
          </label>
        }
      >
        A clear view of tuition, expenses, and what’s left.
      </Heading>
      <div className="ops-metrics">
        <Metric
          title="Payments received"
          value={failed ? '—' : money(summary.received)}
          detail={monthLabel(month)}
          icon={<ArrowDownLeft size={20} />}
        />
        <Metric
          title="Expenses paid"
          value={failed ? '—' : money(summary.spent)}
          detail={monthLabel(month)}
          icon={<ArrowUpRight size={20} />}
        />
        <Metric
          title="Cash profit"
          value={failed ? '—' : money(summary.profit)}
          detail="Received minus expenses paid"
          icon={<TrendingUp size={20} />}
          tone="highlight"
        />
        <Metric
          title="Outstanding fees"
          value={failed ? '—' : money(summary.outstanding)}
          detail={`${money(summary.overdue)} overdue · all dates`}
          icon={<Wallet size={20} />}
        />
      </div>
      <div className="ops-finance-top">
        <CashChart month={month} />
        <section className="ops-panel ops-month-summary">
          <Receipt size={25} />
          <p className="ops-eyebrow">{monthLabel(month)}</p>
          <h2>Your month, at a glance.</h2>
          <dl>
            <div>
              <dt>Fees due this month</dt>
              <dd>{failed ? '—' : money(summary.billed)}</dd>
            </div>
            <div>
              <dt>Payments received</dt>
              <dd>{failed ? '—' : money(summary.received)}</dd>
            </div>
            <div>
              <dt>Expenses paid</dt>
              <dd>{failed ? '—' : money(summary.spent)}</dd>
            </div>
            <div>
              <dt>Cash profit</dt>
              <dd>{failed ? '—' : money(summary.profit)}</dd>
            </div>
          </dl>
          <p>
            Cash profit reflects recorded payments and expenses. Outstanding and
            waived fees are not income.
          </p>
          <Export
            name={`finance-summary-${month}`}
            headers={[
              'Month',
              'Payments received (SGD)',
              'Expenses paid (SGD)',
              'Cash profit (SGD)',
            ]}
            rows={
              failed
                ? []
                : [
                    [
                      month,
                      (summary.received / 100).toFixed(2),
                      (summary.spent / 100).toFixed(2),
                      (summary.profit / 100).toFixed(2),
                    ],
                  ]
            }
          />
        </section>
      </div>
      <nav className="ops-tabs" aria-label="Finance sections">
        {[
          ['fees', 'Student fees'],
          ['expenses', 'Expenses'],
          ['history', 'Change history'],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={href(`finances/${id}`)}
            aria-current={tab === id ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'expenses' ? (
        <Expenses />
      ) : tab === 'history' ? (
        <FinanceHistory />
      ) : (
        <FeeLedger />
      )}
    </>
  );
}
