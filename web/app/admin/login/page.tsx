import Link from 'next/link';
import { configured } from '@/lib/supabase/server';
export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const ready = configured();
  return (
    <main id="main" className="admin-login">
      <div className="admin-login-brand">
        <Link className="wordmark" href="/login">
          CodeLah<span>_</span>
        </Link>
        <div>
          <p className="eyebrow">ADMINISTRATION</p>
          <h1>
            Your teaching community,
            <br />
            in one place.
          </h1>
          <p>Student accounts. Family connections. Classes ready to teach.</p>
        </div>
        <span className="account-meta">CODELAH · ADMIN WORKSPACE</span>
      </div>
      <div className="account-shell admin-login-form">
        <p className="eyebrow">FOR ADMINISTRATORS</p>
        <h2>Administrator sign in</h2>
        <p className="muted">
          Use your existing administrator email and password.
        </p>
        {!ready && (
          <output className="notice">
            Account setup is unavailable. Please try again later.
          </output>
        )}
        {message && (
          <output className="notice">
            {message === 'signedout'
              ? 'You have signed out.'
              : message === 'unavailable'
                ? 'Sign-in is temporarily unavailable. Please try again shortly.'
                : 'We could not sign you in. Check your login details and try again.'}
          </output>
        )}
        <form action="/auth/login" method="post" className="account-form">
          <input type="hidden" name="kind" value="admin" />
          <label>
            Email address
            <input
              name="identifier"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <button className="button primary" disabled={!ready}>
            Sign in to administration
          </button>
        </form>
        <Link href="/login#recovery">Forgot your password?</Link>
        <div className="admin-login-divider" />
        <Link href="/login">← Student, parent & teacher sign in</Link>
      </div>
    </main>
  );
}
