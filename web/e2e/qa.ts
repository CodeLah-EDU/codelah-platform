import { expect, type Browser, type BrowserContext } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Shared helpers for browser tests that run against the hosted Supabase project with an
// authorized admin session. They create throwaway QA accounts and suspend them afterwards.
export const env: Record<string, string | undefined> = {
  ...Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((s) => s.includes('=') && !s.trimStart().startsWith('#'))
      .map((s) => [
        s.slice(0, s.indexOf('=')).trim(),
        s.slice(s.indexOf('=') + 1).trim(),
      ]),
  ),
  ...process.env,
};
export const origin = env.TEST_BASE_URL ?? 'http://localhost:3001';

export async function clientFor(ctx: BrowserContext) {
  const jar: { name: string; value: string }[] = await ctx.cookies(origin);
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar,
        setAll: async (values) => {
          for (const c of values) {
            const item = jar.find((v) => v.name === c.name);
            if (item) item.value = c.value;
            else jar.push({ name: c.name, value: c.value });
          }
          await ctx.addCookies(
            values.map((c) => ({
              name: c.name,
              value: c.value,
              url: origin,
              sameSite: 'Lax' as const,
            })),
          );
        },
      },
    },
  );
}

export type Fixture = { id: string; username: string; name: string };

// Creates accounts through the student-accounts function (so each has a username and
// password), converting non-students to their role. Call cleanup() in a finally block.
export async function qaAccounts(
  browser: Browser,
  adminContext: BrowserContext,
) {
  const admin = await clientFor(adminContext);
  expect((await admin.auth.getUser()).error).toBeNull();
  const suffix = randomUUID().slice(0, 8),
    password = `QA-${randomUUID()}!`;
  const fixtures: Fixture[] = [];
  const contexts: BrowserContext[] = [];

  async function fixture(
    role: 'student' | 'parent' | 'teacher',
    label: string,
  ): Promise<Fixture> {
    const username = `qa_${label}_${suffix}`,
      name = `QA ${label} ${suffix}`;
    const result = await admin.functions.invoke('student-accounts', {
      body: {
        action: 'create_student',
        display_name: name,
        username,
        password,
      },
    });
    expect(result.error, `create ${label}`).toBeNull();
    const f = { id: result.data.student_id as string, username, name };
    fixtures.push(f);
    if (role !== 'student') {
      expect(
        (await admin.from('accounts').delete().eq('id', f.id)).error,
      ).toBeNull();
      expect(
        (
          await admin.from('accounts').insert({
            id: f.id,
            display_name: name,
            role,
            status: 'active',
            contact_email: `${username}@example.invalid`,
          })
        ).error,
      ).toBeNull();
    }
    return f;
  }

  async function signIn(
    f: Fixture,
    options: Parameters<Browser['newContext']>[0] = {},
  ) {
    const ctx = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      ...options,
    });
    ctx.setDefaultTimeout(30000);
    contexts.push(ctx);
    const client = await clientFor(ctx);
    expect(
      (
        await client.auth.signInWithPassword({
          email: `${f.username}@students.codelah.invalid`,
          password,
        })
      ).error,
      `sign in ${f.username}`,
    ).toBeNull();
    return { ctx, client, page: await ctx.newPage() };
  }

  // Closes contexts and suspends every QA account; returns any cleanup errors.
  async function cleanup() {
    for (const ctx of contexts) await ctx.close().catch(() => undefined);
    const errors: string[] = [];
    for (const f of fixtures) {
      await admin
        .from('parent_student_links')
        .update({ active: false })
        .eq('parent_id', f.id);
      const result = await admin
        .from('accounts')
        .update({ status: 'suspended' })
        .eq('id', f.id);
      if (result.error) errors.push(result.error.message);
    }
    const session = await admin.auth.getUser();
    if (!session.error && session.data.user)
      await adminContext.storageState({
        path: process.env.CODELAH_ADMIN_STATE!,
      });
    return errors;
  }

  return { admin, suffix, fixture, signIn, cleanup };
}
