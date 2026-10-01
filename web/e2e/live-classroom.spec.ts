import {
  test,
  expect,
  type BrowserContext,
  type FrameLocator,
  type Page,
} from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Multi-person Daily classroom check against the shared Supabase project and the real
// Daily account. An authorized admin session creates throwaway QA accounts and a class,
// and the test suspends/deletes them afterwards.
const env: Record<string, string | undefined> = {
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
const origin = env.TEST_BASE_URL ?? 'http://localhost:3001';

test.use({
  storageState: process.env.CODELAH_ADMIN_STATE,
  trace: 'off',
  launchOptions: {
    // Synthetic camera/microphone and auto-approved screen capture, so no real devices are needed.
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--auto-select-desktop-capture-source=Entire screen',
    ],
  },
});

type DailyBody = {
  privacy?: string;
  config?: { max_participants?: number };
  total_count?: number;
};

async function daily(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.daily.co/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return {
    status: response.status,
    body: (await response.json().catch(() => null)) as DailyBody | null,
  };
}

async function clientFor(ctx: BrowserContext) {
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

async function joinClassroom(page: Page, lessonId: string) {
  const log: string[] = [];
  page.on('console', (m) => log.push(`console.${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));
  page.on('response', async (r) => {
    if (r.url().includes('/classroom/join'))
      log.push(
        `join route ${r.status()}: ${(await r.text().catch(() => '')).slice(0, 200).replace(/"token":"[^"]+"/, '"token":"…"')}`,
      );
  });
  // The classroom page starts joining by itself; no CodeLah button to press first.
  await page.goto(`${origin}/dashboard/lessons/${lessonId}/classroom`);
  // Daily Prebuilt shows its own pre-join (camera/mic check) screen inside the iframe.
  const frame = page.frameLocator('.daily-frame iframe');
  try {
    await frame
      .getByRole('button', { name: /^join/i })
      .click({ timeout: 45000 });
  } catch (error) {
    await page.screenshot({ path: test.info().outputPath('join-failed.png') });
    const box = await page.locator('.daily-frame').boundingBox();
    const buttons = await frame
      .getByRole('button')
      .allInnerTexts()
      .catch(() => ['(iframe not readable)']);
    console.log(
      'daily-frame box:',
      JSON.stringify(box),
      'iframe buttons:',
      buttons,
    );
    console.log(log.join('\n'));
    throw error;
  }
  return frame;
}

const presence = async (roomName: string) =>
  (await daily(`/rooms/${roomName}/presence`)).body?.total_count;

test('five people share one Daily classroom with the right permissions', async ({
  page,
  context,
  browser,
}) => {
  test.skip(
    !process.env.CODELAH_ADMIN_STATE,
    'Requires an explicitly authorized admin test session.',
  );
  test.skip(!env.DAILY_API_KEY, 'Requires DAILY_API_KEY in web/.env.local.');
  test.setTimeout(6 * 60 * 1000);
  await page.goto(`${origin}/admin`);
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  const admin = await clientFor(context);
  expect((await admin.auth.getUser()).error).toBeNull();
  const suffix = randomUUID().slice(0, 8),
    password = `QA-${randomUUID()}!`,
    className = `QA Video ${suffix}`;
  const fixtures: { id: string; username: string; name: string }[] = [];
  const contexts: BrowserContext[] = [];
  let classId: string | undefined;
  let roomName: string | undefined;

  async function fixture(
    role: 'student' | 'parent' | 'teacher',
    label: string,
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
  async function signIn(f: { username: string }) {
    const ctx = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1000, height: 760 },
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

  try {
    const students = [];
    for (const n of [1, 2, 3, 4])
      students.push(await fixture('student', `s${n}`));
    const teacher = await fixture('teacher', 'teacher'),
      spareTeacher = await fixture('teacher', 'spare'),
      parent = await fixture('parent', 'parent');
    const created = await admin
      .from('classrooms')
      .insert({ name: className })
      .select('id')
      .single();
    expect(created.error).toBeNull();
    classId = created.data!.id;
    for (const s of students)
      expect(
        (
          await admin
            .from('enrolments')
            .insert({ classroom_id: classId, student_id: s.id })
        ).error,
      ).toBeNull();
    for (const tch of [teacher, spareTeacher])
      expect(
        (
          await admin
            .from('teacher_assignments')
            .insert({ classroom_id: classId, teacher_id: tch.id })
        ).error,
      ).toBeNull();
    expect(
      (
        await admin
          .from('parent_student_links')
          .insert({ parent_id: parent.id, student_id: students[0].id })
      ).error,
    ).toBeNull();

    const t = await signIn(teacher);
    // Starts shortly: inside the 15-minute early-join window, and still in the future so
    // the enrolled students are copied onto the lesson roster.
    const starts = new Date(Date.now() + 3 * 60 * 1000);
    const lesson = await t.client
      .from('lessons')
      .insert({
        classroom_id: classId,
        title: `Video check ${suffix}`,
        starts_at: starts.toISOString(),
        ends_at: new Date(starts.getTime() + 90 * 60 * 1000).toISOString(),
        created_by: teacher.id,
      })
      .select('id')
      .single();
    expect(lesson.error, 'lesson created').toBeNull();
    const lessonId = lesson.data!.id;
    const roster = await t.client
      .from('lesson_roster')
      .select('student_id', { count: 'exact', head: true })
      .eq('lesson_id', lessonId);
    expect(roster.count, 'all four students on the roster').toBe(4);

    const firstStudent = await signIn(students[0]);
    await test.step('students wait until the teacher opens the room', async () => {
      const early = await firstStudent.page.request.post(
        `${origin}/dashboard/lessons/classroom/join`,
        { headers: { Origin: origin }, multipart: { lesson_id: lessonId } },
      );
      expect(early.status()).toBe(409);
    });

    const teacherFrame =
      await test.step('teacher joins and opens the room', () =>
        joinClassroom(t.page, lessonId));
    const room = `codelah-${lessonId.replaceAll('-', '')}`;
    roomName = room;
    const details = await daily(`/rooms/${room}`);
    expect(details.status, 'Daily room exists').toBe(200);
    expect(details.body?.privacy).toBe('private');
    expect(details.body?.config?.max_participants).toBe(5);

    const chat = (page: Page) =>
      page.getByRole('complementary', { name: 'Class chat' });
    const sendChat = async (text: string) => {
      await chat(t.page).getByLabel('Message to the class').fill(text);
      await chat(t.page).getByRole('button', { name: 'Send' }).click();
      await expect(chat(t.page).getByText(text)).toBeVisible();
    };
    // Sent before anyone else arrives, so students must receive it as catch-up.
    await sendChat(`print("early ${suffix}")`);

    const studentPages: Page[] = [];
    const studentFrames: FrameLocator[] = [];
    for (const [i, s] of students.entries()) {
      const session = i === 0 ? firstStudent : await signIn(s);
      studentPages.push(session.page);
      studentFrames.push(
        await test.step(`student ${i + 1} joins`, () =>
          joinClassroom(session.page, lessonId)),
      );
    }

    await test.step('Daily sees all five participants', async () => {
      await expect.poll(() => presence(room), { timeout: 60000 }).toBe(5);
    });

    await test.step('only the teacher can share their screen', async () => {
      await expect(
        teacherFrame.getByRole('button').filter({ hasText: /share/i }),
      ).toBeVisible();
      for (const frame of studentFrames)
        await expect(
          frame.getByRole('button').filter({ hasText: /share/i }),
        ).toHaveCount(0);
    });

    await test.step('the teacher chat reaches every student', async () => {
      await sendChat(`live note ${suffix}`);
      for (const page of studentPages) {
        await expect(
          chat(page).getByText(`print("early ${suffix}")`),
        ).toBeVisible();
        await expect(chat(page).getByText(`live note ${suffix}`)).toBeVisible();
        await expect(chat(page).getByLabel('Message to the class')).toHaveCount(
          0,
        );
      }
    });

    // Kept for a person to review the call layout after the run.
    await t.page.screenshot({
      path: test.info().outputPath('teacher-call.png'),
    });
    await studentPages[0].screenshot({
      path: test.info().outputPath('student-call.png'),
    });

    await test.step('the teacher can switch to full screen', async () => {
      await t.page.getByRole('button', { name: 'Full screen' }).click();
      await expect(
        t.page.getByRole('button', { name: 'Exit full screen' }),
      ).toBeVisible();
      await t.page.getByRole('button', { name: 'Exit full screen' }).click();
      await expect(
        t.page.getByRole('button', { name: 'Full screen' }),
      ).toBeVisible();
    });

    await test.step('a parent cannot open or join the classroom', async () => {
      const p = await signIn(parent);
      // The streamed loading shell fixes the HTTP status at 200, so check what renders.
      await p.page.goto(`${origin}/dashboard/lessons/${lessonId}/classroom`);
      await expect(
        p.page.getByText('This page could not be found.'),
      ).toBeVisible();
      await expect(
        p.page.getByRole('button', { name: /join classroom/i }),
      ).toHaveCount(0);
      const join = await p.page.request.post(
        `${origin}/dashboard/lessons/classroom/join`,
        {
          headers: { Origin: origin },
          multipart: { lesson_id: lessonId },
        },
      );
      expect(join.status()).toBe(403);
    });

    await test.step('a sixth person is turned away', async () => {
      const extra = await signIn(spareTeacher);
      await extra.page.goto(
        `${origin}/dashboard/lessons/${lessonId}/classroom`,
      );
      const frame = extra.page.frameLocator('.daily-frame iframe');
      await frame
        .getByRole('button', { name: /^join/i })
        .click({ timeout: 45000 })
        .catch(() => undefined);
      // Refused either by CodeLah (alert) or by Daily's full-room notice in the frame.
      await expect
        .poll(
          async () =>
            (await extra.page.getByRole('alert').count()) +
            (await frame
              .getByText(/full/i)
              .count()
              .catch(() => 0)),
          { timeout: 30000 },
        )
        .toBeGreaterThan(0);
      await expect.poll(() => presence(room)).toBe(5);
    });

    // Keep the call up briefly so a person watching can see every tile.
    await t.page.waitForTimeout(Number(env.CODELAH_VIDEO_HOLD_MS ?? 15000));
  } finally {
    // Cleanup gets its own time budget even after a failed assertion.
    test.setTimeout(300000);
    for (const ctx of contexts) await ctx.close().catch(() => undefined);
    const errors: string[] = [];
    if (roomName) {
      const removed = await daily(`/rooms/${roomName}`, { method: 'DELETE' });
      if (removed.status !== 200)
        errors.push(`Daily room delete ${removed.status}`);
    }
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
    if (!session.error && session.data.user)
      await context.storageState({ path: process.env.CODELAH_ADMIN_STATE! });
    expect(errors, 'QA cleanup').toEqual([]);
  }
});
