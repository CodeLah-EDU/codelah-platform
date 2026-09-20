export type AccountRole =
  | 'pending'
  | 'student'
  | 'parent'
  | 'teacher'
  | 'admin';
export type Account = {
  id: string;
  contact_email?: string | null;
  display_name: string;
  role: AccountRole;
  status: 'pending' | 'active' | 'suspended';
};
export function studentEmail(username: string): string | null {
  const value = username.trim().toLowerCase();
  return /^[a-z][a-z0-9_]{3,23}$/.test(value)
    ? `${value}@students.codelah.invalid`
    : null;
}
export function safeOrigin(request: Request): string | null {
  const expected = process.env.APP_ORIGIN;
  if (!expected) return null;
  try {
    const origin = new URL(expected).origin;
    return request.headers.get('origin') === origin ? origin : null;
  } catch {
    return null;
  }
}
export function passwordError(password: string): string | null {
  return password.length >= 12 && password.length <= 128
    ? null
    : 'Use a password with 12–128 characters.';
}

export function formText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value : '';
}

// Form return locations are navigation only; every endpoint still authorizes the actor.
export function managementReturnPath(value: string): string {
  const allowed = [
    '/admin',
    '/admin/students',
    '/admin/students/new',
    '/admin/adults',
    '/admin/parents',
    '/admin/teachers',
    '/admin/classes',
    '/admin/classes/new',
    '/admin/relationships',
  ];
  return allowed.includes(value) ||
    /^\/admin\/classes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : '/dashboard';
}
