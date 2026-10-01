import { test, expect } from '@playwright/test';

test('platform entry provides profile selection and working demo navigation', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Welcome back.',
  );
  await page.getByRole('radio', { name: 'Teacher', exact: true }).check();
  await expect(
    page.getByRole('button', { name: 'Teacher sign in' }),
  ).toBeEnabled();
  await expect(page.locator('.entry-garden')).toHaveAttribute(
    'data-profile',
    'teacher',
  );
  await expect(
    page.getByRole('link', { name: 'Administrator' }),
  ).toHaveAttribute('href', '/admin/login');
  await page.getByRole('button', { name: 'Try a demo' }).click();
  const demo = page.getByRole('dialog', { name: 'Find your space.' });
  await expect(demo).toBeVisible();
  await expect(
    demo.getByRole('link', { name: /Student demo/ }),
  ).toHaveAttribute('href', '/preview/student/home');
  await expect(demo.getByRole('link', { name: /Parent demo/ })).toHaveAttribute(
    'href',
    '/preview/parent/home',
  );
  await expect(
    demo.getByRole('link', { name: /Teacher demo/ }),
  ).toHaveAttribute('href', '/preview/teacher/calendar');
  await page.keyboard.press('Escape');
  await expect(demo).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Try a demo' })).toBeFocused();
  await page.getByRole('button', { name: 'Try a demo' }).click();
  await demo.getByRole('link', { name: /Teacher demo/ }).click();
  await expect(page).toHaveURL(/\/preview\/teacher\/calendar$/);
  await expect(
    page.getByRole('heading', { name: 'Assign students' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('worksheet search, access filters and layout controls work; locked files have no download link', async ({
  page,
}) => {
  await page.goto('/preview/student/worksheets');
  await expect(
    page.getByRole('heading', { name: 'Worksheets', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.ws-worksheet')).toHaveCount(6);
  await expect(page.getByText('Teacher solution notes')).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Search worksheets' })
    .fill('variables');
  await expect(page.locator('.ws-worksheet')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Robot name lab' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByLabel('Filter by access').selectOption('locked');
  await expect(page.locator('.ws-worksheet')).toHaveCount(3);
  await expect(page.locator('.ws-worksheet a')).toHaveCount(0);
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(page.locator('.ws-worksheet-grid')).toHaveClass(/as-list/);
});

test('teacher calendar supports student links, drag targets, and accessible roster selection', async ({
  page,
}) => {
  // Tall enough that any calendar row and the student list are on screen together for dragging.
  await page.setViewportSize({ width: 1280, height: 2000 });
  await page.goto('/preview/teacher/calendar');
  await expect(
    page.getByRole('heading', { name: 'Assign students' }),
  ).toBeVisible();
  await expect(page.locator('.ws-draggable[draggable=true]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Schedule class' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Schedule a class' }),
  ).toBeVisible();
  await expect(page.getByLabel('Starts (Singapore time)')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page
    .locator('.ws-draggable')
    .filter({ hasText: 'Aarav Lim' })
    .dragTo(
      page
        .locator('.ws-calendar-event')
        .filter({ hasText: 'Make a guessing game' }),
    );
  await expect(page.locator('.ws-notice')).toContainText('read-only preview');
  await page.getByRole('button', { name: 'Dismiss message' }).click();
  await page.goto('/preview/teacher/calendar/lesson-4');
  await expect(
    page.getByRole('button', { name: 'Add student', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Student', { exact: true }).selectOption('aarav');
  await page.getByRole('button', { name: 'Add student', exact: true }).click();
  await expect(
    page.locator('.ws-notice').filter({ hasText: 'read-only preview' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Maya Tan' }).click();
  await expect(page).toHaveURL(/students\/maya\/overview/);
});

test('parents can switch children and inspect records without edit or assignment controls', async ({
  page,
}) => {
  await page.goto('/preview/parent/students/maya/overview');
  await expect(
    page.getByRole('heading', { name: 'Maya Tan', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Linked parents' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Worksheet assignment' }),
  ).toHaveCount(0);
  await page.getByLabel('Viewing child').selectOption('leo');
  await expect(
    page.getByRole('heading', { name: 'Leo Tan', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Objective tracker' }).click();
  await expect(page.getByRole('button', { name: 'Mark complete' })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('button', { name: 'Manage curriculum' }),
  ).toHaveCount(0);
});

test('lesson detail retains feedback, student notes, and project files', async ({
  page,
}) => {
  await page.goto('/preview/student/calendar/lesson-3');
  await expect(
    page.getByRole('heading', {
      name: 'Choose your own adventure',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText('dragon_story.py')).toBeVisible();
  await expect(
    page.getByText('Maya built a story with three different endings', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Add your own note')).toBeVisible();
  await page.goto('/preview/parent/calendar/lesson-3');
  await expect(page.getByLabel('Add your own note')).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Delete', exact: true }),
  ).toHaveCount(0);
});

test('new mutations reject a foreign origin without changing data', async ({
  request,
}) => {
  const response = await request.post('/dashboard/workspace/action', {
    headers: { origin: 'https://unrelated.example' },
    multipart: {
      action: 'worksheet_unlock',
      worksheet_id: 'anything',
      student_id: 'anything',
    },
  });
  expect(response.status()).toBe(403);
});

test('desktop and mobile pages have no overflow or runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const pages = [
    '/',
    '/preview/student/home',
    '/preview/student/worksheets',
    '/preview/student/progress',
    '/preview/student/calendar',
    '/preview/student/files',
    '/preview/student/practise',
    '/preview/teacher/home',
    '/preview/teacher/classes',
    '/preview/teacher/classes/class-python',
    '/preview/teacher/classes/class-builders',
    '/preview/teacher/calendar',
    '/preview/teacher/students',
    '/preview/teacher/students/maya/overview',
    '/preview/teacher/students/maya/timeline',
    '/preview/teacher/students/maya/worksheets',
    '/preview/teacher/students/maya/objectives',
    '/preview/parent/home',
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 960 });
    for (const path of pages) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(true);
      await page.screenshot({
        path: `test-results/workspace-${width}-${path.replaceAll('/', '-') || 'landing'}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  expect(errors).toEqual([]);
});

test('mobile navigation overlays the page and supports keyboard focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview/student/home');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Workspace', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Files', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Files', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Workspace', exact: true }),
  ).not.toBeVisible();
});
