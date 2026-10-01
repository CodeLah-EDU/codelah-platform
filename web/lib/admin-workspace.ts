import type { Account } from './accounts';
import type { WorkspaceData } from './workspace';

export type Expense = {
  id: string;
  description: string;
  category: string;
  vendor: string;
  amount_cents: number;
  paid_on: string;
  reference: string;
  notes: string;
};
export type AuditEntry = {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changed_by: string | null;
  before_record: Record<string, unknown> | null;
  after_record: Record<string, unknown> | null;
  created_at: string;
};
export type PasswordChange = {
  id: string;
  student_id: string;
  changed_by: string | null;
  changed_by_role: 'admin' | 'parent';
  created_at: string;
};
export type AdminData = {
  account: Account;
  people: Account[];
  classes: WorkspaceData['classrooms'];
  enrolments: WorkspaceData['enrolments'];
  links: WorkspaceData['parents'];
  assignments: { classroom_id: string; teacher_id: string; active: boolean }[];
  usernames: { student_id: string; username: string }[];
  lessons: WorkspaceData['lessons'];
  roster: WorkspaceData['roster'];
  attendance: WorkspaceData['attendance'];
  profiles: WorkspaceData['profiles'];
  payments: WorkspaceData['payments'];
  expenses: Expense[];
  audit: AuditEntry[];
  passwordChanges: PasswordChange[];
  unavailable: string[];
};
export const expenseCategories = [
  'Teaching',
  'Software',
  'Marketing',
  'Rent & utilities',
  'Equipment',
  'Other',
];
export const attendanceStatuses = [
  'unmarked',
  'present',
  'late',
  'absent',
  'excused',
] as const;
export const money = (cents: number) =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    currencyDisplay: 'symbol',
  }).format(cents / 100);
export const shortDate = (date: string) =>
  new Intl.DateTimeFormat('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  }).format(new Date(date.length === 10 ? `${date}T00:00:00+08:00` : date));
export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en-SG', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
export function amountCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Enter an SGD amount with up to two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 100000000)
    throw new Error('Amount must be between $0 and $1,000,000.');
  return cents;
}
export function previousMonths(month: string, length = 6) {
  const [year, number] = month.split('-').map(Number);
  return Array.from({ length }, (_, index) =>
    new Date(Date.UTC(year, number - length + index, 1))
      .toISOString()
      .slice(0, 7),
  );
}
export function paymentStatus(
  payment: AdminData['payments'][number],
  today: string,
) {
  return payment.status === 'pending' && payment.due_on < today
    ? 'overdue'
    : payment.status;
}
export function financeSummary(
  data: Pick<AdminData, 'payments' | 'expenses'>,
  month: string,
  today: string,
) {
  const received = data.payments
    .filter((p) => p.status === 'paid' && p.paid_on?.startsWith(month))
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const spent = data.expenses
    .filter((e) => e.paid_on.startsWith(month))
    .reduce((sum, e) => sum + e.amount_cents, 0);
  const outstanding = data.payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const overdue = data.payments
    .filter((p) => paymentStatus(p, today) === 'overdue')
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const billed = data.payments
    .filter((p) => p.due_on.startsWith(month) && p.status !== 'waived')
    .reduce((sum, p) => sum + p.amount_cents, 0);
  return {
    received,
    spent,
    profit: received - spent,
    outstanding,
    overdue,
    billed,
  };
}
export function attendanceSummary(
  data: Pick<AdminData, 'lessons' | 'roster' | 'attendance'>,
  now: number,
  studentId?: string,
) {
  const eligible = new Set(
    data.lessons
      .filter(
        (l) => l.status !== 'cancelled' && new Date(l.ends_at).valueOf() <= now,
      )
      .map((l) => l.id),
  );
  const rows = data.roster.filter(
    (r) =>
      eligible.has(r.lesson_id) && (!studentId || studentId === r.student_id),
  );
  const counts = { present: 0, late: 0, absent: 0, excused: 0, unmarked: 0 };
  for (const row of rows) {
    const status =
      data.attendance.find(
        (a) => a.lesson_id === row.lesson_id && a.student_id === row.student_id,
      )?.status ?? 'unmarked';
    if (status in counts) counts[status as keyof typeof counts]++;
  }
  const marked = counts.present + counts.late + counts.absent;
  return {
    ...counts,
    total: rows.length,
    rate: marked
      ? Math.round(((counts.present + counts.late) / marked) * 100)
      : null,
  };
}
export function csvDocument(
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const cell = (value: string | number | null | undefined) => {
    const text = String(value ?? '');
    // Keep untrusted names/notes from becoming spreadsheet formulas.
    const safe =
      typeof value === 'string' && /^[\s]*[=+@\-\t\r]/.test(text)
        ? `'${text}`
        : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return (
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
  );
}
export function adminRouteValid(path: string[]) {
  const [section = 'overview', id, tab] = path;
  if (path.length > 3) return false;
  if (
    ['overview', 'relationships', 'adults', 'parents', 'teachers'].includes(
      section,
    )
  )
    return path.length === 1;
  if (section === 'finances')
    return (
      path.length <= 2 && (!id || ['fees', 'expenses', 'history'].includes(id))
    );
  if (section === 'attendance' || section === 'classes')
    return path.length <= 2;
  if (section === 'accounts' || section === 'students')
    return (
      path.length <= 3 &&
      (!tab || ['overview', 'finances', 'attendance'].includes(tab))
    );
  return false;
}
