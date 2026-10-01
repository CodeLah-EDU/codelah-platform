import { test, expect, type FrameLocator, type Page } from '@playwright/test';
import { env, origin, qaAccounts, type Fixture } from './qa';

// Multi-person Daily classroom check against the shared Supabase project and the real
// Daily account. An authorized admin session creates throwaway QA accounts and a class,
// and the test suspends/deletes them afterwards.
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
  const qa = await qaAccounts(browser, context);
  const { admin, suffix, fixture } = qa;
  const className = `QA Video ${suffix}`;
  const signIn = (f: Fixture) =>
    qa.signIn(f, {
      permissions: ['camera', 'microphone'],
      viewport: { width: 1000, height: 760 },
    });
  let classId: string | undefined;
  let roomName: string | undefined;

  try {
    const students: Fixture[] = [];
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
    const sendChat = async (page: Page, text: string) => {
      await chat(page).getByLabel('Message to the class').fill(text);
      await chat(page).getByRole('button', { name: 'Send' }).click();
      await expect(chat(page).getByText(text)).toBeVisible();
    };
    const chatItem = (page: Page, text: string) =>
      chat(page).getByRole('listitem').filter({ hasText: text });
    // Sent before anyone else arrives, so students must receive it as catch-up.
    await sendChat(t.page, `print("early ${suffix}")`);

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

    await test.step('everyone can chat, under their own name', async () => {
      await sendChat(t.page, `live note ${suffix}`);
      await sendChat(studentPages[1], `question ${suffix}`);
      for (const page of [t.page, ...studentPages]) {
        // The early message arrived as catch-up but keeps the teacher's name.
        await expect(chatItem(page, `print("early ${suffix}")`)).toContainText(
          `${teacher.name} (teacher)`,
        );
        await expect(chatItem(page, `live note ${suffix}`)).toContainText(
          `${teacher.name} (teacher)`,
        );
        await expect(chatItem(page, `question ${suffix}`)).toContainText(
          students[1].name,
        );
        await expect(chatItem(page, `question ${suffix}`)).not.toContainText(
          '(teacher)',
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
    errors.push(...(await qa.cleanup()));
    expect(errors, 'QA cleanup').toEqual([]);
  }
});
