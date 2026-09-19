import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  studentEmail,
  safeOrigin,
  passwordError,
  formText,
} from '../lib/accounts.ts';
test('student identities normalize usernames and reject emails or malformed input', () => {
  assert.equal(
    studentEmail('  AVERY_01 '),
    'avery_01@students.codelah.invalid',
  );
  for (const name of [
    'hello@example.com',
    'abc',
    'bad name',
    '1student',
    'a'.repeat(25),
    '../../admin',
  ])
    assert.equal(studentEmail(name), null);
});
test('mutations require configured exact origin, never caller-supplied redirect hosts', () => {
  const previous = process.env.APP_ORIGIN;
  try {
    process.env.APP_ORIGIN = 'http://localhost:3001';
    assert.equal(
      safeOrigin(
        new Request('http://localhost:3001', {
          headers: { origin: 'http://localhost:3001' },
        }),
      ),
      'http://localhost:3001',
    );
    assert.equal(
      safeOrigin(
        new Request('http://localhost:3001', {
          headers: { origin: 'https://evil.test' },
        }),
      ),
      null,
    );
    assert.equal(safeOrigin(new Request('http://localhost:3001')), null);
    delete process.env.APP_ORIGIN;
    assert.equal(safeOrigin(new Request('http://localhost:3001')), null);
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
});
test('password and multipart input validation reject unsafe shapes', () => {
  assert.ok(passwordError('short'));
  assert.equal(passwordError('long-student-password'), null);
  const form = new FormData();
  form.set('password', new Blob(['abc']), 'pw.txt');
  assert.equal(formText(form, 'password'), '');
});

test('admin form returns accept only known pages and canonical class paths', async () => {
  const { managementReturnPath } = await import('../lib/accounts.ts');
  for (const path of [
    '/admin/students',
    '/admin/students/new',
    '/admin/classes',
    '/admin/classes/new',
    '/admin/adults',
    '/admin/relationships',
    '/admin/classes/00000000-0000-0000-0000-000000000001',
  ]) {
    assert.equal(managementReturnPath(path), path);
  }
  for (const path of [
    'https://evil.example',
    '//evil.example',
    '/admin/../auth/logout',
    '/admin/classes/not-an-id',
    '/admin?next=https://evil.example',
    '/admin/classes/%2e%2e',
  ]) {
    assert.equal(managementReturnPath(path), '/dashboard');
  }
});
