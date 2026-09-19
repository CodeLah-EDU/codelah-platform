import { formText } from '@/lib/accounts';
import { supabaseServer } from './server';
import { safeOrigin, passwordError } from '@/lib/accounts';
export async function studentAction(
  request: Request,
  action: 'create_student' | 'reset_password',
) {
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
    const form = await request.formData();
    const password = formText(form, 'password');
    if (passwordError(password)) return finish('failed');
    const body =
      action === 'create_student'
        ? {
            action,
            password,
            username: formText(form, 'username'),
            display_name: formText(form, 'display_name'),
          }
        : {
            action,
            password,
            student_id: formText(form, 'student_id'),
          };
    const { error } = await client.functions.invoke('student-accounts', {
      body,
    });
    return finish(
      error ? 'failed' : action === 'create_student' ? 'created' : 'password',
    );
  } catch {
    return finish('failed');
  }
}
