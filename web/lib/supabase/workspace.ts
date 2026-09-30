import type { Account } from '@/lib/accounts';
import type { WorkspaceData } from '@/lib/workspace';
import type { supabaseServer } from './server';

export async function loadWorkspace(
  client: Awaited<ReturnType<typeof supabaseServer>>,
  account: Account,
) {
  const teacher = ['teacher', 'admin'].includes(account.role);
  const queries = {
    people: client
      .from('accounts')
      .select('id,display_name,role,status,contact_email')
      .order('display_name'),
    classrooms: client
      .from('classrooms')
      .select('id,name,active')
      .eq('active', true)
      .order('name'),
    enrolments: client
      .from('enrolments')
      .select('classroom_id,student_id,active')
      .eq('active', true),
    parents: client
      .from('parent_student_links')
      .select('parent_id,student_id,active')
      .eq('active', true),
    lessons: client
      .from('lessons')
      .select('id,classroom_id,title,objective,starts_at,ends_at,status')
      .order('starts_at'),
    roster: client.from('lesson_roster').select('lesson_id,student_id'),
    attendance: client
      .from('lesson_attendance')
      .select('lesson_id,student_id,status,note'),
    reports: client
      .from('lesson_reports')
      .select('lesson_id,student_id,topics,note,practice,published_at')
      .order('published_at', { ascending: false }),
    feedback: teacher
      ? client
          .from('lesson_feedback')
          .select('id,lesson_id,student_id,topics,note,practice,status')
      : Promise.resolve({ data: [], error: null }),
    comments: client
      .from('lesson_comments')
      .select('id,lesson_id,student_id,body,created_at')
      .order('created_at'),
    files: client
      .from('lesson_files')
      .select('id,lesson_id,student_id,kind,file_name,size_bytes,created_at')
      .order('created_at', { ascending: false }),
    worksheets: client
      .from('worksheets')
      .select(
        'id,title,description,tags,course_id,level_id,visibility,created_at',
      )
      .order('title'),
    assets: client
      .from('worksheet_assets')
      .select('worksheet_id,file_name,size_bytes'),
    assignments: client
      .from('worksheet_assignments')
      .select('worksheet_id,student_id'),
    courses: client.from('courses').select('*').order('name'),
    levels: client.from('course_levels').select('*').order('position'),
    objectives: client.from('course_objectives').select('*').order('position'),
    studentCourses: client.from('student_courses').select('*'),
    progress: client.from('objective_progress').select('*'),
    profiles: client.from('student_profiles').select('*'),
    payments: client
      .from('student_payments')
      .select('*')
      .order('due_on', { ascending: false }),
  };
  const entries = await Promise.all(
    Object.entries(queries).map(async ([key, query]) => {
      if (!('range' in query)) return [key, await query] as const;
      // Supabase caps individual responses. Read all authorised rows, including
      // large worksheet libraries and historical class records.
      const data: unknown[] = [];
      for (let offset = 0; ; offset += 500) {
        const result = await query.range(offset, offset + 499);
        if (result.error)
          return [key, { data: [], error: result.error }] as const;
        data.push(...(result.data ?? []));
        if (!result.data || result.data.length < 500) break;
      }
      return [key, { data, error: null }] as const;
    }),
  );
  const failed = entries
    .filter(([, result]) => result.error)
    .map(([key]) => key);
  const data = Object.fromEntries(
    entries.map(([key, result]) => [key, result.data ?? []]),
  );
  return { data: { ...data, account } as WorkspaceData, failed };
}
