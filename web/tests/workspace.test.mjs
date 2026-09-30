import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  calendarStatus,
  monthDays,
  singaporeDay,
  cleanTags,
} from '../lib/workspace.ts';

const db = new PGlite();
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create schema storage; create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text);
    alter table storage.objects enable row level security; grant usage on schema storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;`);
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir))
    .filter(
      (f) => f.endsWith('.sql') && f < '202609290001_learning_workspace.sql',
    )
    .sort())
    await db.exec(await readFile(new URL(file, dir), 'utf8'));
  for (const [n, role] of [
    [1, 'admin'],
    [2, 'teacher'],
    [3, 'teacher'],
    [4, 'parent'],
    [5, 'parent'],
    [6, 'parent'],
    [10, 'student'],
    [11, 'student'],
    [12, 'student'],
    [13, 'student'],
    [14, 'student'],
    [15, 'student'],
  ]) {
    await db.query('insert into auth.users(id) values ($1)', [id(n)]);
    await db.query(
      "update accounts set role=$1,status='active',display_name=$1 where id=$2",
      [role, id(n)],
    );
  }
  await db.exec(`insert into classrooms(id,name) values('${id(20)}','Python'),('${id(21)}','Web'),('${id(22)}','Second Python group');
    insert into teacher_assignments(classroom_id,teacher_id) values('${id(20)}','${id(2)}'),('${id(22)}','${id(2)}'),('${id(21)}','${id(3)}');
    insert into enrolments(classroom_id,student_id) values('${id(20)}','${id(10)}'),('${id(20)}','${id(11)}'),('${id(20)}','${id(12)}'),('${id(22)}','${id(13)}'),('${id(22)}','${id(14)}'),('${id(21)}','${id(15)}');
    insert into parent_student_links(parent_id,student_id) values('${id(4)}','${id(10)}'),('${id(4)}','${id(11)}'),('${id(5)}','${id(10)}'),('${id(6)}','${id(15)}');
    select set_config('request.jwt.claim.sub','${id(2)}',false);
    insert into lessons(id,classroom_id,title,starts_at,ends_at,created_by) values('${id(30)}','${id(20)}','Loops','2099-10-01 10:00+08','2099-10-01 11:30+08','${id(2)}'),('${id(31)}','${id(22)}','Functions','2099-10-02 10:00+08','2099-10-02 11:30+08','${id(2)}');
    insert into lessons(id,classroom_id,title,starts_at,ends_at,created_by,status) values('${id(29)}','${id(20)}','Historical class','2020-10-01 10:00+08','2020-10-01 11:30+08','${id(2)}','completed');`);
  await db.exec(
    await readFile(new URL('202609290001_learning_workspace.sql', dir), 'utf8'),
  );
  await db.exec(`insert into courses(id,name) values('${id(40)}','Python');
    insert into course_levels(id,course_id,name,position) values('${id(41)}','${id(40)}','Foundations',1);
    insert into course_objectives(id,level_id,title) values('${id(42)}','${id(41)}','Use variables');
    insert into student_courses(student_id,course_id) values('${id(10)}','${id(40)}');
    insert into student_profiles(student_id,school) values('${id(10)}','Example school');
    insert into student_payments(student_id,description,amount_cents,due_on,status) values('${id(10)}','Tuition record',5000,'2099-10-01','pending');
    insert into worksheets(id,title,visibility) values('${id(50)}','Open','unlocked'),('${id(51)}','Locked','locked'),('${id(52)}','Restricted','restricted');
    insert into worksheet_assets(worksheet_id,storage_path,file_name,size_bytes,mime_type) select id,id::text||'/worksheet.pdf','worksheet.pdf',100,'application/pdf' from worksheets;
    insert into storage.objects(bucket_id,name) select 'worksheet-library',storage_path from worksheet_assets;`);
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
const rows = async (sql) => (await db.query(sql)).rows;
test('migration preserves past rosters and new lessons snapshot their teaching group', async () => {
  assert.equal(
    (await rows(`select * from lesson_roster where lesson_id='${id(29)}'`))
      .length,
    3,
  );
  await as(2, async () => {
    await db.exec(
      `insert into lessons(id,classroom_id,title,starts_at,ends_at,created_by) values('${id(32)}','${id(20)}','New class','2099-10-04 10:00+08','2099-10-04 11:30+08','${id(2)}')`,
    );
    assert.equal(
      (await rows(`select * from lesson_roster where lesson_id='${id(32)}'`))
        .length,
      3,
    );
    assert.equal(
      (
        await rows(
          `delete from lesson_roster where lesson_id='${id(29)}' returning *`,
        )
      ).length,
      0,
    );
  });
});
test('direct clients cannot create progress in an unassigned course or corrupt worksheet metadata', async () => {
  await assert.rejects(
    as(2, () =>
      db.exec(
        `insert into objective_progress(student_id,objective_id) values('${id(11)}','${id(42)}')`,
      ),
    ),
    /Assign the objective course/,
  );
  await assert.rejects(
    as(2, () =>
      db.exec(
        `update worksheets set course_id='${id(40)}',tags=array[''] where id='${id(50)}'`,
      ),
    ),
    /Tags must/,
  );
  await as(2, async () => {
    await db.exec(
      `update worksheets set course_id='${id(40)}',level_id='${id(41)}' where id='${id(50)}'; delete from courses where id='${id(40)}'`,
    );
    assert.equal(
      (
        await rows(
          `select course_id,level_id from worksheets where id='${id(50)}'`,
        )
      )[0].level_id,
      null,
    );
  });
});
test('revocation removes the new profile, payments and file access immediately', async () => {
  await db.exec(
    `update parent_student_links set active=false where parent_id='${id(4)}'`,
  );
  await as(4, async () => {
    assert.equal((await rows('select * from student_profiles')).length, 0);
    assert.equal((await rows('select * from student_payments')).length, 0);
    assert.equal((await rows('select * from lessons')).length, 0);
  });
  await db.exec(
    `update parent_student_links set active=true where parent_id='${id(4)}'`,
  );
});
test('calendar respects Singapore dates, explicit attendance and month boundaries', () => {
  assert.equal(singaporeDay('2026-09-30T17:00:00Z'), '2026-10-01');
  assert.equal(monthDays('2026-02').length, 42);
  assert.equal(monthDays('2026-02')[0], '2026-01-26');
  const lesson = { status: 'completed', ends_at: '2020-01-01' };
  assert.equal(calendarStatus(lesson, undefined, Date.now()), 'unmarked');
  assert.equal(calendarStatus(lesson, 'present', Date.now()), 'attended');
  assert.equal(calendarStatus(lesson, 'absent', Date.now()), 'missed');
  assert.equal(
    calendarStatus({ ...lesson, status: 'cancelled' }, 'present', Date.now()),
    'cancelled',
  );
  assert.deepEqual(cleanTags(' Loops,loops, Python '), ['loops', 'python']);
});
test('locked worksheets expose metadata but neither asset paths nor storage; restricted metadata is hidden', async () => {
  await as(10, async () => {
    assert.equal((await rows('select * from worksheets')).length, 2);
    assert.deepEqual(
      (await rows('select * from worksheet_assets')).map((r) => r.worksheet_id),
      [id(50)],
    );
    assert.equal((await rows('select * from storage.objects')).length, 1);
  });
  await as(2, async () =>
    assert.equal((await rows('select * from worksheets')).length, 3),
  );
});
test('unlock and revoke control both family metadata and direct storage reads', async () => {
  await db.exec(
    `insert into worksheet_assignments values('${id(51)}','${id(10)}')`,
  );
  for (const n of [10, 4, 5])
    await as(n, async () => {
      assert.equal(
        (
          await rows(
            `select * from worksheet_assets where worksheet_id='${id(51)}'`,
          )
        ).length,
        1,
      );
      assert.equal((await rows('select * from storage.objects')).length, 2);
    });
  await as(11, async () =>
    assert.equal((await rows('select * from storage.objects')).length, 1),
  );
  await db.exec(
    `delete from worksheet_assignments where worksheet_id='${id(51)}'`,
  );
  await as(10, async () =>
    assert.equal((await rows('select * from storage.objects')).length, 1),
  );
  await db.exec(
    `insert into worksheet_assignments values('${id(52)}','${id(10)}')`,
  );
  await as(10, async () =>
    assert.equal(
      (
        await rows(
          `select * from worksheet_assets where worksheet_id='${id(52)}'`,
        )
      ).length,
      0,
    ),
  );
});
test('family links support multiple parents and children without exposing unrelated students', async () => {
  await as(4, async () =>
    assert.deepEqual(
      (
        await rows("select id from accounts where role='student' order by id")
      ).map((r) => r.id),
      [id(10), id(11)],
    ),
  );
  await as(5, async () =>
    assert.deepEqual(
      (
        await rows("select id from accounts where role='student' order by id")
      ).map((r) => r.id),
      [id(10)],
    ),
  );
  await as(2, async () =>
    assert.equal(
      (await rows("select * from accounts where role='parent'")).length,
      2,
    ),
  );
  await as(3, async () =>
    assert.equal(
      (
        await rows(
          `select * from student_profiles where student_id='${id(10)}'`,
        )
      ).length,
      0,
    ),
  );
});
test('parents cannot edit profiles, payments, curriculum, assignments, attendance, or reflections', async () => {
  await as(4, async () => {
    assert.equal(
      (await rows("update student_profiles set school='forged' returning *"))
        .length,
      0,
    );
    assert.equal(
      (await rows("update student_payments set status='waived' returning *"))
        .length,
      0,
    );
    assert.equal(
      (await rows("update course_objectives set title='forged' returning *"))
        .length,
      0,
    );
  });
  for (const sql of [
    `insert into worksheet_assignments values('${id(51)}','${id(10)}')`,
    `insert into objective_progress(student_id,objective_id) values('${id(10)}','${id(42)}')`,
    `insert into lesson_comments(lesson_id,student_id,body) values('${id(30)}','${id(10)}','forged')`,
    `insert into lesson_attendance(lesson_id,student_id,status,updated_by) values('${id(30)}','${id(10)}','present','${id(4)}')`,
  ])
    await assert.rejects(
      as(4, () => db.exec(sql)),
      /row-level security/,
    );
});
test('teacher can manage assigned student records but not another teacher’s students', async () => {
  await as(2, async () => {
    await db.exec(
      `insert into objective_progress(student_id,objective_id) values('${id(10)}','${id(42)}')`,
    );
    assert.equal((await rows('select * from objective_progress')).length, 1);
    await db.exec(`select update_student_name('${id(10)}','New learner name')`);
    assert.equal(
      (await rows(`select display_name from accounts where id='${id(10)}'`))[0]
        .display_name,
      'New learner name',
    );
    assert.equal(
      (
        await rows(
          `update accounts set role='admin' where id='${id(10)}' returning *`,
        )
      ).length,
      0,
    );
  });
  await assert.rejects(
    as(3, () =>
      db.exec(
        `insert into objective_progress(student_id,objective_id) values('${id(10)}','${id(42)}')`,
      ),
    ),
    /row-level security/,
  );
});
test('lesson creation snapshots class members and per-lesson assignment never changes enrolments', async () => {
  assert.equal(
    (await rows(`select * from lesson_roster where lesson_id='${id(30)}'`))
      .length,
    3,
  );
  await as(2, async () => {
    await db.exec(
      `insert into lesson_roster values('${id(30)}','${id(13)}','student')`,
    );
    assert.equal(
      (await rows(`select * from lesson_roster where lesson_id='${id(30)}'`))
        .length,
      4,
    );
    assert.equal(
      (await rows(`select * from enrolments where classroom_id='${id(20)}'`))
        .length,
      3,
    );
  });
});
test('fifth student and duplicate bookings are rejected by the database', async () => {
  await assert.rejects(
    as(2, () =>
      db.exec(
        `insert into lesson_roster values('${id(30)}','${id(13)}','student'); insert into lesson_roster values('${id(30)}','${id(14)}','student')`,
      ),
    ),
    /at most four/,
  );
  await assert.rejects(
    as(2, () =>
      db.exec(
        `update lessons set starts_at='2099-10-01 10:30+08',ends_at='2099-10-01 12:00+08' where id='${id(31)}'; insert into lesson_roster values('${id(31)}','${id(10)}','student')`,
      ),
    ),
    /already has a class/,
  );
});
test('newly assigned students can read just that lesson; removal revokes lesson access', async () => {
  await db.exec(
    `insert into lesson_roster values('${id(30)}','${id(13)}','student')`,
  );
  await as(13, async () =>
    assert.equal(
      (await rows(`select * from lessons where id='${id(30)}'`)).length,
      1,
    ),
  );
  await db.exec(
    `delete from lesson_roster where lesson_id='${id(30)}' and student_id='${id(13)}'`,
  );
  await as(13, async () =>
    assert.equal(
      (await rows(`select * from lessons where id='${id(30)}'`)).length,
      0,
    ),
  );
});
test('student comments are editable by their author and visible only to that family and teachers', async () => {
  await db.exec(
    `insert into lesson_comments(id,lesson_id,student_id,body) values('${id(60)}','${id(30)}','${id(10)}','My reflection')`,
  );
  await as(10, async () =>
    assert.equal(
      (await rows("update lesson_comments set body='Revised' returning *"))
        .length,
      1,
    ),
  );
  await as(11, async () =>
    assert.equal((await rows('select * from lesson_comments')).length, 0),
  );
  await as(4, async () =>
    assert.equal((await rows('select * from lesson_comments')).length, 1),
  );
  await as(2, async () =>
    assert.equal(
      (
        await rows(
          "update lesson_comments set body='teacher rewrite' returning *",
        )
      ).length,
      0,
    ),
  );
});
test('withdrawing feedback removes its family snapshot', async () => {
  await as(2, async () => {
    await db.exec(
      `insert into lesson_feedback(lesson_id,student_id,note,status,updated_by) values('${id(30)}','${id(10)}','Published update','published','${id(2)}')`,
    );
    assert.equal((await rows('select * from lesson_reports')).length, 1);
    await db.exec('delete from lesson_feedback');
    assert.equal((await rows('select * from lesson_reports')).length, 0);
  });
});
