'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Play,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { TypewriterLogo } from '@/components/brand/typewriter-logo';

export type SignInProfile = 'student' | 'parent' | 'teacher';
const profiles = [
  {
    id: 'student',
    name: 'Student',
    Icon: GraduationCap,
    description: 'Your next discovery starts here.',
    demo: '/preview/student/home',
    detail: 'Worksheets, progress & your classes',
  },
  {
    id: 'parent',
    name: 'Parent',
    Icon: UsersRound,
    description: 'A little closer to every milestone.',
    demo: '/preview/parent/home',
    detail: 'Your children, classes & learning updates',
  },
  {
    id: 'teacher',
    name: 'Teacher',
    Icon: BookOpen,
    description: 'Make room for the next bright idea.',
    demo: '/preview/teacher/calendar',
    detail: 'Your calendar, students & lesson planning',
  },
] as const;
const subscribe = () => () => {};
const subscribeHash = (listener: () => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};

function Sprout({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 44"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 43V20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M20 27C4 27 3 17 3 11C14 11 20 17 20 27ZM20 20C20 5 28 2 37 2C37 12 31 20 20 20Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Leaf geometry is taken from the supplied Codelah vine asset. */
function Garden({ profile }: { profile: SignInProfile }) {
  return (
    <div className="entry-garden" data-profile={profile} aria-hidden="true">
      <svg viewBox="0 0 640 420" fill="none" className="entry-garden-art">
        <defs>
          <path id="entry-leaf" d="M0 0C-18-2-21-19-13-30C2-26 12-12 0 0Z" />
          <pattern
            id="entry-dots"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="#8daa68" opacity=".2" />
          </pattern>
          <linearGradient id="entry-pot" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#f7f7f0" />
            <stop offset="1" stopColor="#d9e9df" />
          </linearGradient>
        </defs>
        <path
          d="M105 336V212C105 93 201 15 320 15S535 93 535 212V336"
          fill="url(#entry-dots)"
          stroke="#8daa68"
          strokeOpacity=".18"
        />
        <path
          d="M141 336V211C141 113 221 51 320 51S499 113 499 211V336"
          stroke="#8daa68"
          strokeOpacity=".12"
        />
        <circle
          className="garden-sun"
          cx="457"
          cy="85"
          r="32"
          fill="#c6f568"
          fillOpacity=".13"
        />
        <circle cx="457" cy="85" r="21" stroke="#c6f568" strokeOpacity=".35" />
        <path d="M448 85h18m-9-9v18" stroke="#c6f568" strokeLinecap="round" />
        <ellipse
          cx="320"
          cy="371"
          rx="269"
          ry="19"
          fill="#14221a"
          fillOpacity=".55"
        />
        <path d="M61 370H579" stroke="#8daa68" strokeOpacity=".3" />
        <g className="garden-plant garden-student">
          <g className="garden-canopy">
            <path
              className="garden-stem"
              d="M159 301C154 270 165 242 155 212C149 194 159 177 168 160"
              stroke="#8daa68"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <g transform="translate(157 265) rotate(-61) scale(1.55)">
              <use className="garden-leaf" href="#entry-leaf" fill="#52734b" />
            </g>
            <g transform="translate(158 247) rotate(61) scale(1.6)">
              <use className="garden-leaf" href="#entry-leaf" fill="#8daa68" />
            </g>
            <g transform="translate(155 217) rotate(-55) scale(1.35)">
              <use className="garden-leaf" href="#entry-leaf" fill="#8daa68" />
            </g>
            <g transform="translate(161 184) rotate(55) scale(1.25)">
              <use
                className="garden-leaf garden-tip"
                href="#entry-leaf"
                fill="#c6f568"
              />
            </g>
          </g>
          <path
            d="M112 306H204L195 352Q193 368 176 368H140Q123 368 121 352Z"
            fill="url(#entry-pot)"
          />
          <rect x="107" y="296" width="102" height="16" rx="6" fill="#f7f7f0" />
          <text
            x="158"
            y="348"
            textAnchor="middle"
            fill="#315e4d"
            fontSize="23"
            fontFamily="IBM Plex Mono, monospace"
          >
            {'{ }'}
          </text>
          <circle
            className="garden-marker"
            cx="158"
            cy="396"
            r="3"
            fill="#c6f568"
          />
        </g>
        <g className="garden-plant garden-parent">
          <g className="garden-canopy">
            <path
              className="garden-stem"
              d="M318 274C326 227 306 202 316 173C326 143 314 115 319 86M320 224C288 210 278 191 278 166M320 186C345 169 355 158 361 136"
              stroke="#8daa68"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <g transform="translate(320 247) rotate(-65) scale(1.9)">
              <use className="garden-leaf" href="#entry-leaf" fill="#52734b" />
            </g>
            <g transform="translate(319 219) rotate(62) scale(2.05)">
              <use className="garden-leaf" href="#entry-leaf" fill="#8daa68" />
            </g>
            <g transform="translate(282 183) rotate(-56) scale(1.55)">
              <use className="garden-leaf" href="#entry-leaf" fill="#8daa68" />
            </g>
            <g transform="translate(278 166) rotate(26) scale(1.4)">
              <use className="garden-leaf" href="#entry-leaf" fill="#52734b" />
            </g>
            <g transform="translate(353 151) rotate(63) scale(1.6)">
              <use className="garden-leaf" href="#entry-leaf" fill="#52734b" />
            </g>
            <g transform="translate(361 136) rotate(4) scale(1.35)">
              <use className="garden-leaf" href="#entry-leaf" fill="#8daa68" />
            </g>
            <g transform="translate(320 145) rotate(-57) scale(1.7)">
              <use className="garden-leaf" href="#entry-leaf" fill="#8daa68" />
            </g>
            <g transform="translate(318 107) rotate(46) scale(1.6)">
              <use
                className="garden-leaf garden-tip"
                href="#entry-leaf"
                fill="#c6f568"
              />
            </g>
          </g>
          <path
            d="M263 284H377L369 350Q367 368 349 368H291Q273 368 271 350Z"
            fill="url(#entry-pot)"
          />
          <rect x="257" y="274" width="126" height="17" rx="6" fill="#f7f7f0" />
          <path
            d="M305 323C305 312 320 311 320 323C320 311 335 312 335 323C335 333 320 342 320 342S305 333 305 323Z"
            stroke="#315e4d"
            strokeWidth="2"
          />
          <circle
            className="garden-marker"
            cx="320"
            cy="396"
            r="3"
            fill="#c6f568"
          />
        </g>
        <g className="garden-plant garden-teacher">
          <g className="garden-canopy">
            <path
              className="garden-stem"
              d="M480 302C466 265 484 244 477 214S472 167 486 137"
              stroke="#8daa68"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <g transform="translate(478 277) rotate(63) scale(1.7)">
              <use className="garden-leaf" href="#entry-leaf" fill="#52734b" />
            </g>
            <g transform="translate(477 249) rotate(-58) scale(1.8)">
              <use className="garden-leaf" href="#entry-leaf" fill="#8daa68" />
            </g>
            <g transform="translate(477 216) rotate(65) scale(1.7)">
              <use className="garden-leaf" href="#entry-leaf" fill="#8daa68" />
            </g>
            <g transform="translate(475 191) rotate(-60) scale(1.5)">
              <use className="garden-leaf" href="#entry-leaf" fill="#52734b" />
            </g>
            <g transform="translate(484 149) rotate(54) scale(1.5)">
              <use
                className="garden-leaf garden-tip"
                href="#entry-leaf"
                fill="#c6f568"
              />
            </g>
          </g>
          <path
            d="M433 306H525L516 352Q514 368 497 368H461Q444 368 442 352Z"
            fill="url(#entry-pot)"
          />
          <rect x="428" y="296" width="102" height="16" rx="6" fill="#f7f7f0" />
          <path
            d="m471 328-9 8 9 8m16-16 9 8-9 8m-5-20-6 23"
            stroke="#315e4d"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            className="garden-marker"
            cx="479"
            cy="396"
            r="3"
            fill="#c6f568"
          />
        </g>
        <g className="garden-seed" fill="#c6f568">
          <circle cx="217" cy="138" r="2.5" />
          <circle cx="402" cy="235" r="2" />
          <circle cx="99" cy="245" r="2" />
        </g>
      </svg>
      <div className="entry-garden-note">
        <span aria-hidden="true">↳</span> a little care. a lot of possibility.
      </div>
    </div>
  );
}

export function Landing({
  ready,
  message,
  initialProfile = 'student',
}: {
  ready: boolean;
  message?: string;
  initialProfile?: SignInProfile;
}) {
  const [chosenProfile, setProfile] = useState<SignInProfile | null>(null);
  const recoveryRequested = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash === '#recovery',
    () => false,
  );
  const profile =
    chosenProfile ?? (recoveryRequested ? 'parent' : initialProfile);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const recovery = useRef<HTMLDetailsElement>(null);
  const current = profiles.find((item) => item.id === profile)!;
  const index = profiles.findIndex((item) => item.id === profile);
  const student = profile === 'student';

  useEffect(() => {
    // Keep existing /login#recovery links working, including the admin page.
    if (recoveryRequested && recovery.current) recovery.current.open = true;
  }, [recoveryRequested]);
  useEffect(() => {
    const reset = () => setSubmitting(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  return (
    <div className="platform-entry" data-profile={profile}>
      <header className="entry-header">
        <Link href="/" aria-label="Codelah home" className="entry-logo">
          <TypewriterLogo animated />
        </Link>
        <span className="entry-studio">LEARNING STUDIO</span>
        <Link href="/admin/login" className="entry-admin">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Administrator</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </header>
      <main id="main" className="entry-main">
        <section
          className="entry-story"
          aria-label="Welcome to the Codelah learning studio"
        >
          <div className="entry-story-copy">
            <p className="entry-eyebrow">
              <span /> A SPACE FOR CURIOUS MINDS
            </p>
            <h2>
              Good things
              <br />
              <span>grow here.</span>
            </h2>
            <p>
              A little curiosity. A little practice.
              <br />
              Something wonderful in the making.
            </p>
          </div>
          <Garden profile={profile} />
          <div className="entry-story-footer">
            <span>Rooted in curiosity.</span>
            <Sprout />
            <span>Growing with you.</span>
          </div>
        </section>
        <section className="entry-signin" aria-labelledby="entry-title">
          <div className="entry-form-wrap">
            <div className="entry-welcome-mark">
              <Sprout />
            </div>
            <p className="entry-eyebrow">YOUR LEARNING JOURNEY, CONTINUED</p>
            <h1 id="entry-title">Welcome back.</h1>
            <p className="entry-intro">
              Choose your profile. Let’s keep growing.
            </p>
            <fieldset
              className="entry-profiles"
              disabled={!hydrated || submitting}
            >
              <legend className="entry-sr-only">Choose your profile</legend>
              <span
                className="entry-profile-highlight"
                style={{ transform: `translateX(${index * 100}%)` }}
                aria-hidden="true"
              />
              {profiles.map(({ id, name, Icon }) => (
                <label
                  key={id}
                  className="entry-profile"
                  data-selected={profile === id}
                >
                  <input
                    type="radio"
                    name="profile-choice"
                    value={id}
                    checked={profile === id}
                    onChange={() => {
                      setProfile(id);
                      setShowPassword(false);
                    }}
                  />
                  <Icon size={22} strokeWidth={1.65} aria-hidden="true" />
                  <span>{name}</span>
                  <span className="entry-profile-dot" aria-hidden="true" />
                </label>
              ))}
            </fieldset>
            <p
              key={`description-${profile}`}
              className="entry-profile-description"
            >
              {current.description}
            </p>
            {!ready && (
              <output className="entry-notice">
                Sign-in is being set up. You can explore the demos below.
              </output>
            )}
            {message && <output className="entry-notice">{message}</output>}
            <form
              key={`form-${profile}`}
              className="entry-form"
              method="post"
              action="/auth/login"
              onSubmit={() => setSubmitting(true)}
              aria-label={`${current.name} sign in`}
            >
              <input
                type="hidden"
                name="kind"
                value={student ? 'student' : 'adult'}
              />
              <input type="hidden" name="profile" value={profile} />
              <label htmlFor="entry-identifier">
                {student ? 'Username' : 'Email address'}
              </label>
              <input
                id="entry-identifier"
                name="identifier"
                type={student ? 'text' : 'email'}
                placeholder={
                  student ? 'Your student username' : 'you@example.com'
                }
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={student ? 24 : 254}
                required
              />
              <label htmlFor="entry-password">Password</label>
              <div className="entry-password">
                <input
                  id="entry-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-controls="entry-password"
                  aria-pressed={showPassword}
                  disabled={!hydrated}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
              <button
                className="entry-submit"
                type="submit"
                disabled={!ready || !hydrated || submitting}
              >
                {submitting ? 'Signing in…' : `${current.name} sign in`}
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </form>
            {student && (
              <p className="entry-help">
                Need a hand signing in? Ask your parent or teacher.
              </p>
            )}
            <div className="entry-adult-options" hidden={student}>
              <details id="recovery" ref={recovery}>
                <summary>Forgot your password?</summary>
                <form
                  className="entry-secondary-form"
                  method="post"
                  action="/auth/recover"
                >
                  <p>We’ll send a reset link to your account email.</p>
                  <label>
                    Your account email
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                    />
                  </label>
                  <button className="entry-secondary-button" disabled={!ready}>
                    Send reset link
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </form>
              </details>
              <details>
                <summary>First time here? Create an adult account</summary>
                <form
                  className="entry-secondary-form"
                  method="post"
                  action="/auth/register"
                >
                  <p>
                    Confirm your email, then your administrator will connect
                    your account and assign access.
                  </p>
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                    />
                  </label>
                  <label>
                    Choose a password
                    <input
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                      aria-describedby="entry-password-help"
                    />
                  </label>
                  <span id="entry-password-help">Use 12–128 characters.</span>
                  <button className="entry-secondary-button" disabled={!ready}>
                    Create account
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </form>
              </details>
            </div>
            <div className="entry-demo-row">
              <div>
                <span>Take a look around</span>
                <p>No account needed.</p>
              </div>
              <button
                className="entry-demo-button"
                type="button"
                disabled={!hydrated}
                onClick={() => dialog.current?.showModal()}
              >
                <Play size={15} aria-hidden="true" />
                Try a demo
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="entry-bottom-note">
              <Sprout /> Small steps. Real progress.
            </p>
          </div>
        </section>
      </main>
      <dialog
        ref={dialog}
        className="entry-demo-dialog"
        aria-labelledby="entry-demo-title"
        aria-describedby="entry-demo-description"
      >
        <div className="entry-demo-content">
          <button
            className="entry-dialog-close"
            type="button"
            aria-label="Close demos"
            onClick={() => dialog.current?.close()}
          >
            <X size={21} />
          </button>
          <Sprout className="entry-dialog-sprout" />
          <p className="entry-eyebrow">A PEEK INSIDE THE STUDIO</p>
          <h2 id="entry-demo-title">Find your space.</h2>
          <p id="entry-demo-description">
            Explore with fictional sample data. Demos are read-only and don’t
            need an account.
          </p>
          <div className="entry-demo-links">
            {profiles.map(({ id, name, Icon, demo, detail }) => (
              <Link key={id} href={demo} className="entry-demo-link">
                <span className="entry-demo-icon">
                  <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span>
                  <strong>{name} demo</strong>
                  <span>{detail}</span>
                </span>
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </dialog>
    </div>
  );
}
