import Link from 'next/link';
import { configured } from '@/lib/supabase/server';
const messages: Record<string, string> = {
  registered:
    'Check your email to confirm your account. Your administrator will then assign your access.',
  registration:
    'We could not create the account. Check your email and use a password with 12–128 characters.',
  invalid: 'We could not sign you in. Check your login details and try again.',
  unavailable: 'Sign-in is temporarily unavailable. Please try again shortly.',
  sent: 'If an adult account matches that email, a password reset link has been requested. Check your inbox.',
  expired:
    'That password link is invalid or has expired. Please request another one.',
  signedout: 'You have signed out.',
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const ready = configured();
  return (
    <main id="main" className="account-shell">
      <Link className="wordmark" href="/">
        CodeLah<span>_</span>
      </Link>
      <div className="auth-intro">
        <p className="eyebrow">YOUR LEARNING STUDIO</p>
        <h1>Welcome back.</h1>
        <p>One place for your classes, learning, and weekly updates.</p>
      </div>
      {!ready && (
        <output className="notice">
          Account setup is in progress. The dashboard demo is ready to explore
          below.
        </output>
      )}
      {message && messages[message] && (
        <output className="notice">{messages[message]}</output>
      )}
      <div className="auth-grid">
        <section className="panel">
          <p className="eyebrow">FOR STUDENTS</p>
          <h2>Ready to learn?</h2>
          <form action="/auth/login" method="post" className="account-form">
            <input type="hidden" name="kind" value="student" />
            <label>
              Username
              <input
                name="identifier"
                autoComplete="username"
                required
                maxLength={24}
                placeholder="Your student username"
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
              Student sign in
            </button>
          </form>
          <p className="muted">
            Need help signing in? Ask your parent or teacher to set up or reset
            your password.
          </p>
        </section>
        <section className="panel">
          <p className="eyebrow">FOR PARENTS & TEACHERS</p>
          <h2>Stay connected.</h2>
          <form action="/auth/login" method="post" className="account-form">
            <input type="hidden" name="kind" value="adult" />
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
              Parent / teacher sign in
            </button>
          </form>
          <details>
            <summary>Forgot your password?</summary>
            <form action="/auth/recover" method="post" className="account-form">
              <label>
                Your account email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
              <button className="button" disabled={!ready}>
                Send reset link
              </button>
            </form>
          </details>
          <details>
            <summary>First time here? Create an adult account</summary>
            <form
              action="/auth/register"
              method="post"
              className="account-form"
            >
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Choose a password
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                />
              </label>
              <button className="button" disabled={!ready}>
                Create account
              </button>
            </form>
            <p className="muted">
              Confirm your email, then your administrator will assign your
              parent or teacher access.
            </p>
          </details>
        </section>
      </div>
      <p className="muted">
        Just exploring? <Link href="/demo">Open the dashboard demo</Link> with
        fictional classes.
      </p>
    </main>
  );
}
