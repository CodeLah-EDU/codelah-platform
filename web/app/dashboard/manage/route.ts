import { formText } from '@/lib/accounts';
import { supabaseServer } from '@/lib/supabase/server';
import { safeOrigin } from '@/lib/accounts';
export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response('Invalid request origin', { status: 403 });
  const finish = (message: string) =>
    Response.redirect(`${origin}/dashboard?message=${message}`, 303);
  try {
    const client = await supabaseServer();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return finish('denied');
    const { data: actor } = await client
      .from('accounts')
      .select('role,status')
      .eq('id', user.id)
      .single();
    if (actor?.role !== 'admin' || actor.status !== 'active')
      return finish('denied');
    const form = await request.formData();
    const value = (key: string) => formText(form, key).trim();
    const active = value('active') === 'true';
    let result;
    switch (value('action')) {
      case 'account': {
        const role = value('role'),
          status = value('status'),
          id = value('id'),
          display_name = value('display_name');
        if (
          id === user.id ||
          !['parent', 'teacher', 'student', 'pending'].includes(role) ||
          !['active', 'pending', 'suspended'].includes(status) ||
          !display_name ||
          display_name.length > 100
        )
          return finish('failed');
        result = await client
          .from('accounts')
          .update({ role, status, display_name })
          .eq('id', id)
          .neq('role', 'admin')
          .select('id')
          .single();
        break;
      }
      case 'classroom': {
        const name = value('name');
        if (!name || name.length > 100) return finish('failed');
        result = await client.from('classrooms').insert({ name });
        break;
      }
      case 'parent_link':
        result = await client.from('parent_student_links').upsert({
          parent_id: value('parent_id'),
          student_id: value('student_id'),
          active,
        });
        break;
      case 'teacher':
        result = await client.from('teacher_assignments').upsert({
          teacher_id: value('teacher_id'),
          classroom_id: value('classroom_id'),
          active,
        });
        break;
      case 'enrolment':
        result = await client.from('enrolments').upsert({
          student_id: value('student_id'),
          classroom_id: value('classroom_id'),
          active,
        });
        break;
      default:
        return finish('failed');
    }
    return finish(result.error ? 'failed' : 'saved');
  } catch {
    return finish('failed');
  }
}
