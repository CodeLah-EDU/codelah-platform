'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="account-shell">
      <section className="panel">
        <h1>We couldn’t load this page.</h1>
        <p>Please try again in a moment.</p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
