import { supabaseServer } from '@/lib/supabase/server';
import { safeOrigin } from '@/lib/accounts';
export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response('Invalid request origin', { status: 403 });
  const client = await supabaseServer();
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error)
    return new Response('Could not sign out. Please try again.', {
      status: 503,
    });
  return Response.redirect(`${origin}/login?message=signedout`, 303);
}
