import { test, expect } from '@playwright/test';
import { origin, qaAccounts } from './qa';

// Weekly scheduling, worksheets shared with a lesson, and the teacher's private notes,
// checked against the hosted project with throwaway QA accounts.
test.use({ storageState: process.env.CODELAH_ADMIN_STATE, trace: 'off' });

test('teachers schedule weekly, share worksheets with a lesson and keep private notes', async ({
  page,
  context,
  browser,
}) => {
  test.skip(
    !process.env.CODELAH_ADMIN_STATE,
    'Requires an explicitly authorized admin test session.',
  );
  test.setTimeout(4 * 60 * 1000);
  await page.goto(`${origin}/admin`);
  await expect(
    page.getByRole('heading', { name: 'Overview', exact: true }),
  ).toBeVisible();
  const qa = await qaAccounts(browser, context);
  const { admin, suffix, fixture, signIn } = qa;
  const className = `QA Planning ${suffix}`;
  let classId: string | undefined;
  const worksheetIds: string[] = [];
  const storagePaths: string[] = [];

  try {
    const learner = await fixture('student', 'learner'),
      classmate = await fixture('student', 'classmate'),
      outsider = await fixture('student', 'outsider'),
      teacher = await fixture('teacher', 'teacher'),
      parent = await fixture('parent', 'parent');
    const created = await admin
      .from('classrooms')
      .insert({ name: className })
      .select('id')
      .single();
    expect(created.error).toBeNull();
    classId = created.data!.id;
    for (const [table, record] of [
      ['enrolments', { classroom_id: classId, student_id: learner.id }],
      ['enrolments', { classroom_id: classId, student_id: classmate.id }],
      [
        'teacher_assignments',
        { classroom_id: classId, teacher_id: teacher.id },
      ],
      [
        'parent_student_links',
        { parent_id: parent.id, student_id: learner.id },
      ],
    ] as const)
      expect((await admin.from(table).insert(record)).error).toBeNull();

    const t = await signIn(teacher),
      s = await signIn(learner),
      o = await signIn(outsider),
      p = await signIn(parent);

    // A locked worksheet with a file, and a teacher-only one.
    const worksheetTitle = `QA loops sheet ${suffix}`;
    for (const visibility of ['locked', 'restricted'] as const) {
      const w = await t.client
        .from('worksheets')
        .insert({
          title: `${visibility === 'locked' ? worksheetTitle : `QA answers ${suffix}`}`,
          visibility,
        })
        .select('id')
        .single();
      expect(w.error, `create ${visibility} worksheet`).toBeNull();
      worksheetIds.push(w.data!.id);
    }
    const [lockedId, restrictedId] = worksheetIds;
    const storagePath = `${lockedId}/qa.pdf`;
    expect(
      (
        await t.client.storage
          .from('worksheet-library')
          .upload(storagePath, Buffer.from('%PDF-1.4 QA'), {
            contentType: 'application/pdf',
          })
      ).error,
    ).toBeNull();
    storagePaths.push(storagePath);
    expect(
      (
        await t.client.from('worksheet_assets').insert({
          worksheet_id: lockedId,
          storage_path: storagePath,
          file_name: 'qa.pdf',
          mime_type: 'application/pdf',
          size_bytes: 11,
        })
      ).error,
    ).toBeNull();
    const canOpen = async (client: typeof s.client) =>
      (
        await client
          .from('worksheet_assets')
          .select('worksheet_id')
          .eq('worksheet_id', lockedId)
      ).data?.length ?? 0;
    expect(await canOpen(s.client), 'locked before sharing').toBe(0);

    await test.step('teacher schedules a lesson every week, 4 times', async () => {
      await t.page.goto(`${origin}/dashboard/calendar`);
      await t.page.getByRole('button', { name: 'Schedule class' }).click();
      const dialog = t.page.getByRole('dialog');
      await dialog.getByLabel('Class title').fill(`Loops ${suffix}`);
      await dialog.getByLabel('Teaching group').selectOption(classId!);
      // Far enough ahead not to collide with anything; Singapore time.
      const start = new Date(Date.now() + 60 * 86400000);
      const day = start.toISOString().slice(0, 10);
      await dialog.getByLabel('Starts (Singapore time)').fill(`${day}T15:00`);
      await dialog.getByLabel('Ends (Singapore time)').fill(`${day}T16:30`);
      await dialog.getByLabel('Repeat').selectOption('4');
      await dialog.getByRole('button', { name: 'Schedule class' }).click();
      await expect(t.page.getByText('Changes saved.')).toBeVisible();
    });
    const lessons = await t.client
      .from('lessons')
      .select('id,starts_at')
      .eq('classroom_id', classId)
      .order('starts_at');
    expect(lessons.error).toBeNull();
    expect(lessons.data).toHaveLength(4);
    const starts = lessons.data!.map((l) => new Date(l.starts_at).valueOf());
    for (let i = 1; i < 4; i++)
      expect(starts[i] - starts[i - 1]).toBe(7 * 86400000);
    const lessonId = lessons.data![0].id;
    const roster = await t.client
      .from('lesson_roster')
      .select('student_id')
      .in(
        'lesson_id',
        lessons.data!.map((l) => l.id),
      );
    expect(roster.data, 'both students on all four lessons').toHaveLength(8);

    await test.step('teacher shares the worksheet with the first lesson', async () => {
      await t.page.goto(`${origin}/dashboard/calendar/${lessonId}`);
      await t.page
        .getByLabel('Share a worksheet from the library')
        .selectOption(lockedId);
      await t.page.getByRole('button', { name: 'Share worksheet' }).click();
      await expect(t.page.getByText('Changes saved.')).toBeVisible();
      await expect(
        t.page.getByText(worksheetTitle, { exact: true }),
      ).toBeVisible();
      // Teacher-only worksheets are not offered and cannot be shared directly.
      await expect(
        t.page
          .getByLabel('Share a worksheet from the library')
          .locator(`option[value="${restrictedId}"]`),
      ).toHaveCount(0);
      expect(
        (
          await t.client
            .from('lesson_worksheets')
            .insert({ lesson_id: lessonId, worksheet_id: restrictedId })
        ).error,
      ).toBeTruthy();
    });

    await test.step('only the lesson’s students and their parents can open it', async () => {
      expect(await canOpen(s.client), 'student on the lesson').toBe(1);
      expect(await canOpen(p.client), 'that student’s parent').toBe(1);
      expect(await canOpen(o.client), 'student not on the lesson').toBe(0);
      await s.page.goto(`${origin}/dashboard/calendar/${lessonId}`);
      await expect(
        s.page.getByText(worksheetTitle, { exact: true }),
      ).toBeVisible();
    });

    const secret = `Private reminder ${suffix}`;
    await test.step('teacher keeps a private note', async () => {
      await t.page.goto(`${origin}/dashboard/calendar/${lessonId}`);
      await t.page.getByLabel('Your notes for this lesson').fill(secret);
      await t.page.getByRole('button', { name: 'Save note' }).click();
      await expect(t.page.getByText('Changes saved.')).toBeVisible();
      const own = await t.client
        .from('lesson_teacher_notes')
        .select('body')
        .eq('lesson_id', lessonId);
      expect(own.data).toEqual([{ body: secret }]);
    });

    await test.step('students and parents cannot see the private note', async () => {
      for (const client of [s.client, p.client])
        expect(
          (
            await client
              .from('lesson_teacher_notes')
              .select('body')
              .eq('lesson_id', lessonId)
          ).data,
        ).toEqual([]);
      await s.page.reload();
      await expect(
        s.page.getByText(worksheetTitle, { exact: true }),
      ).toBeVisible();
      await expect(s.page.getByText(secret)).toHaveCount(0);
      await expect(s.page.getByText('Private notes')).toHaveCount(0);
    });
  } finally {
    test.setTimeout(300000);
    const errors: string[] = [];
    if (classId) {
      const result = await admin
        .from('classrooms')
        .delete()
        .eq('id', classId)
        .eq('name', className);
      if (result.error) errors.push(result.error.message);
    }
    if (storagePaths.length) {
      const removed = await admin.storage
        .from('worksheet-library')
        .remove(storagePaths);
      if (removed.error) errors.push(removed.error.message);
    }
    if (worksheetIds.length) {
      const result = await admin
        .from('worksheets')
        .delete()
        .in('id', worksheetIds);
      if (result.error) errors.push(result.error.message);
    }
    errors.push(...(await qa.cleanup()));
    expect(errors, 'QA cleanup').toEqual([]);
  }
});
