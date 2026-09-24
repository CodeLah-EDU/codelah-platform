import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key, raw_user_meta_data jsonb, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;`);
  await db.exec(
    await readFile(
      new URL(
        '../../supabase/migrations/202609160001_accounts_and_access.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        '../../supabase/migrations/202609160002_student_accounts.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        '../../supabase/migrations/202609160003_account_contact.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        '../../supabase/migrations/202609200001_teaching_workflow.sql',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  for (const [n, role] of [
    [1, 'admin'],
    [2, 'parent'],
    [3, 'parent'],
    [4, 'teacher'],
    [5, 'teacher'],
    [6, 'student'],
    [7, 'student'],
    [8, 'student'],
    [9, 'student'],
    [10, 'student'],
    [11, 'pending'],
  ]) {
    await db.query(
      'insert into auth.users(id,raw_user_meta_data) values ($1,$2)',
      [id(n), { role: 'admin' }],
    );
    if (role !== 'pending')
      await db.query(
        "update accounts set role=$1,status='active',display_name=$1 where id=$2",
        [role, id(n)],
      );
  }
  await db.exec(`insert into classrooms (id,name) values ('${id(20)}','Scratch'),('${id(21)}','Python');
    insert into parent_student_links(parent_id,student_id) values ('${id(2)}','${id(6)}'),('${id(3)}','${id(7)}');
    insert into teacher_assignments(classroom_id,teacher_id) values ('${id(20)}','${id(4)}'),('${id(21)}','${id(5)}');
    insert into enrolments(classroom_id,student_id) values ('${id(20)}','${id(6)}'),('${id(21)}','${id(7)}');
    select set_config('request.jwt.claim.sub','${id(4)}',false);
    insert into lessons(id,classroom_id,title,starts_at,ends_at,created_by)
      values ('${id(30)}','${id(20)}','Loops lab','2026-10-01 10:00:00+08','2026-10-01 11:30:00+08','${id(4)}');`);
});
after(() => db.close());
async function as(n, fn) {
  await db.exec('begin; set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id(n)]);
  try {
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}
async function visible(table) {
  return (await db.query(`select * from ${table}`)).rows;
}
test('parents see only their linked child, even by direct ID', async () => {
  await as(2, async () => {
    assert.deepEqual(
      (await visible('accounts'))
        .map((r) => r.id)
        .sort((a, b) => a.localeCompare(b)),
      [id(2), id(6)],
    );
    assert.equal(
      (await db.query('select * from accounts where id=$1', [id(7)])).rows
        .length,
      0,
    );
    assert.deepEqual(
      (await visible('classrooms')).map((r) => r.id),
      [id(20)],
    );
    assert.deepEqual(
      (await visible('enrolments')).map((r) => r.student_id),
      [id(6)],
    );
  });
});
test('teachers see assigned students/classes and cannot see parents or another class', async () => {
  await as(4, async () => {
    assert.deepEqual(
      (await visible('accounts'))
        .map((r) => r.id)
        .sort((a, b) => a.localeCompare(b)),
      [id(4), id(6)],
    );
    assert.deepEqual(
      (await visible('classrooms')).map((r) => r.id),
      [id(20)],
    );
    assert.equal((await visible('parent_student_links')).length, 0);
    assert.equal(
      (
        await db.query('select * from enrolments where classroom_id=$1', [
          id(21),
        ])
      ).rows.length,
      0,
    );
  });
});
test('lesson visibility follows class access for teachers, students, and parents', async () => {
  await as(4, async () => assert.equal((await visible('lessons')).length, 1));
  await as(6, async () => assert.equal((await visible('lessons')).length, 1));
  await as(2, async () => assert.equal((await visible('lessons')).length, 1));
  await as(5, async () => assert.equal((await visible('lessons')).length, 0));
});
test('student cannot see classmates or change role or relationships', async () => {
  await as(6, async () => {
    assert.deepEqual(
      (await visible('accounts')).map((r) => r.id),
      [id(6)],
    );
    assert.equal(
      (
        await db.query(
          "update accounts set role='admin' where id=$1 returning id",
          [id(6)],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query('delete from enrolments returning student_id')).rows
        .length,
      0,
    );
  });
  await assert.rejects(
    as(6, () =>
      db.query(
        'insert into parent_student_links(parent_id,student_id) values ($1,$2)',
        [id(2), id(7)],
      ),
    ),
    /row-level security/,
  );
});
test('signup metadata cannot choose role; pending and suspended users see only themselves', async () => {
  await as(11, async () => {
    const rows = await visible('accounts');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].role, 'pending');
    assert.equal(rows[0].status, 'pending');
    assert.equal((await visible('classrooms')).length, 0);
  });
  await db.exec('begin');
  await db.query("update accounts set status='suspended' where id=$1", [id(2)]);
  await db.exec('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id(2)]);
  try {
    assert.equal((await visible('accounts')).length, 1);
    assert.equal((await visible('enrolments')).length, 0);
  } finally {
    await db.exec('rollback');
  }
});
test('anonymous requests cannot read protected tables', async () => {
  await db.exec('begin; set local role anon');
  try {
    await assert.rejects(visible('accounts'), /permission denied/);
  } finally {
    await db.exec('rollback');
  }
});
test('revoking parent links or teacher assignments removes access on the next query', async () => {
  for (const [n, table, column] of [
    [2, 'parent_student_links', 'parent_id'],
    [4, 'teacher_assignments', 'teacher_id'],
  ]) {
    await db.exec('begin');
    await db.query(`update ${table} set active=false where ${column}=$1`, [
      id(n),
    ]);
    await db.exec('set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
      id(n),
    ]);
    try {
      assert.equal((await visible('accounts')).length, 1);
      assert.equal((await visible('classrooms')).length, 0);
    } finally {
      await db.exec('rollback');
    }
  }
});
test('admin may provision valid relationships; malformed role links are rejected', async () => {
  await as(1, async () => {
    assert.equal((await visible('accounts')).length, 11);
    await db.query(
      'insert into parent_student_links(parent_id,student_id) values ($1,$2)',
      [id(2), id(7)],
    );
  });
  await assert.rejects(
    as(1, () =>
      db.query(
        'insert into parent_student_links(parent_id,student_id) values ($1,$2)',
        [id(4), id(7)],
      ),
    ),
    /foreign key/,
  );
});
test('class capacity permits four students and rejects a fifth', async () => {
  await as(1, async () => {
    for (const n of [7, 8, 9])
      await db.query(
        'insert into enrolments(classroom_id,student_id) values ($1,$2)',
        [id(20), id(n)],
      );
    assert.equal(
      (
        await db.query('select * from enrolments where classroom_id=$1', [
          id(20),
        ])
      ).rows.length,
      4,
    );
  });
  await assert.rejects(
    as(1, async () => {
      for (const n of [7, 8, 9, 10])
        await db.query(
          'insert into enrolments(classroom_id,student_id) values ($1,$2)',
          [id(20), id(n)],
        );
    }),
    /at most four/,
  );
});

test('only an active linked adult may manage a student password', async () => {
  for (const [actor, target, expected] of [
    [2, 6, true],
    [2, 7, false],
    [4, 6, true],
    [4, 7, false],
    [6, 6, false],
    [1, 6, true],
    [11, 6, false],
  ]) {
    await as(actor, async () =>
      assert.equal(
        (
          await db.query('select public.can_manage_student($1) as allowed', [
            id(target),
          ])
        ).rows[0].allowed,
        expected,
      ),
    );
  }
});
test('first administrator reservation requires verified email and is consumed once', async () => {
  await db.exec('begin');
  try {
    await db.query(
      "insert into codelah_private.admin_bootstrap(email) values ('founder@example.test')",
    );
    await db.query(
      "insert into auth.users(id,email) values ($1,'founder@example.test')",
      [id(30)],
    );
    assert.equal(
      (await db.query('select role from accounts where id=$1', [id(30)]))
        .rows[0].role,
      'pending',
    );
    await db.query(
      'update auth.users set email_confirmed_at=now() where id=$1',
      [id(30)],
    );
    assert.equal(
      (await db.query('select role from accounts where id=$1', [id(30)]))
        .rows[0].role,
      'admin',
    );
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values ($1,'founder@example.test',now())",
      [id(31)],
    );
    assert.equal(
      (await db.query('select role from accounts where id=$1', [id(31)]))
        .rows[0].role,
      'pending',
    );
  } finally {
    await db.exec('rollback');
  }
});
test('shared login limiter denies attempt eleven and hides its records', async () => {
  await db.exec('begin;set local role anon');
  try {
    for (let n = 1; n <= 11; n++)
      assert.equal(
        (await db.query("select consume_sign_in_attempt('learner') as allowed"))
          .rows[0].allowed,
        n <= 10,
      );
    await assert.rejects(
      db.query('select * from codelah_private.login_attempts'),
      /permission denied/,
    );
  } finally {
    await db.exec('rollback');
  }
});

// Actual PostgreSQL permissions, including callers bypassing the UI entirely.
async function learningRecords(actor, fn, setup = '') {
  await db.exec('begin');
  try {
    await db.exec(`select set_config('request.jwt.claim.sub','${id(4)}',true);
    insert into enrolments(classroom_id,student_id) values ('${id(20)}','${id(8)}');
    insert into lesson_attendance(lesson_id,student_id,status,updated_by) values
      ('${id(30)}','${id(6)}','present','${id(4)}'),('${id(30)}','${id(8)}','absent','${id(4)}');
    insert into lesson_feedback(lesson_id,student_id,note,status,updated_by) values
      ('${id(30)}','${id(6)}','Published child six','published','${id(4)}'),
      ('${id(30)}','${id(8)}','Other child report','published','${id(4)}');
    insert into lesson_submissions(lesson_id,student_id,response) values
      ('${id(30)}','${id(6)}','student six work'),('${id(30)}','${id(8)}','private classmate work');
    ${setup}`);
    await db.exec('set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
      id(actor),
    ]);
    await fn();
  } finally {
    await db.exec('rollback');
  }
}
test('student and parent cannot read classmates attendance, submissions or reports', async () => {
  for (const actor of [2, 6])
    await learningRecords(actor, async () => {
      for (const table of [
        'lesson_attendance',
        'lesson_submissions',
        'lesson_reports',
      ])
        assert.deepEqual(
          (await visible(table)).map((r) => r.student_id),
          [id(6)],
        );
      assert.equal((await visible('lesson_feedback')).length, 0);
    });
});
test('editing a feedback draft preserves the family snapshot and hides draft text', async () => {
  await learningRecords(
    2,
    async () => {
      assert.equal(
        (await visible('lesson_reports'))[0].note,
        'Published child six',
      );
      assert.equal((await visible('lesson_feedback')).length, 0);
    },
    `update lesson_feedback set note='Private next draft',status='draft' where student_id='${id(6)}';`,
  );
});
test('publishing feedback updates exactly one child report and attributes the author', async () => {
  await learningRecords(4, async () => {
    await db.query(
      "update lesson_feedback set note='Updated report',status='published',updated_by=$1 where student_id=$2",
      [id(5), id(6)],
    );
    const reports = await visible('lesson_reports');
    assert.equal(
      reports.find((r) => r.student_id === id(6)).note,
      'Updated report',
    );
    assert.equal(
      reports.find((r) => r.student_id === id(8)).note,
      'Other child report',
    );
    assert.equal(
      (await visible('lesson_feedback')).find((r) => r.student_id === id(6))
        .updated_by,
      id(4),
    );
  });
});
test('students cannot forge a review; teachers cannot rewrite submitted work', async () => {
  await assert.rejects(
    learningRecords(6, () =>
      db.query(
        "update lesson_submissions set teacher_note='Forged praise' where student_id=$1",
        [id(6)],
      ),
    ),
    /Only a teacher/,
  );
  await assert.rejects(
    learningRecords(4, () =>
      db.query(
        "update lesson_submissions set response='Rewritten work' where student_id=$1",
        [id(6)],
      ),
    ),
    /cannot rewrite/,
  );
  await learningRecords(6, async () => {
    await db.query(
      "update lesson_submissions set response='My new work' where student_id=$1",
      [id(6)],
    );
    const submission = (await visible('lesson_submissions'))[0];
    assert.equal(submission.response, 'My new work');
    assert.equal(submission.teacher_note, null);
    assert.ok(submission.submitted_at);
  });
});
test('revoked and suspended family members lose all lesson access', async () => {
  for (const [actor, setup] of [
    [6, `update accounts set status='suspended' where id='${id(6)}';`],
    [
      2,
      `update parent_student_links set active=false where parent_id='${id(2)}';`,
    ],
    [6, `update enrolments set active=false where student_id='${id(6)}';`],
    [
      4,
      `update teacher_assignments set active=false where teacher_id='${id(4)}';`,
    ],
  ])
    await learningRecords(
      actor,
      async () => {
        for (const table of [
          'lessons',
          'lesson_materials',
          'lesson_attendance',
          'lesson_submissions',
          'lesson_feedback',
          'lesson_reports',
        ])
          assert.equal((await visible(table)).length, 0, table);
      },
      setup,
    );
});
test('unrelated teachers and students cannot create feedback or attendance for other children', async () => {
  for (const actor of [5, 6, 2])
    await assert.rejects(
      learningRecords(actor, () =>
        db.query(
          "insert into lesson_feedback(lesson_id,student_id,note,updated_by) values ($1,$2,'Spoofed',$3)",
          [id(30), id(7), id(actor)],
        ),
      ),
      /row-level security/,
    );
  await assert.rejects(
    learningRecords(4, () =>
      db.query(
        "insert into lesson_attendance(lesson_id,student_id,status,updated_by) values ($1,$2,'present',$3)",
        [id(30), id(7), id(4)],
      ),
    ),
    /row-level security/,
  );
});
test('database rejects unsafe links, invalid duration, empty publication and cancelled submissions', async () => {
  await assert.rejects(
    learningRecords(4, () =>
      db.query(
        "insert into lesson_materials(lesson_id,title,resource_url,created_by) values ($1,'unsafe','javascript:alert(1)',$2)",
        [id(30), id(4)],
      ),
    ),
    /material_safe_url/,
  );
  await assert.rejects(
    learningRecords(4, () =>
      db.query(
        "update lessons set ends_at=starts_at+interval '20 minutes' where id=$1",
        [id(30)],
      ),
    ),
    /lesson_duration/,
  );
  await assert.rejects(
    learningRecords(4, () =>
      db.query(
        "update lesson_feedback set note='',status='published' where student_id=$1",
        [id(6)],
      ),
    ),
    /Feedback is required/,
  );
  await assert.rejects(
    learningRecords(
      6,
      () =>
        db.query(
          "update lesson_submissions set response='Too late' where student_id=$1",
          [id(6)],
        ),
      `update lessons set status='cancelled' where id='${id(30)}';`,
    ),
    /Submissions are closed/,
  );
});
