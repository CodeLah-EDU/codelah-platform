import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Landing, type SignInProfile } from '@/components/landing';
import { configured, supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Sign in · Codelah Learning Studio',
};

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
  searchParams: Promise<{ message?: string; profile?: string }>;
}) {
  const { message, profile } = await searchParams;
  const ready = configured();
  let signedIn = false;
  let unavailable = false;
  if (ready) {
    try {
      const client = await supabaseServer();
      const { data } = await client.auth.getUser();
      signedIn = Boolean(data.user);
    } catch {
      unavailable = true;
    }
  }
  // The dashboard resolves the verified account role, including pending/suspended accounts.
  if (signedIn) redirect('/dashboard');
  const initialProfile: SignInProfile =
    profile === 'parent' || profile === 'teacher' || profile === 'student'
      ? profile
      : message &&
          ['registered', 'registration', 'sent', 'expired'].includes(message)
        ? 'parent'
        : 'student';
  return (
    <Landing
      key={`${initialProfile}-${message ?? ''}`}
      ready={ready}
      initialProfile={initialProfile}
      message={
        message
          ? messages[message]
          : unavailable
            ? messages.unavailable
            : undefined
      }
    />
  );
}
