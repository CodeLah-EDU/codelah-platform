import { test, expect } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Explicit opt-in: the user signs into an isolated browser. Never use their
// normal browser profile or keep session state/passwords in the repository.
test.use({ storageState: process.env.CODELAH_ADMIN_STATE, trace: 'off' });
test('administrator creates a class, links a parent, assigns a teacher, and verifies student access', async ({
  page,
  context,
  browser,
}) => {
  test.skip(
    !process.env.CODELAH_ADMIN_STATE,
    'Requires a user-authorized administrator test session.',
  );
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => {
        const n = line.indexOf('=');
        return [line.slice(0, n), line.slice(n + 1)];
      }),
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const origin = process.env.TEST_BASE_URL ?? 'http://localhost:3001';
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  const jar = await context.cookies();
  const admin = createServerClient(url, key, {
    cookies: {
      getAll: () => jar,
      setAll: async (values) => {
        for (const cookie of values) {
          const existing = jar.find((c) => c.name === cookie.name);
          if (existing) existing.value = cookie.value;
          else
            jar.push({
              name: cookie.name,
              value: cookie.value,
              domain: 'localhost',
              path: '/',
              expires: -1,
              httpOnly: false,
              secure: false,
              sameSite: 'Lax',
            });
        }
        await context.addCookies(
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
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser();
  expect(userError).toBeNull();
  expect(user).toBeTruthy();
  const { data: actor } = await admin
    .from('accounts')
    .select('role,status')
    .eq('id', user!.id)
    .single();
  expect(actor).toEqual({ role: 'admin', status: 'active' });
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const password = `QA-${randomUUID()}-secure`;
  const className = `QA Class ${suffix}`;
  let classId: string | undefined;
  const fixtures: {
    id: string;
    name: string;
    username: string;
    role: string;
  }[] = [];
  const studentContext = await browser.newContext();
  const makeFixture = async (role: 'student' | 'parent' | 'teacher') => {
    const name = `QA ${role} ${suffix}`,
      username = `qa_${role}_${suffix}`;
    const { data, error } = await admin.functions.invoke('student-accounts', {
      body: {
        action: 'create_student',
        display_name: name,
        username,
        password,
      },
    });
    expect(error, `Create ${role} fixture`).toBeNull();
    expect(data?.student_id).toBeTruthy();
    const fixture = { id: data.student_id as string, name, username, role };
    fixtures.push(fixture);
    if (role !== 'student') {
      // Test-only setup: reuse the managed Auth identity, replacing its brand-new
      // student profile with a parent/teacher profile. No email is sent. This
      // exercises real RLS and UI relationships, not adult email onboarding.
      const removed = await admin
        .from('accounts')
        .delete()
        .eq('id', fixture.id);
      expect(removed.error).toBeNull();
      const added = await admin.from('accounts').insert({
        id: fixture.id,
        display_name: name,
        role,
        status: 'active',
        contact_email: `${username}@example.invalid`,
      });
      expect(added.error).toBeNull();
    }
    return fixture;
  };
  try {
    const student = await makeFixture('student');
    const parent = await makeFixture('parent');
    const teacher = await makeFixture('teacher');
    // Creation forms are distinct and reachable from their own directories.
    await page.goto('/admin/students/new');
    await expect(
      page.getByLabel('Student name', { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Class name', { exact: true })).toHaveCount(0);
    await page
      .getByRole('navigation', { name: 'Administration', exact: true })
      .getByRole('link', { name: 'Classes', exact: true })
      .click();
    await page
      .getByRole('link', { name: '+ Create class', exact: true })
      .click();
    await expect(page.getByLabel('Student name', { exact: true })).toHaveCount(
      0,
    );
    await page.getByLabel('Class name', { exact: true }).fill(className);
    await page
      .getByRole('button', { name: 'Create class', exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/classes\?message=saved$/);
    const classCard = page.locator('section.panel').filter({
      has: page.getByRole('heading', { name: className, exact: true }),
    });
    await classCard
      .getByRole('link', { name: 'Manage class →', exact: true })
      .click();
    await expect(page).toHaveURL(/\/admin\/classes\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole('heading', { name: className, exact: true }),
    ).toBeVisible();
    classId = new URL(page.url()).pathname.split('/').at(-1)!;
    await page
      .getByRole('combobox', { name: 'Add a student', exact: true })
      .selectOption(student.id);
    await page
      .getByRole('button', { name: 'Enrol student', exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/classes/${classId}\\?message=saved$`),
    );
    await expect(page.getByText(student.name, { exact: true })).toBeVisible();
    await page
      .getByRole('combobox', { name: 'Assign a teacher', exact: true })
      .selectOption(teacher.id);
    await page
      .getByRole('button', { name: 'Assign teacher', exact: true })
      .click();
    await expect(page.getByText(teacher.name, { exact: true })).toBeVisible();
    // Parent contact information starts empty, then reflects the real link.
    await page.goto('/admin/students');
    const studentCard = page.locator(`#student-${student.id}`);
    await expect(
      studentCard.getByText('No parent linked.', { exact: false }),
    ).toBeVisible();
    await studentCard
      .getByRole('link', { name: 'Link a parent →', exact: true })
      .click();
    await expect(
      page.getByRole('combobox', { name: 'Student', exact: true }),
    ).toHaveValue(student.id);
    await page
      .getByRole('combobox', { name: 'Parent', exact: true })
      .selectOption(parent.id);
    await page
      .getByRole('button', { name: 'Link parent to student', exact: true })
      .click();
    await page.goto('/admin/students');
    await expect(
      studentCard.getByRole('link', { name: parent.name, exact: true }),
    ).toBeVisible();
    await expect(
      studentCard.getByRole('link', {
        name: `${parent.username}@example.invalid`,
        exact: true,
      }),
    ).toHaveAttribute('href', `mailto:${parent.username}@example.invalid`);
    await page.screenshot({
      path: 'test-results/admin-students-linked-parent.png',
      fullPage: true,
      caret: 'initial',
    });
    await studentCard
      .getByRole('link', { name: parent.name, exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/parents#parent-${parent.id}$`),
    );
    await page
      .getByRole('navigation', { name: 'Administration', exact: true })
      .getByRole('link', { name: 'Teachers', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Teachers', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: teacher.name, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: parent.name, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: className, exact: true }),
    ).toBeVisible();
    // Real managed password sign-in in an independent student browser context.
    const studentPage = await studentContext.newPage();
    await studentPage.goto(`${origin}/login`);
    const signIn = studentPage.locator('form').filter({
      has: studentPage.getByRole('button', {
        name: 'Student sign in',
        exact: true,
      }),
    });
    await signIn.getByLabel('Username', { exact: true }).fill(student.username);
    await signIn.getByLabel('Password', { exact: true }).fill(password);
    await signIn.getByRole('button').click();
    await expect(studentPage).toHaveURL(/\/dashboard$/);
    await expect(
      studentPage.getByText(className, { exact: true }),
    ).toBeVisible();
    await expect(
      studentPage.getByRole('navigation', {
        name: 'Administration',
        exact: true,
      }),
    ).toHaveCount(0);
    await studentPage.goto(`${origin}/admin/teachers`);
    await expect(studentPage).toHaveURL(/\/dashboard$/);
    // Real parent/teacher JWTs and direct database calls exercise RLS separately
    // from UI visibility. These fixtures do not test email signup or delivery.
    const parentClient = createClient(url, key, {
      auth: { persistSession: false },
    });
    const teacherClient = createClient(url, key, {
      auth: { persistSession: false },
    });
    for (const [client, fixture] of [
      [parentClient, parent],
      [teacherClient, teacher],
    ] as const) {
      const result = await client.auth.signInWithPassword({
        email: `${fixture.username}@students.codelah.invalid`,
        password,
      });
      expect(result.error).toBeNull();
      const visible = await client.from('accounts').select('id');
      expect(visible.error).toBeNull();
      expect(visible.data?.map((p) => p.id).sort()).toEqual(
        [fixture.id, student.id].sort(),
      );
    }
    // End enrolment in the admin UI; a student refresh must remove the class.
    await page.goto(`/admin/classes/${classId}`);
    await page
      .getByRole('button', {
        name: `End enrolment for ${student.name}`,
        exact: true,
      })
      .click();
    await studentPage.reload();
    await expect(studentPage.getByText(className, { exact: true })).toHaveCount(
      0,
    );
    await page.goto('/admin/relationships');
    const family = page.locator('li').filter({
      has: page.getByRole('heading', { name: parent.name, exact: true }),
    });
    await family
      .getByRole('button', { name: 'Revoke access', exact: true })
      .click();
    await page.goto('/admin/students');
    await expect(
      studentCard.getByRole('link', { name: parent.name, exact: true }),
    ).toHaveCount(0);
    const parentDenied = await parentClient
      .from('accounts')
      .select('id')
      .eq('id', student.id);
    expect(parentDenied.data).toEqual([]);
    const teacherDenied = await teacherClient
      .from('accounts')
      .select('id')
      .eq('id', student.id);
    expect(teacherDenied.data).toEqual([]);
    await expect(
      page.getByRole('heading', { name: 'Students', exact: true }),
    ).toBeVisible();
    // Both desktop and mobile authenticated layouts are exercised.
    await page.screenshot({
      path: 'test-results/admin-students-desktop.png',
      fullPage: true,
      caret: 'initial',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/teachers');
    await expect(
      page.getByRole('heading', { name: 'Teachers', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/admin-teachers-mobile.png',
      fullPage: true,
      caret: 'initial',
    });
    await parentClient.auth.signOut();
    await teacherClient.auth.signOut();
  } finally {
    await studentContext.close();
    {
      // Match the unique QA name even if navigation failed before capturing its ID.
      const removed = await admin
        .from('classrooms')
        .delete()
        .eq('name', className);
      expect(removed.error, 'Remove only the QA class').toBeNull();
    }
    for (const fixture of fixtures) {
      await admin
        .from('parent_student_links')
        .update({ active: false })
        .eq('parent_id', fixture.id);
      const result = await admin
        .from('accounts')
        .update({ status: 'suspended' })
        .eq('id', fixture.id);
      expect(result.error, 'Suspend QA accounts after the test').toBeNull();
    }
    if (process.env.CODELAH_ADMIN_STATE)
      await context.storageState({ path: process.env.CODELAH_ADMIN_STATE });
  }
});
