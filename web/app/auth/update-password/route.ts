import { formText } from '@/lib/accounts';
import { supabaseServer } from '@/lib/supabase/server';
import { safeOrigin, passwordError } from '@/lib/accounts';
export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response('Invalid request origin', { status: 403 });
  const fail = () => Response.redirect(`${origin}/auth/password?error=1`, 303);
  const data = await request.formData();
  const password = formText(data, 'password');
  if (passwordError(password) || password !== data.get('confirm'))
    return fail();
  const client = await supabaseServer();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return Response.redirect(`${origin}/login`, 303);
  const { error: updateError } = await client.auth.updateUser({ password });
  if (updateError) return fail();
  return Response.redirect(`${origin}/dashboard`, 303);
}
