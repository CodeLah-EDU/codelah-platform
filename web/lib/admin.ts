import { cache } from 'react';
import { redirect } from 'next/navigation';
import { currentAccount } from './supabase/access';
import type { Account } from './accounts';
import type { AdminData } from './admin-workspace';
export type Classroom = { id: string; name: string; active: boolean };
export const requireAdministrator = cache(async () => {
  const context = await currentAccount('/admin/login');
  if (context.error) throw new Error('Unable to load administrator access.');
  if (context.account?.role !== 'admin' || context.account.status !== 'active')
    redirect('/dashboard');
  return context;
});
export const adminData = cache(async () => {
  const { client } = await requireAdministrator();
  const results = await Promise.all([
    client
      .from('accounts')
      .select('id,display_name,role,status,contact_email')
      .order('display_name'),
    client.from('classrooms').select('id,name,active').order('name'),
    client.from('enrolments').select('classroom_id,student_id,active'),
    client.from('parent_student_links').select('parent_id,student_id,active'),
    client.from('teacher_assignments').select('classroom_id,teacher_id,active'),
    client.from('student_usernames').select('student_id,username'),
  ]);
  if (results.some((result) => result.error))
    throw new Error('Unable to load administration records.');
  return {
    people: (results[0].data ?? []) as Account[],
    classes: (results[1].data ?? []) as Classroom[],
    enrolments: (results[2].data ?? []) as {
      classroom_id: string;
      student_id: string;
      active: boolean;
    }[],
    links: (results[3].data ?? []) as {
      parent_id: string;
      student_id: string;
      active: boolean;
    }[],
    assignments: (results[4].data ?? []) as {
      classroom_id: string;
      teacher_id: string;
      active: boolean;
    }[],
    usernames: (results[5].data ?? []) as {
      student_id: string;
      username: string;
    }[],
  };
});

export const adminWorkspaceData = cache(async (): Promise<AdminData> => {
  const { client, account } = await requireAdministrator();
  const unavailable: string[] = [];
  async function read(
    table: string,
    columns: string,
    order: string[],
    label: string,
    cap?: number,
  ) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 1000) {
      let query = client.from(table).select(columns);
      for (const field of order)
        query = query.order(field, {
          ascending: !['admin_audit', 'student_password_changes'].includes(
            table,
          ),
        });
      const result = await query.range(offset, offset + (cap ?? 1000) - 1);
      if (result.error) {
        unavailable.push(label);
        return [];
      }
      rows.push(...(result.data ?? []));
      if (cap || (result.data?.length ?? 0) < 1000) return rows;
    }
  }
  const [
    people,
    classes,
    enrolments,
    links,
    assignments,
    usernames,
    lessons,
    roster,
    attendance,
    profiles,
    payments,
    expenses,
    audit,
    passwordChanges,
  ] = await Promise.all([
    read(
      'accounts',
      'id,display_name,role,status,contact_email',
      ['id'],
      'Accounts',
    ),
    read('classrooms', 'id,name,active', ['id'], 'Classes'),
    read(
      'enrolments',
      'classroom_id,student_id,active',
      ['classroom_id', 'student_id'],
      'Enrolments',
    ),
    read(
      'parent_student_links',
      'parent_id,student_id,active',
      ['parent_id', 'student_id'],
      'Family links',
    ),
    read(
      'teacher_assignments',
      'classroom_id,teacher_id,active',
      ['classroom_id', 'teacher_id'],
      'Teacher assignments',
    ),
    read(
      'student_usernames',
      'student_id,username',
      ['student_id'],
      'Usernames',
    ),
    read(
      'lessons',
      'id,classroom_id,title,objective,starts_at,ends_at,status',
      ['id'],
      'Lessons',
    ),
    read(
      'lesson_roster',
      'lesson_id,student_id',
      ['lesson_id', 'student_id'],
      'Lesson rosters',
    ),
    read(
      'lesson_attendance',
      'lesson_id,student_id,status,note',
      ['lesson_id', 'student_id'],
      'Attendance',
    ),
    read(
      'student_profiles',
      'student_id,school,school_year,phone,notes',
      ['student_id'],
      'Student profiles',
    ),
    read(
      'student_payments',
      'id,student_id,description,amount_cents,due_on,status,paid_on',
      ['id'],
      'Student fees',
    ),
    read(
      'admin_expenses',
      'id,description,category,vendor,amount_cents,paid_on,reference,notes',
      ['id'],
      'Business expenses',
    ),
    read(
      'admin_audit',
      'id,table_name,record_id,action,changed_by,before_record,after_record,created_at',
      ['created_at', 'id'],
      'Finance history',
      200,
    ),
    read(
      'student_password_changes',
      'id,student_id,changed_by,changed_by_role,created_at',
      ['created_at', 'id'],
      'Password history',
      500,
    ),
  ]);
  return {
    account: account!,
    people,
    classes,
    enrolments,
    links,
    assignments,
    usernames,
    lessons,
    roster,
    attendance,
    profiles,
    payments,
    expenses,
    audit,
    passwordChanges,
    unavailable,
  } as AdminData;
});
