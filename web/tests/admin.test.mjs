import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  amountCents,
  validDate,
  financeSummary,
  attendanceSummary,
  csvDocument,
  previousMonths,
  adminRouteValid,
} from '../lib/admin-workspace.ts';

test('finance summary uses received/paid dates, excludes waived fees, and retains overdue balances across months', () => {
  const data = {
    payments: [
      {
        amount_cents: 10000,
        due_on: '2026-08-01',
        paid_on: '2026-09-04',
        status: 'paid',
      },
      {
        amount_cents: 20000,
        due_on: '2026-09-01',
        paid_on: '2026-08-31',
        status: 'paid',
      },
      {
        amount_cents: 5000,
        due_on: '2026-08-01',
        paid_on: null,
        status: 'pending',
      },
      {
        amount_cents: 8000,
        due_on: '2026-09-29',
        paid_on: null,
        status: 'pending',
      },
      {
        amount_cents: 9000,
        due_on: '2026-09-01',
        paid_on: null,
        status: 'waived',
      },
    ],
    expenses: [
      { amount_cents: 12000, paid_on: '2026-09-15' },
      { amount_cents: 1500, paid_on: '2026-08-01' },
    ],
  };
  assert.deepEqual(financeSummary(data, '2026-09', '2026-09-29'), {
    received: 10000,
    spent: 12000,
    profit: -2000,
    outstanding: 13000,
    overdue: 5000,
    billed: 28000,
  });
  assert.deepEqual(previousMonths('2026-02', 3), [
    '2025-12',
    '2026-01',
    '2026-02',
  ]);
});
test('money, date and CSV helpers reject invalid input and spreadsheet formulas', () => {
  assert.equal(amountCents('0.29'), 29);
  assert.equal(amountCents('1000000.00'), 100000000);
  for (const amount of ['-1', 'Infinity', '1.001', '1e3', '1000000.01'])
    assert.throws(() => amountCents(amount));
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2026-13-01'), false);
  const csv = csvDocument(
    ['Name', 'Amount'],
    [
      ['=HYPERLINK("bad")', -3],
      [' +SUM(1,2)', '2.00'],
      ['Line\nquote"', null],
    ],
  );
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"\' +SUM(1,2)"'));
  assert.ok(csv.includes('"-3"'));
  assert.ok(csv.includes('"Line\nquote"""'));
  assert.equal(adminRouteValid(['finances', 'expenses']), true);
  assert.equal(adminRouteValid(['finances', 'unknown']), false);
});
test('attendance rate excludes unmarked, excused, future and cancelled entries', () => {
  const lessons = [
    {
      id: 'past',
      starts_at: '2026-09-01T00:00:00Z',
      ends_at: '2026-09-01T02:00:00Z',
      status: 'completed',
    },
    {
      id: 'future',
      starts_at: '2026-10-01T00:00:00Z',
      ends_at: '2026-10-01T02:00:00Z',
      status: 'scheduled',
    },
    {
      id: 'cancelled',
      starts_at: '2026-09-01T00:00:00Z',
      ends_at: '2026-09-01T02:00:00Z',
      status: 'cancelled',
    },
  ];
  const roster = ['past', 'future', 'cancelled'].flatMap((lesson_id) =>
    [1, 2, 3, 4, 5].map((student_id) => ({
      lesson_id,
      student_id: String(student_id),
    })),
  );
  const attendance = ['present', 'late', 'absent', 'excused', 'unmarked'].map(
    (status, i) => ({ lesson_id: 'past', student_id: String(i + 1), status }),
  );
  const summary = attendanceSummary(
    { lessons, roster, attendance },
    Date.parse('2026-09-29T00:00:00Z'),
  );
  assert.deepEqual(summary, {
    present: 1,
    late: 1,
    absent: 1,
    excused: 1,
    unmarked: 1,
    total: 5,
    rate: 67,
  });
});

