import { test, expect } from '@playwright/test';

test('administrator overview links to actionable fees, attendance and account requests', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/preview/admin');
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: /2 overdue fees/ }).click();
  await expect(page).toHaveURL(/finances\/fees\?status=overdue/);
  await expect(page.getByLabel('Filter fees by status')).toHaveValue('overdue');
  await expect(page.locator('.ops-table tbody tr')).toHaveCount(2);
  await page
    .getByRole('navigation', { name: 'Administration' })
    .getByRole('link', { name: 'Overview' })
    .click();
  await page.getByRole('link', { name: /1 unmarked entry/ }).click();
  await expect(page.getByLabel('Attendance filter')).toHaveValue('unmarked');
  await expect(page.locator('.ops-table tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('fee filters, exports and edit dialogs work without saving fictional payments', async ({
  page,
}) => {
  let writes = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/admin/action')) writes++;
  });
  await page.goto('/preview/admin/finances');
  await page.getByLabel('Filter fees by status').selectOption('overdue');
  await page.getByRole('textbox', { name: 'Search fees' }).fill('Aarav');
  await expect(page.locator('.ops-table tbody tr')).toHaveCount(1);
  const downloadPromise = page.waitForEvent('download');
  await page
    .locator('.ops-ledger')
    .getByRole('button', { name: 'Export CSV' })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('student-fees.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('Aarav Lim');
  expect(csv).not.toContain('Maya Tan');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit fee' });
  await dialog.getByLabel('Payment status').selectOption('paid');
  await expect(dialog.getByLabel('Date received')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save fee record' }).click();
  await expect(dialog.getByRole('alert')).toContainText('read-only preview');
  expect(writes).toBe(0);
});

