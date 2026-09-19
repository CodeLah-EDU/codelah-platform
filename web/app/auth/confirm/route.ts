import { supabaseServer } from '@/lib/supabase/server';
export async function GET(request: Request) {
  const origin = process.env.APP_ORIGIN;
  if (!origin)
    return new Response('Account setup is incomplete', { status: 503 });
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const client = await supabaseServer();
  try {
    const result = code
      ? await client.auth.exchangeCodeForSession(code)
      : token_hash && (type === 'recovery' || type === 'invite')
        ? await client.auth.verifyOtp({ token_hash, type })
        : null;
    if (result && !result.error)
      return Response.redirect(`${origin}/auth/password`, 303);
  } catch {
    /* Expired or invalid token. */
  }
  return Response.redirect(`${origin}/login?message=expired`, 303);
}
