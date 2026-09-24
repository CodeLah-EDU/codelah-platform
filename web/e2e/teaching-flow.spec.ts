import { test, expect, type BrowserContext } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

test.use({ storageState: process.env.CODELAH_ADMIN_STATE, trace: 'off' });
test('password permissions and the complete teacher–student–parent lesson cycle', async ({
  page,
  context,
  browser,
}) => {
  test.skip(
    !process.env.CODELAH_ADMIN_STATE,
    'Requires an explicitly authorized admin test session.',
  );
  test.setTimeout(240000);
  page.setDefaultTimeout(15000);
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((s) => s.includes('='))
      .map((s) => [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)]),
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL,
    key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    origin = process.env.TEST_BASE_URL ?? 'http://localhost:3001';
  async function clientFor(ctx: BrowserContext) {
    const jar = await ctx.cookies();
    return createServerClient(url, key, {
      cookies: {
        getAll: () => jar,
        setAll: async (values) => {
          for (const c of values) {
            const item = jar.find((v) => v.name === c.name);
            if (item) item.value = c.value;
            else
              jar.push({
                name: c.name,
                value: c.value,
                domain: 'localhost',
                path: '/',
                expires: -1,
                httpOnly: false,
                secure: false,
                sameSite: 'Lax',
              });
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
    });
  }
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  const admin = await clientFor(context);
  expect((await admin.auth.getUser()).error).toBeNull();
  const suffix = randomUUID().slice(0, 8),
    password = `QA-${randomUUID()}!`,
    resetPassword = `QA-${randomUUID()}!`,
    className = `QA Teaching ${suffix}`;
  const fixtures: { id: string; username: string; name: string }[] = [];
  const contexts: BrowserContext[] = [];
  let classId: string | undefined;
  async function fixture(
    role: 'student' | 'parent' | 'teacher',
    label: string = role,
  ) {
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
    expect(result.error).toBeNull();
    expect(result.data?.student_id).toBeTruthy();
    const f = { id: result.data.student_id as string, username, name };
    fixtures.push(f);
    if (role !== 'student') {
      expect(
        (await admin.from('accounts').delete().eq('id', f.id)).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from('accounts')
            .insert({
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
  async function signIn(f: { username: string }, pass = password) {
    const ctx = await browser.newContext();
    ctx.setDefaultTimeout(15000);
    contexts.push(ctx);
    const client = await clientFor(ctx);
    expect(
      (
        await client.auth.signInWithPassword({
          email: `${f.username}@students.codelah.invalid`,
          password: pass,
        })
      ).error,
    ).toBeNull();
    return { ctx, client, page: await ctx.newPage() };
  }
  try {
    const student = await fixture('student'),
      other = await fixture('student', 'other'),
      parent = await fixture('parent'),
      teacher = await fixture('teacher');
    const created = await admin
      .from('classrooms')
      .insert({ name: className })
      .select('id')
      .single();
    expect(created.error).toBeNull();
    classId = created.data!.id;
    for (const [table, record] of [
      ['enrolments', { classroom_id: classId, student_id: student.id }],
      [
        'teacher_assignments',
        { classroom_id: classId, teacher_id: teacher.id },
      ],
      [
        'parent_student_links',
        { parent_id: parent.id, student_id: student.id },
      ],
    ] as const)
      expect((await admin.from(table).insert(record)).error).toBeNull();
    const p = await signIn(parent),
      t = await signIn(teacher);
    // Phase 2: parent resets the linked student's password using the actual UI.
    await p.page.goto(`${origin}/dashboard`);
    await p.page
      .getByText('Set a new student password', { exact: true })
      .click();
    await p.page
      .getByLabel('New password', { exact: true })
      .fill(resetPassword);
    await p.page
      .getByRole('button', { name: 'Change student password', exact: true })
      .click();
    await expect(p.page).toHaveURL(/message=password$/);
    const probe = createClient(url, key, { auth: { persistSession: false } });
    expect(
      (
        await probe.auth.signInWithPassword({
          email: `${student.username}@students.codelah.invalid`,
          password,
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await probe.auth.signInWithPassword({
          email: `${student.username}@students.codelah.invalid`,
          password: resetPassword,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await p.client.functions.invoke('student-accounts', {
          body: {
            action: 'reset_password',
            student_id: other.id,
            password: resetPassword,
          },
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await t.client.functions.invoke('student-accounts', {
          body: {
            action: 'reset_password',
            student_id: other.id,
            password: resetPassword,
          },
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await t.client.functions.invoke('student-accounts', {
          body: { action: 'reset_password', student_id: student.id, password },
        })
      ).error,
    ).toBeNull();
    // Real username/password sign-in, self-service change, sign-out and re-entry.
    const sCtx = await browser.newContext();
    sCtx.setDefaultTimeout(15000);
    contexts.push(sCtx);
    const sp = await sCtx.newPage();
    async function studentLogin(pass: string) {
      await sp.goto(`${origin}/login`);
      const form = sp
        .locator('form')
        .filter({
          has: sp.getByRole('button', { name: 'Student sign in', exact: true }),
        });
      await form.getByLabel('Username', { exact: true }).fill(student.username);
      await form.getByLabel('Password', { exact: true }).fill(pass);
      await form.getByRole('button').click();
      await expect(sp).toHaveURL(/\/dashboard$/);
    }
    await studentLogin(password);
    await sp
      .getByRole('link', { name: 'Change password', exact: true })
      .click();
    await sp.getByLabel('New password', { exact: true }).fill(resetPassword);
    await sp
      .getByLabel('Confirm new password', { exact: true })
      .fill(resetPassword);
    await sp
      .getByRole('button', { name: 'Save password', exact: true })
      .click();
    await expect(sp).toHaveURL(/\/dashboard$/);
    await sp.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(sp).toHaveURL(/\/login\?message=signedout$/);
    await studentLogin(resetPassword);
    const studentClient = await clientFor(sCtx);
    expect(
      (
        await studentClient.functions.invoke('student-accounts', {
          body: {
            action: 'reset_password',
            student_id: other.id,
            password: resetPassword,
          },
        })
      ).error,
    ).toBeTruthy();
    await probe.auth.signOut();
    console.log(
      'Phase 2: parent and teacher resets, denied unrelated/student resets, password change and sign-out/re-entry passed.',
    );
    // Phase 3: teacher creates a lesson from the form, with explicit Singapore time.
    await t.page.goto(`${origin}/dashboard/lessons/new`);
    await t.page
      .getByRole('combobox', { name: 'Class', exact: true })
      .selectOption(classId!);
    await t.page
      .getByLabel('Lesson title', { exact: true })
      .fill(`Loops lab ${suffix}`);
    await t.page
      .getByLabel('Objective', { exact: true })
      .fill('Build a repeating animation.');
    await t.page.getByLabel('Starts', { exact: true }).fill('2026-10-05T15:00');
    await t.page.getByLabel('Ends', { exact: true }).fill('2026-10-05T16:30');
    await t.page
      .getByRole('button', { name: 'Save lesson', exact: true })
      .click();
    await expect(t.page).toHaveURL(
      /\/dashboard\/lessons\/[0-9a-f-]{36}\?message=created$/,
    );
    const lessonId = new URL(t.page.url()).pathname.split('/').at(-1)!;
    const lessonUrl = `${origin}/dashboard/lessons/${lessonId}`;
    await expect(
      t.page.getByText('15:00–16:30 SGT', { exact: false }),
    ).toBeVisible();
    await t.page
      .getByText('Add a worksheet or resource', { exact: true })
      .click();
    await t.page
      .getByLabel('Material title', { exact: true })
      .fill('Loop practice');
    await t.page
      .getByLabel('Instructions', { exact: true })
      .fill('Write a loop that prints 1 to 5.');
    await t.page
      .getByLabel('Worksheet or resource link (optional)', { exact: true })
      .fill('https://scratch.mit.edu/ideas');
    await t.page
      .getByRole('button', { name: 'Add material', exact: true })
      .click();
    await expect(
      t.page.getByRole('heading', { name: 'Loop practice', exact: true }),
    ).toBeVisible();
    await sp.goto(lessonUrl);
    await expect(
      sp.getByRole('heading', { name: 'Loop practice', exact: true }),
    ).toBeVisible();
    await sp
      .getByLabel('Your response', { exact: true })
      .fill('for i in range(1, 6): print(i)');
    await sp.getByRole('button', { name: 'Submit work', exact: true }).click();
    await expect(
      sp.getByRole('button', { name: 'Update submission', exact: true }),
    ).toBeVisible();
    await t.page.goto(lessonUrl);
    const learner = t.page.locator(`#learner-${student.id}`);
    await expect(learner.locator('pre')).toHaveText(
      'for i in range(1, 6): print(i)',
    );
    await learner
      .getByLabel('Review note', { exact: true })
      .fill('Good loop boundaries.');
    await learner
      .getByRole('button', { name: 'Save review', exact: true })
      .click();
    await expect(
      t.page.getByText('Changes saved.', { exact: true }),
    ).toBeVisible();
    await learner.getByText('Attendance · unmarked', { exact: true }).click();
    await learner
      .getByRole('combobox', { name: 'Attendance', exact: true })
      .selectOption('present');
    await learner
      .getByRole('button', { name: 'Save attendance', exact: true })
      .click();
    await expect(
      learner.getByText('Attendance · present', { exact: true }),
    ).toBeVisible();
    async function feedback(note: string, publish: boolean) {
      await learner
        .locator('summary')
        .filter({ hasText: 'Weekly feedback' })
        .click();
      await learner.getByLabel('Topics covered', { exact: true }).fill('Loops');
      await learner.getByLabel('Teacher feedback', { exact: true }).fill(note);
      await learner
        .getByLabel('Practice for next time', { exact: true })
        .fill('Try a countdown loop.');
      await learner
        .getByRole('button', {
          name: publish ? 'Publish report' : 'Save draft',
          exact: true,
        })
        .click();
      await expect(
        t.page.getByText('Changes saved.', { exact: true }),
      ).toBeVisible();
    }
    await feedback('Private teaching draft', false);
    await p.page.goto(lessonUrl);
    await expect(
      p.page.getByText('Private teaching draft', { exact: true }),
    ).toHaveCount(0);
    await expect(
      p.page.getByText('Your teacher hasn’t published feedback yet.', {
        exact: true,
      }),
    ).toBeVisible();
    await feedback('Confident with loops; practise counting down.', true);
    await p.page.reload();
    await expect(
      p.page.getByText('Confident with loops; practise counting down.', {
        exact: true,
      }),
    ).toBeVisible();
    await feedback('Private revision not ready for parents.', false);
    await p.page.reload();
    await expect(
      p.page.getByText('Confident with loops; practise counting down.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      p.page.getByText('Private revision not ready for parents.', {
        exact: true,
      }),
    ).toHaveCount(0);
    await p.page.getByText('Student work · submitted', { exact: true }).click();
    await expect(p.page.locator('pre')).toHaveText(
      'for i in range(1, 6): print(i)',
    );
    await p.page.setViewportSize({ width: 390, height: 844 });
    await p.page.screenshot({
      path: 'test-results/parent-lesson-mobile.png',
      fullPage: true,
    });
    expect(
      await p.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await t.page.screenshot({
      path: 'test-results/teacher-lesson-desktop.png',
      fullPage: true,
    });
    // Denied writes must not return a misleading saved response.
    const denied = await sCtx.request.post(
      `${origin}/dashboard/lessons/update`,
      {
        headers: { origin },
        form: {
          lesson_id: lessonId,
          action: 'feedback',
          student_id: student.id,
          note: 'forged',
          status: 'published',
        },
        maxRedirects: 0,
      },
    );
    expect(denied.headers().location).toContain('message=failed');
    expect(
      (
        await admin
          .from('parent_student_links')
          .update({ active: false })
          .eq('parent_id', parent.id)
          .eq('student_id', student.id)
      ).error,
    ).toBeNull();
    expect(
      (
        await p.client.functions.invoke('student-accounts', {
          body: { action: 'reset_password', student_id: student.id, password },
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await p.client
          .from('lesson_reports')
          .select('lesson_id')
          .eq('lesson_id', lessonId)
      ).data,
    ).toEqual([]);
    await p.page.goto(lessonUrl);
    await expect(
      p.page.getByText('Confident with loops; practise counting down.', {
        exact: true,
      }),
    ).toHaveCount(0);
    console.log(
      'Phase 3: schedule, worksheet, submission, review, attendance, private drafts, published snapshots and parent revocation passed.',
    );
  } finally {
    // Cleanup gets its own time budget even after a failed assertion.
    test.setTimeout(300000);
    for (const ctx of contexts) await ctx.close();
    const errors: string[] = [];
    if (classId) {
      const result = await admin
        .from('classrooms')
        .delete()
        .eq('id', classId)
        .eq('name', className);
      if (result.error) errors.push(result.error.message);
    }
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
    if (!session.error && session.data.user) await context.storageState({ path: process.env.CODELAH_ADMIN_STATE! });
    expect(errors, 'QA cleanup').toEqual([]);
  }
});
