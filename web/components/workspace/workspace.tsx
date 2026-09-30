'use client';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  Files,
  ChartNoAxesCombined,
  CalendarDays,
  FolderOpen,
  Code2,
  Users,
  LogOut,
  Menu,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { sections, type WorkspaceData } from '@/lib/workspace';
import { Studio, useHydrated } from './ui';
import { HomeView } from './home';
import { WorksheetLibrary } from './worksheets';
import { CalendarView, LessonView } from './calendar';
import { StudentDirectory, StudentView, ProgressView } from './students';
import { FilesView, PractiseView } from './files';
import { TypewriterLogo } from '@/components/brand/typewriter-logo';

const icons = {
  home: Home,
  worksheets: Files,
  progress: ChartNoAxesCombined,
  calendar: CalendarDays,
  files: FolderOpen,
  practise: Code2,
  students: Users,
};
const labels: Record<string, string> = {
  home: 'Home',
  worksheets: 'Worksheets',
  progress: 'Progress',
  calendar: 'Calendar',
  files: 'Files',
  practise: 'Practise',
  students: 'Students',
};

export function Workspace({
  data,
  path,
  childId,
  failed = [],
  preview = false,
  now,
}: {
  data: WorkspaceData;
  path: string[];
  childId?: string;
  failed?: string[];
  preview?: boolean;
  now: number;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [menu, setMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null,
  );
  const role = data.account.role as 'student' | 'teacher' | 'parent';
  const teacher = role === 'teacher';
  const students = data.people.filter((p) => p.role === 'student');
  const studentId =
    role === 'student'
      ? data.account.id
      : role === 'parent'
        ? students.find(
            (s) =>
              s.id === (path[0] === 'students' && path[1] ? path[1] : childId),
          )?.id || students[0]?.id
        : undefined;
  const prefix = preview ? `/preview/${role}` : '/dashboard';
  const href = (target: string) =>
    `${prefix}/${target}${role === 'parent' && studentId ? `?child=${studentId}` : ''}`;
  async function mutate(form: FormData) {
    if (preview) {
      setNotice({
        error: true,
        text: 'This is a read-only preview with fictional data. Sign in to save real changes.',
      });
      return false;
    }
    if (saving) return false;
    setSaving(true);
    try {
      const response = await fetch('/dashboard/workspace/action', {
        method: 'POST',
        body: form,
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !result.ok)
        throw new Error(result.error || 'The change could not be saved.');
      setNotice({ error: false, text: 'Changes saved.' });
      startTransition(() => router.refresh());
      return true;
    } catch (error) {
      setNotice({
        error: true,
        text:
          error instanceof Error
            ? error.message
            : 'Connection interrupted. Try again.',
      });
      return false;
    } finally {
      setSaving(false);
    }
  }
  const selected = path[0] || 'home';
  return (
    <Studio.Provider
      value={{
        data,
        teacher,
        preview,
        studentId,
        href,
        mutate,
        busy: saving || refreshing,
        errorMessage: notice?.error ? notice.text : undefined,
        now,
      }}
    >
      <div
        className="learning-workspace"
        inert={!hydrated}
        aria-busy={!hydrated}
      >
        <header className="ws-header">
          <Link href="/" aria-label="Codelah home">
            <TypewriterLogo animated />
          </Link>
          <span className="ws-header-label">Learning studio</span>
          <div className="ws-header-right">
            <span className="ws-role">{role} workspace</span>
            <span className="ws-header-name">{data.account.display_name}</span>
            <button
              className="ws-mobile-menu ws-icon-button"
              aria-label="Toggle navigation"
              disabled={!hydrated}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </header>
        <aside className={`ws-sidebar ${menu ? 'is-open' : ''}`}>
          <div className="ws-sidebar-top">
            <span className="ws-caption">YOUR WORKSPACE</span>
            <nav aria-label="Workspace">
              {sections[role].map((item) => {
                const Icon = icons[item as keyof typeof icons];
                return (
                  <Link
                    key={item}
                    href={href(item)}
                    onClick={() => setMenu(false)}
                    className={selected === item ? 'active' : ''}
                    aria-current={selected === item ? 'page' : undefined}
                  >
                    <Icon size={21} />
                    {item === 'students' && role === 'parent'
                      ? 'Student page'
                      : labels[item]}
                    {item === 'practise' && (
                      <span className="ws-soon">Soon</span>
                    )}
                  </Link>
                );
              })}
            </nav>
            {role === 'parent' && (
              <label className="ws-child-select">
                Viewing child
                <select
                  aria-label="Viewing child"
                  disabled={!hydrated}
                  value={studentId || ''}
                  onChange={(e) =>
                    router.push(
                      `${prefix}/${selected === 'students' ? `students/${e.target.value}/${path[2] || 'overview'}` : selected}?child=${e.target.value}`,
                    )
                  }
                >
                  {!students.length && (
                    <option value="">No linked children</option>
                  )}
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.display_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="ws-sidebar-bottom">
            <div className="ws-grow-note">
              <Image
                unoptimized
                src="/brand/codelah-vine.svg"
                alt=""
                width={66}
                height={150}
              />
              <p>
                A little code.
                <br />A lot of room to grow.
              </p>
            </div>
            <Link href="/auth/password">
              Account settings <ArrowUpRight size={16} />
            </Link>
            {!preview && (
              <form action="/auth/logout" method="post">
                <button>
                  <LogOut size={17} /> Sign out
                </button>
              </form>
            )}
            <small>© 2026 Codelah</small>
          </div>
        </aside>
        <main id="main" className="ws-main">
          {preview && (
            <div className="ws-preview">
              <span>Fictional preview · changes and files are not saved</span>
              <nav aria-label="Preview role">
                {(['student', 'teacher', 'parent'] as const).map((r) => (
                  <Link
                    key={r}
                    href={`/preview/${r}/home`}
                    aria-current={r === role ? 'page' : undefined}
                  >
                    {r}
                  </Link>
                ))}
              </nav>
            </div>
          )}
          {failed.length > 0 && (
            <div className="ws-alert" role="alert">
              Some learning records could not be loaded. Please retry or contact
              your administrator.{' '}
              <button onClick={() => router.refresh()}>Retry</button>
            </div>
          )}
          {notice && (
            <div
              className={`ws-notice ${notice.error ? 'error' : ''}`}
              role={notice.error ? 'alert' : 'status'}
            >
              <span>{notice.text}</span>
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice(null)}
              >
                <X size={18} />
              </button>
            </div>
          )}
          {selected === 'home' && <HomeView />}
          {selected === 'worksheets' && <WorksheetLibrary />}
          {selected === 'progress' && <ProgressView student={studentId} />}
          {selected === 'calendar' &&
            (path[1] ? <LessonView id={path[1]} /> : <CalendarView />)}
          {selected === 'files' && <FilesView />}
          {selected === 'practise' && <PractiseView />}
          {selected === 'students' &&
            (path[1] || role === 'parent' ? (
              <StudentView
                id={path[1] || studentId}
                tab={path[2] || 'overview'}
              />
            ) : (
              <StudentDirectory />
            ))}
        </main>
      </div>
    </Studio.Provider>
  );
}
