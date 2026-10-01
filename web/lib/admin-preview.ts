import { workspacePreview } from './workspace-preview';
import { singaporeDay } from './workspace';
import { previousMonths, type AdminData } from './admin-workspace';

export function adminPreview(now: number): AdminData {
  const workspace = workspacePreview('teacher', now);
  const today = singaporeDay(new Date(now).toISOString());
  const month = today.slice(0, 7);
  // Unpaid examples fall due the day before, so the overdue examples exist on every date.
  const yesterday = singaporeDay(new Date(now - 86400000).toISOString());
  const account = {
    id: 'admin-preview',
    display_name: 'Sam Lee',
    role: 'admin',
    status: 'active',
    contact_email: 'sam@example.invalid',
  } as const;
  const students = workspace.people.filter((p) => p.role === 'student');
  const months = previousMonths(month);
  const payments: AdminData['payments'] = months.flatMap((m, index) =>
    students.slice(0, index === 5 ? 5 : 3).map((student, i) => ({
      id: `fee-${index}-${i}`,
      student_id: student.id,
      description: `${m} · Python tuition`,
      amount_cents: 24000 + i * 4000,
      due_on: index === 5 && i > 1 ? yesterday : `${m}-01`,
      status: index === 5 && i > 1 ? (i === 4 ? 'waived' : 'pending') : 'paid',
      paid_on:
        index === 5 && i > 1
          ? null
          : `${m}-${String(Math.min(Number(today.slice(-2)), 5 + i)).padStart(2, '0')}`,
    })),
  );
  const expenses = months.flatMap((m, index) => [
    {
      id: `expense-${index}-1`,
      description: 'Teaching sessions',
      category: 'Teaching',
      vendor: 'Alex Chen',
      amount_cents: 22000 + index * 2000,
      paid_on: `${m}-01`,
      reference: `T-${index + 1}`,
      notes: 'Fictional example expense.',
    },
    {
      id: `expense-${index}-2`,
      description: 'Learning tools subscription',
      category: 'Software',
      vendor: 'Example software',
      amount_cents: 3900,
      paid_on: `${m}-01`,
      reference: '',
      notes: '',
    },
  ]);
  const attendance = workspace.attendance.map((entry, i) => ({
    ...entry,
    status: i === 6 ? 'unmarked' : i === 7 ? 'late' : entry.status,
  }));
  return {
    account,
    people: [
      ...workspace.people,
      account,
      {
        id: 'new-parent',
        display_name: 'Priya Lim',
        role: 'pending',
        status: 'pending',
        contact_email: 'priya@example.invalid',
      },
      {
        id: 'new-teacher',
        display_name: 'Chris Wong',
        role: 'pending',
        status: 'pending',
        contact_email: 'chris@example.invalid',
      },
      {
        id: 'paused-student',
        display_name: 'Ethan Koh',
        role: 'student',
        status: 'suspended',
      },
    ],
    classes: workspace.classrooms,
    enrolments: students.map((student, i) => ({
      student_id: student.id,
      classroom_id: i < 3 ? 'class-python' : 'class-builders',
      active: true,
    })),
    links: workspace.parents,
    assignments: workspace.classrooms.map((c) => ({
      classroom_id: c.id,
      teacher_id: 'teacher',
      active: true,
    })),
    usernames: students.map((p) => ({
      student_id: p.id,
      username: `${p.id}_codes`,
    })),
    lessons: workspace.lessons,
    roster: workspace.roster,
    attendance,
    profiles: workspace.profiles,
    payments,
    expenses,
    audit: payments.slice(-3).map((p, i) => ({
      id: `audit-${i}`,
      table_name: 'student_payments',
      record_id: p.id,
      action: 'INSERT',
      changed_by: account.id,
      before_record: null,
      after_record: p,
      created_at: `${today}T09:00:00+08:00`,
    })),
    unavailable: [],
  };
}
