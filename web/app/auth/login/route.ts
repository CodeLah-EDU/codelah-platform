import { formText } from '@/lib/accounts';
import { supabaseServer } from '@/lib/supabase/server';
import { safeOrigin, studentEmail } from '@/lib/accounts';
export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response('Invalid request origin', { status: 403 });
  const fail = (message: string) =>
    Response.redirect(`${origin}/login?message=${message}`, 303);
  try {
    const data = await request.formData();
    const kind = data.get('kind');
    const identifier = formText(data, 'identifier').trim().toLowerCase();
    const password = formText(data, 'password');
    const email =
      kind === 'student'
        ? studentEmail(identifier)
        : kind === 'adult' &&
            identifier.includes('@') &&
            !identifier.endsWith('@students.codelah.invalid')
          ? identifier
          : null;
    if (!email || email.length > 254 || !password || password.length > 128)
      return fail('invalid');
    const client = await supabaseServer();
    const { data: allowed, error: limitError } = await client.rpc(
      'consume_sign_in_attempt',
      { identifier: email },
    );
    if (limitError || !allowed) return fail('invalid');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return fail('invalid');
    return Response.redirect(`${origin}/dashboard`, 303);
  } catch {
    return fail('unavailable');
  }
}
