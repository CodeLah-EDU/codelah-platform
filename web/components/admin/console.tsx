'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  CircleHelp,
  Home,
  Link2,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { TypewriterLogo } from '@/components/brand/typewriter-logo';
import { singaporeDay } from '@/lib/workspace';
import type { AdminData } from '@/lib/admin-workspace';
import {
  AdminContext,
  useAdminReady,
  type AdminResult,
  type AdminSearch,
} from './console-ui';
import { Overview } from './overview';
import { Finances } from './finance';
import { Attendance, LessonRegister } from './attendance';
import {
  AccountDirectory,
  AccountRecord,
  CreateAccount,
  Relationships,
} from './accounts';
import { ClassDirectory, ClassRecord, NewClass } from './classes';

export function AdminConsole({
  data,
  path,
  search = {},
  now,
  preview = false,
}: {
  data: AdminData;
  path: string[];
  search?: AdminSearch;
  now: number;
  preview?: boolean;
}) {
  const router = useRouter();
  const ready = useAdminReady();
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  const section = path[0] ?? 'overview';
  const prefix = preview ? '/preview/admin' : '/admin';
  const href = (target: string) =>
    `${prefix}${target === 'overview' ? '' : `/${target}`}`;
  const today = singaporeDay(new Date(now).toISOString());
  const pending = data.people.filter(
    (p) => p.role === 'pending' || p.status === 'pending',
  ).length;
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menu]);
  async function mutate(form: FormData): Promise<AdminResult> {
    if (preview) {
      const error =
        'This is a read-only preview with fictional data. Sign in to save real changes.';
      setNotice({ error: true, text: error });
      return { error };
    }
    if (saving)
      return { error: 'Please wait for the current change to finish.' };
    setSaving(true);
    try {
      const response = await fetch('/admin/action', {
        method: 'POST',
        body: form,
      });
      const result = (await response.json()) as AdminResult;
      if (!response.ok || !result.ok)
        throw new Error(result.error ?? 'Could not save the change.');
      setNotice({
        error: false,
        text:
          result.message ??
          (form.get('action') === 'invite_adult'
            ? 'Invitation sent. Activate the account after its email is verified.'
            : form.get('action') === 'create_student'
              ? 'Student created. Connect their family and class below.'
              : 'Changes saved.'),
      });
      startTransition(() => router.refresh());
      return result;
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : 'Connection interrupted. Please try again.';
      setNotice({ error: true, text });
      return { error: text };
    } finally {
      setSaving(false);
    }
  }
  const accountSection = [
    'accounts',
    'students',
    'parents',
    'teachers',
    'adults',
  ].includes(section);
  const navigation = [
    { path: 'overview', label: 'Overview', Icon: Home },
    { path: 'finances', label: 'Finances', Icon: Wallet },
    { path: 'attendance', label: 'Attendance', Icon: CalendarCheck },
    { path: 'accounts', label: 'Accounts', Icon: Users },
    { path: 'classes', label: 'Classes', Icon: BookOpen },
    { path: 'relationships', label: 'Family connections', Icon: Link2 },
  ];
  let view;
  if (section === 'finances') view = <Finances tab={path[1]} />;
  else if (section === 'attendance')
    view = path[1] ? <LessonRegister id={path[1]} /> : <Attendance />;
  else if (section === 'classes')
    view =
      path[1] === 'new' ? (
        <NewClass />
      ) : path[1] ? (
        <ClassRecord id={path[1]} />
      ) : (
        <ClassDirectory />
      );
  else if (section === 'relationships') view = <Relationships />;
  else if (accountSection)
    view =
      path[1] === 'new' ? (
        <CreateAccount />
      ) : path[1] ? (
        <AccountRecord id={path[1]} tab={path[2]} />
      ) : (
        <AccountDirectory
          role={
            section === 'students'
              ? 'student'
              : section === 'parents'
                ? 'parent'
                : section === 'teachers'
                  ? 'teacher'
                  : section === 'adults'
                    ? 'pending'
                    : 'all'
          }
        />
      );
  else view = <Overview />;
  return (
    <AdminContext.Provider
      value={{
        data,
        now,
        today,
        preview,
        search,
        href,
        mutate,
        busy: saving || refreshing,
      }}
    >
      <div className="admin-console" aria-busy={!ready}>
        <header className="ops-header">
          <Link
            className="ops-logo"
            href={href('overview')}
            aria-label="Codelah administration"
          >
            <TypewriterLogo />
          </Link>
          <span className="ops-studio-label">STUDIO ADMINISTRATION</span>
          <div className="ops-header-right">
            <span className="ops-admin-pill">
              <ShieldCheck size={15} />
              Administrator
            </span>
            <AvatarHeader name={data.account.display_name} />
            <button
              ref={menuButton}
              type="button"
              className="ops-icon-button ops-mobile-menu"
              disabled={!ready}
              aria-label="Toggle administration menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </header>
        <aside className={`ops-sidebar ${menu ? 'is-open' : ''}`}>
          <p className="ops-eyebrow">YOUR STUDIO</p>
          <nav aria-label="Administration">
            {navigation.map(({ path: target, label, Icon }) => (
              <Link
                key={target}
                href={href(target)}
                aria-current={
                  section === target ||
                  (target === 'accounts' && accountSection)
                    ? 'page'
                    : undefined
                }
                onClick={() => setMenu(false)}
              >
                <Icon size={20} />
                <span>{label}</span>
                {target === 'accounts' && pending > 0 && (
                  <small>{pending}</small>
                )}
              </Link>
            ))}
          </nav>
          <Link
            className="ops-request-link"
            href={href('adults')}
            onClick={() => setMenu(false)}
          >
            <span>Account requests</span>
            <strong>{pending}</strong>
            <ChevronRight size={16} />
          </Link>
          <div className="ops-sidebar-note">
            <span aria-hidden="true">{'{ grow }'}</span>
            <p>
              Less admin.
              <br />
              More room to teach.
            </p>
          </div>
          <div className="ops-sidebar-bottom">
            <Link href="/auth/password">
              <CircleHelp size={17} />
              Account settings
              <ArrowUpRight size={14} />
            </Link>
            {preview ? (
              <Link href="/admin/login">
                <ShieldCheck size={17} />
                Administrator sign in
              </Link>
            ) : (
              <form action="/auth/logout" method="post">
                <button>
                  <LogOut size={17} />
                  Sign out
                </button>
              </form>
            )}
            <small>© 2026 Codelah</small>
          </div>
        </aside>
        {menu && (
          <button
            type="button"
            className="ops-menu-backdrop"
            aria-label="Close administration menu"
            onClick={() => setMenu(false)}
          />
        )}
        <main id="main" className="ops-main">
          <div className="ops-contextbar">
            <div>
              <span>Studio</span>
              <ChevronRight size={14} />
              <span>
                {section === 'overview'
                  ? 'Overview'
                  : section === 'adults'
                    ? 'Account requests'
                    : section[0].toUpperCase() + section.slice(1)}
              </span>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                router.push(href(`accounts?q=${encodeURIComponent(query)}`));
              }}
            >
              <Search size={17} />
              <input
                aria-label="Find an account"
                placeholder="Find an account…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={!ready}
              />
              <button
                type="submit"
                aria-label="Search account directory"
                disabled={!ready}
              >
                <ArrowUpRight size={16} />
              </button>
            </form>
          </div>
          {preview && (
            <div className="ops-preview-bar">
              <span>
                Fictional administrator preview · changes are not saved
              </span>
              <Link href="/">
                Back to sign in
                <ArrowUpRight size={15} />
              </Link>
            </div>
          )}
          {data.unavailable.length > 0 && (
            <div className="ops-error-banner" role="alert">
              <strong>Some records could not be loaded.</strong>
              <p>
                {data.unavailable.join(', ')}. Refresh to try again; ask your
                administrator to check the data setup if this continues.
              </p>
              <button
                className="ops-text-button"
                onClick={() => router.refresh()}
              >
                Refresh records
              </button>
            </div>
          )}
          {notice && (
            <div className={`ops-notice ${notice.error ? 'is-error' : ''}`}>
              <output>{notice.text}</output>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice(null)}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <div
            key={`${path.join('/')}-${JSON.stringify(search)}`}
            className="ops-content"
          >
            {view}
          </div>
          <footer className="ops-footer">
            <span>Codelah · A little clarity, every day.</span>
            <span>All amounts SGD · Singapore time</span>
          </footer>
        </main>
      </div>
    </AdminContext.Provider>
  );
}
function AvatarHeader({ name }: { name: string }) {
  return (
    <span className="ops-header-user">
      <span aria-hidden="true">
        {name
          .split(' ')
          .map((p) => p[0])
          .slice(0, 2)
          .join('')}
      </span>
      <span>{name}</span>
    </span>
  );
}
