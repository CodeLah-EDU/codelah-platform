import { cache } from 'react';
import { redirect } from 'next/navigation';
import { currentAccount } from './supabase/access';
import type { Account } from './accounts';
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
