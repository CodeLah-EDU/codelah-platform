import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export default async function Password({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const client = await supabaseServer();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await searchParams;
  return (
    <main id="main" className="account-shell">
      <Link className="wordmark" href="/dashboard">
        CodeLah_
      </Link>
      <section className="panel">
        <h1>Set your password.</h1>
        {error && (
          <p role="alert">
            We could not update your password. Use 12–128 characters and try
            again.
          </p>
        )}
        <form
          className="account-form"
          method="post"
          action="/auth/update-password"
        >
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <button className="button primary">Save password</button>
        </form>
      </section>
    </main>
  );
}