test('expense filters and create form keep business costs separate from fees', async ({
  page,
}) => {
  await page.goto('/preview/admin/finances/expenses');
  await page.getByLabel('Expense category').selectOption('Software');
  await expect(page.locator('.ops-table tbody tr')).toHaveCount(6);
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add an expense' });
  await dialog.getByLabel('Description', { exact: true }).fill('Test expense');
  await dialog.getByLabel('Amount (SGD)').fill('29.90');
  await dialog
    .getByRole('button', { name: 'Add expense', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText('read-only preview');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('attendance bulk selection updates only unmarked entries and future registers cannot save', async ({
  page,
}) => {
  await page.goto('/preview/admin/attendance/lesson-3');
  await expect(page.getByLabel('Attendance for Maya Tan')).toHaveValue(
    'unmarked',
  );
  await expect(page.getByLabel('Attendance for Sophie Lee')).toHaveValue(
    'late',
  );
  await page.getByRole('button', { name: 'Mark unmarked present' }).click();
  await expect(page.getByLabel('Attendance for Maya Tan')).toHaveValue(
    'present',
  );
  await expect(page.getByLabel('Attendance for Sophie Lee')).toHaveValue(
    'late',
  );
  await page.getByLabel('Note for Maya Tan').fill('Joined on time.');
  await page.getByRole('button', { name: 'Save attendance' }).click();
  await expect(page.locator('.ops-inline-error')).toContainText(
    'read-only preview',
  );
  await page.goto('/preview/admin/attendance/lesson-4');
  await expect(
    page.getByRole('button', { name: 'Save attendance' }),
  ).toBeDisabled();
  await expect(page.getByLabel('Attendance for Maya Tan')).toBeDisabled();
});

test('account search, many-to-many families and role setup are easy to reach', async ({
  page,
}) => {
  await page.goto('/preview/admin/accounts');
  await page
    .getByRole('textbox', { name: 'Search accounts' })
    .fill('maya_codes');
  await expect(page.locator('.ops-table tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Maya Tan', exact: true }).click();
  const family = page
    .locator('.ops-panel')
    .filter({ has: page.getByRole('heading', { name: 'Linked parents' }) });
  await expect(family.getByRole('link', { name: 'Jamie Tan' })).toBeVisible();
  await expect(family.getByRole('link', { name: 'Robin Tan' })).toBeVisible();
  await family.getByRole('link', { name: 'Jamie Tan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Linked children' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Leo Tan', exact: true }),
  ).toBeVisible();
  await page.goto('/preview/admin/accounts/new');
  await page.getByRole('radio', { name: 'Parent', exact: true }).check();
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Initial password')).toHaveCount(0);
  await page.getByLabel('Full name').fill('Example adult');
  await page.getByLabel('Email address').fill('adult@example.invalid');
  await page.getByRole('button', { name: 'Send parent invitation' }).click();
  await expect(page.locator('.ops-inline-error')).toContainText(
    'read-only preview',
  );
});

test('class management preserves capacity and exposes enrolment and teacher controls', async ({
  page,
}) => {
  await page.goto('/preview/admin/classes/class-python');
  await expect(page.getByText('3 / 4 places')).toBeVisible();
  await page.getByLabel('Add a student').selectOption('sophie');
  await page.getByRole('button', { name: 'Enrol student' }).click();
  await expect(page.locator('.ops-notice')).toContainText('read-only preview');
  await expect(
    page.getByRole('button', { name: 'Remove assignment' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit class', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Edit class' }).getByLabel('Class name'),
  ).toHaveValue('Python explorers');
});

test('lesson scheduling and editing remain inside the administrator console', async ({
  page,
}) => {
  await page.goto('/preview/admin/classes/class-python');
  await page
    .getByRole('button', { name: 'Schedule lesson', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Schedule a lesson' });
  await expect(dialog.getByLabel('Class', { exact: true })).toHaveValue(
    'class-python',
  );
  await dialog.getByLabel('Lesson title').fill('Functions in the garden');
  await dialog.getByLabel('Starts (Singapore time)').fill('2098-10-01T16:00');
  await dialog.getByLabel('Ends (Singapore time)').fill('2098-10-01T17:30');
  await dialog
    .getByRole('button', { name: 'Schedule lesson', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText('read-only preview');
  await page.goto('/preview/admin/attendance/lesson-4');
  await page.getByRole('button', { name: 'Edit lesson', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Edit lesson' })
    .getByLabel('Lesson status')
    .selectOption('cancelled');
  await page.getByRole('button', { name: 'Save lesson', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'read-only preview',
  );
});

test('administrator routes and mutations reject signed-out or foreign-origin requests', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/admin/finances');
  await expect(page).toHaveURL(/\/admin\/login$/);
  const foreign = await request.post('/admin/action', {
    headers: { origin: 'https://unrelated.example' },
    form: { action: 'expense_save' },
  });
  expect(foreign.status()).toBe(403);
  const signedOut = await request.post('/admin/action', {
    headers: { origin: new URL(baseURL!).origin },
    form: { action: 'expense_save' },
  });
  expect(signedOut.status()).toBe(401);
});

test('administrator desktop and mobile pages have no overflow or runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 960 });
    for (const path of [
      '',
      '/finances',
      '/finances/expenses',
      '/finances/history',
      '/attendance',
      '/attendance/lesson-3',
      '/accounts',
      '/accounts/maya',
      '/accounts/maya/finances',
      '/accounts/new',
      '/classes',
      '/relationships',
      '/adults',
    ]) {
      await page.goto(`/preview/admin${path}`);
      await expect(page.locator('.admin-console')).toHaveAttribute(
        'aria-busy',
        'false',
      );
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(true);
      await page.screenshot({
        path: `test-results/admin-${width}-${path.replaceAll('/', '-') || 'overview'}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  await page
    .getByRole('button', { name: 'Toggle administration menu' })
    .click();
  await expect(
    page.getByRole('navigation', { name: 'Administration' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('navigation', { name: 'Administration' }),
  ).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Toggle administration menu' }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});
