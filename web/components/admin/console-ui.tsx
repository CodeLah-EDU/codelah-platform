'use client';
import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useId,
  useSyncExternalStore,
  cloneElement,
  isValidElement,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { ArrowRight, Check, Download, Search, X } from 'lucide-react';
import { csvDocument, type AdminData } from '@/lib/admin-workspace';

export type AdminResult = {
  ok?: boolean;
  id?: string;
  error?: string;
  message?: string;
};
export type AdminSearch = {
  q?: string;
  status?: string;
  month?: string;
  student?: string;
  classroom?: string;
  from?: string;
  to?: string;
};
export const AdminContext = createContext<{
  data: AdminData;
  now: number;
  today: string;
  preview: boolean;
  busy: boolean;
  search: AdminSearch;
  href: (path: string) => string;
  mutate: (form: FormData) => Promise<AdminResult>;
}>(null!);
export const useAdmin = () => useContext(AdminContext);
const subscribe = () => () => {};
export const useAdminReady = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
export function Heading({
  title,
  children,
  action,
  eyebrow = 'STUDIO ADMINISTRATION',
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="ops-heading">
      <div>
        <p className="ops-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action && <div className="ops-heading-actions">{action}</div>}
    </div>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`ops-badge tone-${value.replaceAll(' ', '-')}`}>
      {value}
    </span>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="ops-avatar" aria-hidden="true">
      {name
        .split(' ')
        .map((word) => word[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="ops-empty">
      <span aria-hidden="true">{'{ }'}</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="ops-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement<{ id?: string; 'aria-describedby'?: string }>(children)
        ? cloneElement(children, {
            id,
            ...(hint ? { 'aria-describedby': `${id}-hint` } : {}),
          })
        : children}
      {hint && <p id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}
export function Form({
  action,
  values = {},
  children,
  label = 'Save changes',
  onSaved,
  disabled = false,
}: {
  action: string;
  values?: Record<string, string>;
  children: ReactNode;
  label?: string;
  onSaved?: (id?: string) => void;
  disabled?: boolean;
}) {
  const { mutate, busy } = useAdmin();
  const ready = useAdminReady();
  const [error, setError] = useState('');
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await mutate(new FormData(event.currentTarget));
    setError(result.error ?? '');
    if (result.ok) onSaved?.(result.id);
  }
  return (
    <form className="ops-form" onSubmit={submit}>
      {Object.entries({ ...values, action }).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      {error && (
        <p className="ops-inline-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="ops-button"
        disabled={!ready || busy || disabled}
      >
        {busy ? 'Saving…' : label}
        <Check size={17} aria-hidden="true" />
      </button>
    </form>
  );
}
export function Modal({
  title,
  trigger,
  children,
  className = 'ops-button secondary',
}: {
  title: string;
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const ready = useAdminReady();
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={!ready}
        onClick={() => setOpen(true)}
      >
        {trigger}
      </button>
      <dialog
        ref={dialog}
        className="ops-dialog"
        aria-label={title}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
      >
        <div className="ops-dialog-head">
          <div>
            <p className="ops-eyebrow">ADMINISTRATION</p>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className="ops-icon-button"
            aria-label="Close dialog"
            onClick={() => setOpen(false)}
          >
            <X size={22} />
          </button>
        </div>
        {open && children(() => setOpen(false))}
      </dialog>
    </>
  );
}
export function Action({
  action,
  values,
  children,
  confirm,
  className = 'ops-text-button',
}: {
  action: string;
  values: Record<string, string>;
  children: ReactNode;
  confirm?: string;
  className?: string;
}) {
  const { mutate, busy } = useAdmin();
  const ready = useAdminReady();
  return (
    <button
      type="button"
      className={className}
      disabled={!ready || busy}
      onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        const form = new FormData();
        Object.entries({ ...values, action }).forEach(([name, value]) =>
          form.set(name, value),
        );
        await mutate(form);
      }}
    >
      {children}
    </button>
  );
}
export function SearchBox({
  value,
  onChange,
  label = 'Search records',
  placeholder = 'Search by name…',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const ready = useAdminReady();
  return (
    <label className="ops-search">
      <Search size={19} aria-hidden="true" />
      <input
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!ready}
      />
    </label>
  );
}
export function Export({
  name,
  headers,
  rows,
}: {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}) {
  const ready = useAdminReady();
  return (
    <button
      type="button"
      className="ops-button secondary"
      disabled={!ready || !rows.length}
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([csvDocument(headers, rows)], {
            type: 'text/csv;charset=utf-8',
          }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      <Download size={17} aria-hidden="true" />
      Export CSV
    </button>
  );
}
export function Metric({
  title,
  value,
  detail,
  icon,
  tone = '',
}: {
  title: string;
  value: ReactNode;
  detail: ReactNode;
  icon?: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`ops-metric ${tone}`}>
      <div>
        <span>{title}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}
export function Pagination({
  page,
  total,
  size,
  onChange,
}: {
  page: number;
  total: number;
  size: number;
  onChange: (page: number) => void;
}) {
  const max = Math.max(1, Math.ceil(total / size));
  if (total <= size)
    return (
      <div className="ops-table-footer">
        {total} record{total === 1 ? '' : 's'}
      </div>
    );
  return (
    <div className="ops-table-footer">
      <span>
        {(page - 1) * size + 1}–{Math.min(page * size, total)} of {total}
      </span>
      <div>
        <button
          type="button"
          className="ops-text-button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {max}
        </span>
        <button
          type="button"
          className="ops-text-button"
          disabled={page >= max}
          onClick={() => onChange(page + 1)}
        >
          Next
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
