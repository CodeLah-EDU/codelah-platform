'use client';
import Image from 'next/image';
import {
  createContext,
  cloneElement,
  isValidElement,
  useId,
  useSyncExternalStore,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { X, Check, ArrowUpRight, FileCode2 } from 'lucide-react';
import type { WorkspaceData } from '@/lib/workspace';
import { fileSize } from '@/lib/lesson-files';

export type StudioContext = {
  data: WorkspaceData;
  teacher: boolean;
  preview: boolean;
  studentId?: string;
  now: number;
  href: (path: string) => string;
  mutate: (form: FormData) => Promise<boolean>;
  busy: boolean;
  errorMessage?: string;
};
export const Studio = createContext<StudioContext>(null!);
export const useStudio = () => useContext(Studio);
const subscribeHydration = () => () => {};
export const useHydrated = () =>
  useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="ws-empty">
      <Image
        unoptimized
        src="/brand/codelah-robot-static.svg"
        alt=""
        width="72"
        height="72"
      />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Title({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ws-title">
      <div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Tag({
  children,
  tone = '',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`ws-tag ${tone}`}>{children}</span>;
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="ws-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement<{ id?: string }>(children)
        ? cloneElement(children, { id })
        : children}
    </div>
  );
}
export function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}
export function SaveForm({
  action,
  values = {},
  children,
  onSaved,
  label = 'Save changes',
}: {
  action: string;
  values?: Record<string, string>;
  children?: ReactNode;
  onSaved?: () => void;
  label?: string;
}) {
  const { mutate, busy, errorMessage } = useStudio();
  const hydrated = useHydrated();
  const [error, setError] = useState(false);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate(new FormData(event.currentTarget));
    setError(!ok);
    if (ok) onSaved?.();
  }
  return (
    <form className="ws-form" onSubmit={submit}>
      <Hidden values={{ ...values, action }} />
      {children}
      {error && (
        <p role="alert" className="ws-form-error">
          {errorMessage ||
            'Could not save. Please try again; your entries are kept.'}
        </p>
      )}
      <button className="ws-button" type="submit" disabled={busy || !hydrated}>
        {busy ? 'Saving…' : label}
        <Check size={17} />
      </button>
    </form>
  );
}
export function Action({
  action,
  values,
  children,
  confirm,
  className = 'ws-text-button',
}: {
  action: string;
  values: Record<string, string>;
  children: ReactNode;
  confirm?: string;
  className?: string;
}) {
  const { mutate, busy } = useStudio();
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        const form = new FormData();
        Object.entries({ ...values, action }).forEach(([key, value]) =>
          form.set(key, value),
        );
        await mutate(form);
      }}
    >
      {children}
    </button>
  );
}
export function Modal({
  title,
  children,
  trigger,
  className = 'ws-button secondary',
}: {
  title: string;
  children: (close: () => void) => ReactNode;
  trigger: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="ws-dialog"
        aria-label={title}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="ws-dialog-header">
          <h2>{title}</h2>
          <button
            aria-label="Close dialog"
            className="ws-icon-button"
            onClick={close}
          >
            <X size={22} />
          </button>
        </div>
        {open && children(close)}
      </dialog>
    </>
  );
}
export function Download({
  id,
  kind,
  open = false,
  children,
}: {
  id: string;
  kind: 'worksheet' | 'file';
  open?: boolean;
  children?: ReactNode;
}) {
  const { preview } = useStudio();
  if (preview)
    return (
      <span className="ws-disabled" title="Preview files are examples only">
        {children || (open ? 'Open' : 'Download')}
      </span>
    );
  return (
    <a
      className="ws-text-link"
      href={`/dashboard/workspace/download?id=${id}&kind=${kind}${open ? '&open=1' : ''}`}
      target={open ? '_blank' : undefined}
      rel={open ? 'noopener' : undefined}
    >
      {children || (open ? 'Open' : 'Download')}
      <ArrowUpRight size={16} />
    </a>
  );
}
export function FileRow({ file }: { file: WorkspaceData['files'][number] }) {
  const { teacher, data } = useStudio();
  return (
    <div className="ws-file-row">
      <span className="ws-file-icon">
        <FileCode2 size={21} />
      </span>
      <div className="ws-grow">
        <strong>{file.file_name}</strong>
        <small>
          {fileSize(file.size_bytes)} ·{' '}
          {file.kind === 'material' ? 'Class resource' : 'Student file'}
        </small>
      </div>
      <Download id={file.id} kind="file" />
      {(teacher || file.student_id === data.account.id) && (
        <Action
          action="file_delete"
          values={{ id: file.id }}
          confirm={`Delete ${file.file_name}? This cannot be undone.`}
        >
          Delete
        </Action>
      )}
    </div>
  );
}
export function Person({
  name,
  subtitle,
}: {
  name: string;
  subtitle?: string;
}) {
  return (
    <span className="ws-person">
      <span className="ws-avatar">
        {name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')}
      </span>
      <span>
        <strong>{name}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
    </span>
  );
}
