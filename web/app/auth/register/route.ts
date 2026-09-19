import { formText } from '@/lib/accounts';
import { supabaseServer } from '@/lib/supabase/server';
import { safeOrigin, passwordError } from '@/lib/accounts';
export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response('Invalid request origin', { status: 403 });
  const data = await request.formData();
  const email = formText(data, 'email').trim().toLowerCase();
  const password = formText(data, 'password');
  if (
    passwordError(password) ||
    !email.includes('@') ||
    email.length > 254 ||
    email.endsWith('@students.codelah.invalid')
  )
    return Response.redirect(`${origin}/login?message=registration`, 303);
  try {
    const client = await supabaseServer();
    const { data: allowed, error: limitError } = await client.rpc(
      'consume_sign_in_attempt',
      { identifier: `register:${email}` },
    );
    if (limitError || !allowed)
      return Response.redirect(`${origin}/login?message=unavailable`, 303);
    const { error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    });
    if (error)
      return Response.redirect(`${origin}/login?message=registration`, 303);
  } catch {
    return Response.redirect(`${origin}/login?message=unavailable`, 303);
  }
  return Response.redirect(`${origin}/login?message=registered`, 303);
}
