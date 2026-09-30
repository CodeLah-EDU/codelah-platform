import { test, expect } from '@playwright/test';

test('profile selection supports the keyboard and clears passwords when profiles change', async ({
  page,
}) => {
  await page.goto('/');
  const student = page.getByRole('radio', { name: 'Student', exact: true });
  await expect(student).toBeEnabled();
  await page.getByLabel('Password', { exact: true }).fill('example-only');
  await page
    .getByRole('button', { name: 'Show password', exact: true })
    .click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'text',
  );
  await student.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('radio', { name: 'Parent', exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'password',
  );
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('button', { name: 'Teacher sign in' }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('form', { name: 'Teacher sign in' })
      .locator('input[name=kind]'),
  ).toHaveValue('adult');
  // Cycle back through profiles to catch stale descriptions accumulating.
  const descriptions = {
    Student: 'Your next discovery starts here.',
    Parent: 'A little closer to every milestone.',
    Teacher: 'Make room for the next bright idea.',
  };
  for (const name of [
    'Student',
    'Parent',
    'Teacher',
    'Parent',
    'Student',
    'Teacher',
  ] as const) {
    await page.getByRole('radio', { name, exact: true }).check();
    await expect(page.locator('.entry-profile-description')).toHaveText([
      descriptions[name],
    ]);
    await expect(page.locator('.entry-form')).toHaveCount(1);
  }
});

test('failed login retains the selected profile; admin retains its own entry', async ({
  request,
  page,
  baseURL,
}) => {
  for (const profile of ['student', 'parent', 'teacher']) {
    const result = await request.post('/auth/login', {
      headers: { origin: new URL(baseURL!).origin },
      form: {
        kind: profile === 'student' ? 'student' : 'adult',
        profile,
        identifier: '',
        password: '',
      },
      maxRedirects: 0,
    });
    expect(result.status()).toBe(303);
    const target = new URL(result.headers().location);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('profile')).toBe(profile);
    expect(target.searchParams.get('message')).toBe('invalid');
    await page.goto(`${target.pathname}${target.search}`);
    await expect(
      page.getByRole('radio', { name: new RegExp(`^${profile}$`, 'i') }),
    ).toBeChecked();
    await expect(page.getByRole('status')).toContainText(
      'We could not sign you in.',
    );
  }
  const result = await request.post('/auth/login', {
    headers: { origin: new URL(baseURL!).origin },
    form: { kind: 'admin', identifier: '', password: '' },
    maxRedirects: 0,
  });
  expect(new URL(result.headers().location).pathname).toBe('/admin/login');
});

test('adult recovery links and registration feedback retain a usable adult form', async ({
  page,
}) => {
  await page.goto('/login#recovery');
  await expect(
    page.getByRole('radio', { name: 'Parent', exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel('Your account email')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send reset link' }),
  ).toBeVisible();
  await page.goto('/login?message=registered');
  await expect(page.getByRole('status')).toContainText('Check your email');
  await expect(
    page.getByRole('button', { name: 'Parent sign in' }),
  ).toBeEnabled();
});

test('reduced motion keeps the garden static and demos keyboard accessible on mobile', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('radio', { name: 'Parent', exact: true }).check();
  expect(
    await page
      .locator('.garden-parent .garden-canopy')
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  expect(
    await page
      .locator('.entry-profile-highlight')
      .evaluate((node) => getComputedStyle(node).transitionDuration),
  ).toBe('0s');
  await page.getByRole('button', { name: 'Try a demo' }).click();
  await expect(page.getByRole('button', { name: 'Close demos' })).toBeFocused();
  await page.screenshot({
    path: 'test-results/sign-in-demo-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Try a demo' })).toBeFocused();
});
