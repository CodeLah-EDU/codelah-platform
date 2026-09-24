import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonTimes, resourceLink } from '../lib/lessons.ts';
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