const db = new PGlite();
const id = (n) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
before(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
    create schema storage;create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text);
    alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(await readFile(new URL(file, dir), 'utf8'));
  for (const [n, role, status] of [
    [1, 'admin', 'active'],
    [2, 'teacher', 'active'],
    [3, 'student', 'active'],
    [4, 'parent', 'active'],
    [5, 'admin', 'suspended'],
    [6, 'student', 'active'],
  ]) {
    await db.query('insert into auth.users(id) values($1)', [id(n)]);
    await db.query(
      'update accounts set role=$1,status=$2,display_name=$1 where id=$3',
      [role, status, id(n)],
    );
  }
  await db.exec(`select set_config('request.jwt.claim.sub','${id(1)}',false);
    insert into classrooms(id,name) values('${id(10)}','Test class');
    insert into teacher_assignments(classroom_id,teacher_id) values('${id(10)}','${id(2)}');
    insert into enrolments(classroom_id,student_id) values('${id(10)}','${id(3)}'),('${id(10)}','${id(6)}');
    insert into parent_student_links(parent_id,student_id) values('${id(4)}','${id(3)}');
    insert into lessons(id,classroom_id,title,starts_at,ends_at,created_by,status) values
    ('${id(20)}','${id(10)}','Past class','2098-01-01 10:00+08','2098-01-01 11:30+08','${id(1)}','scheduled'),
    ('${id(21)}','${id(10)}','Future class','2099-01-01 10:00+08','2099-01-01 11:30+08','${id(1)}','scheduled'),
    ('${id(22)}','${id(10)}','Cancelled class','2098-01-02 10:00+08','2098-01-02 11:30+08','${id(1)}','scheduled');
    update lessons set starts_at='2020-01-01 10:00+08',ends_at='2020-01-01 11:30+08',status='completed' where id='${id(20)}';
    update lessons set starts_at='2020-01-02 10:00+08',ends_at='2020-01-02 11:30+08',status='cancelled' where id='${id(22)}';
    insert into admin_expenses(id,description,category,amount_cents,paid_on) values('${id(30)}','Tools','Software',3900,'2026-09-01');
    insert into student_payments(id,student_id,description,amount_cents,due_on,status) values('${id(31)}','${id(3)}','Tuition',24000,'2026-09-01','pending');`);
});
after(() => db.close());
async function as(n, fn) {
  await db.exec('begin;set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id(n)]);
  try {
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}
const rows = async (sql) => (await db.query(sql)).rows;
test('business expenses and finance history are administrator-only, including suspended admins', async () => {
  for (const n of [2, 3, 4, 5])
    await as(n, async () => {
      assert.equal((await rows('select * from admin_expenses')).length, 0);
      assert.equal((await rows('select * from admin_audit')).length, 0);
    });
  await assert.rejects(
    as(2, () =>
      db.exec(
        "insert into admin_expenses(description,category,amount_cents,paid_on) values('Bad','Other',1,'2026-09-01')",
      ),
    ),
    /row-level security/,
  );
  await as(1, async () => {
    assert.equal((await rows('select * from admin_expenses')).length, 1);
    assert.equal((await rows('select * from admin_audit')).length, 2);
  });
});
test('expense and fee mutations keep append-only before/after history with the actual actor', async () => {
  await as(1, async () => {
    await db.exec(
      `update admin_expenses set amount_cents=4100 where id='${id(30)}';delete from student_payments where id='${id(31)}';`,
    );
    const audit = await rows("select * from admin_audit where action='UPDATE'");
    assert.equal(audit[0].before_record.amount_cents, 3900);
    assert.equal(audit[0].after_record.amount_cents, 4100);
    assert.equal(audit[0].changed_by, id(1));
    const deleted = await rows(
      "select * from admin_audit where action='DELETE'",
    );
    assert.equal(deleted[0].before_record.description, 'Tuition');
    assert.equal(deleted[0].after_record, null);
  });
  await assert.rejects(
    as(1, () => db.exec('delete from admin_audit')),
    /permission denied/,
  );
});
test('attendance register saves valid roster entries atomically and attributes the administrator', async () => {
  await as(1, async () => {
    const entries = [
      { student_id: id(3), status: 'present', note: 'On time' },
      { student_id: id(6), status: 'late', note: 'Five minutes' },
    ];
    const result = await db.query(
      'select admin_save_attendance($1,$2::jsonb) as count',
      [id(20), JSON.stringify(entries)],
    );
    assert.equal(result.rows[0].count, 2);
    const attendance = await rows(
      `select * from lesson_attendance where lesson_id='${id(20)}'`,
    );
    assert.equal(attendance.length, 2);
    assert.ok(attendance.every((a) => a.updated_by === id(1)));
  });
  for (const lesson of [21, 22])
    await assert.rejects(
      as(1, () =>
        db.query('select admin_save_attendance($1,$2::jsonb)', [
          id(lesson),
          JSON.stringify([{ student_id: id(3), status: 'present' }]),
        ]),
      ),
      /once a non-cancelled lesson starts/,
    );
  await assert.rejects(
    as(2, () =>
      db.query('select admin_save_attendance($1,$2::jsonb)', [
        id(20),
        JSON.stringify([{ student_id: id(3), status: 'present' }]),
      ]),
    ),
    /Administrator access required/,
  );
  await assert.rejects(
    as(1, () =>
      db.query('select admin_save_attendance($1,$2::jsonb)', [
        id(20),
        JSON.stringify([
          { student_id: id(3), status: 'present' },
          { student_id: id(4), status: 'absent' },
        ]),
      ]),
    ),
    /not on this lesson roster/,
  );
  assert.equal((await rows('select * from lesson_attendance')).length, 0);
  await assert.rejects(
    as(1, () =>
      db.query('select admin_save_attendance($1,$2::jsonb)', [
        id(20),
        JSON.stringify([
          { student_id: id(3), status: 'present' },
          { student_id: id(3), status: 'late' },
        ]),
      ]),
    ),
    /only once/,
  );
});
