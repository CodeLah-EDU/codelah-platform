import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lessonTimes,
  resourceLink,
  scheduledLessonTimes,
  weeklyLessonTimes,
} from '../lib/lessons.ts';
test('Singapore lesson times preserve day boundaries and the agreed duration', () => {
  assert.deepEqual(lessonTimes('2026-10-01T00:30', '2026-10-01T02:00'), {
    starts_at: '2026-09-30T16:30:00.000Z',
    ends_at: '2026-09-30T18:00:00.000Z',
  });
  for (const [start, end] of [
    ['2026-02-30T10:00', '2026-02-30T11:30'],
    ['2026-10-01T10:00', '2026-10-01T11:29'],
    ['2026-10-01T10:00', '2026-10-01T12:01'],
    ['2026-10-01T10:00', '2026-10-01T09:00'],
  ])
    assert.throws(() => lessonTimes(start, end));
});
test('worksheet links reject executable URLs and embedded credentials', () => {
  assert.equal(resourceLink(''), null);
  assert.equal(
    resourceLink('https://example.org/worksheet'),
    'https://example.org/worksheet',
  );
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'https://user:secret@example.org',
    'file:///tmp/test',
  ])
    assert.throws(() => resourceLink(value));
});
test('scheduled lessons require a future start time', () => {
  const now = Date.parse('2026-10-01T10:00:00+08:00');
  assert.throws(
    () => scheduledLessonTimes('2026-10-01T09:00', '2026-10-01T10:30', now),
    /future lesson start time/,
  );
  assert.deepEqual(
    scheduledLessonTimes('2026-10-01T10:30', '2026-10-01T12:00', now),
    {
      starts_at: '2026-10-01T02:30:00.000Z',
      ends_at: '2026-10-01T04:00:00.000Z',
    },
  );
});

test('weekly repeats keep the same Singapore time each week', () => {
  const first = lessonTimes('2026-10-05T16:00', '2026-10-05T17:30');
  const weeks = weeklyLessonTimes(first, 3);
  assert.equal(weeks.length, 3);
  assert.deepEqual(weeks[0], first);
  assert.deepEqual(weeks[2], {
    starts_at: '2026-10-19T08:00:00.000Z',
    ends_at: '2026-10-19T09:30:00.000Z',
  });
  assert.equal(weeklyLessonTimes(first, 1).length, 1);
});
