import { formText } from '@/lib/accounts';
import { supabaseServer } from '@/lib/supabase/server';
import { safeOrigin } from '@/lib/accounts';
export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response('Invalid request origin', { status: 403 });
  try {
    const data = await request.formData();
    const email = formText(data, 'email').trim().toLowerCase();
    if (
      email.length <= 254 &&
      email.includes('@') &&
      !email.endsWith('@students.codelah.invalid')
    ) {
      const client = await supabaseServer();
      const { data: allowed, error } = await client.rpc(
        'consume_sign_in_attempt',
        { identifier: `recover:${email}` },
      );
      if (!error && allowed)
        await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/confirm`,
        });
    }
  } catch {
    /* Same response for unavailable, absent, and existing accounts. */
  }
  return Response.redirect(`${origin}/login?message=sent`, 303);
}
