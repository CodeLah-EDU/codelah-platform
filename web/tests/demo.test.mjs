import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDemoState,
  demoReducer,
  reportError,
  students,
  lessonTime,
  upcoming,
  completed,
} from '../lib/demo.ts';

test('teacher drafts stay private until publish and later edits do not mutate the report', () => {
  const initial = createDemoState();
  const edited = demoReducer(initial, {
    type: 'edit',
    student: 'avery',
    patch: {
      feedback: 'Explained the score calculation independently.',
      attendance: 'Late',
    },
  });
  assert.deepEqual(edited.published.avery, initial.published.avery);
  const published = demoReducer(edited, { type: 'publish', student: 'avery' });
  assert.equal(
    published.published.avery.feedback,
    'Explained the score calculation independently.',
  );
  assert.equal(published.published.avery.attendance, 'Late');
  const nextDraft = demoReducer(published, {
    type: 'edit',
    student: 'avery',
    patch: { feedback: 'Another draft' },
  });
  assert.equal(
    nextDraft.published.avery.feedback,
    published.published.avery.feedback,
  );
  assert.notEqual(
    nextDraft.drafts.avery.feedback,
    nextDraft.published.avery.feedback,
  );
});
test('publishing another child does not replace the linked child report', () => {
  const state = createDemoState();
  assert.equal(state.published.kai, undefined);
  const published = demoReducer(state, { type: 'publish', student: 'kai' });
  assert.deepEqual(published.published.avery, state.published.avery);
  assert.match(published.published.kai.feedback, /^Kai /);
});
test('blank or overlong updates cannot publish and refresh recreates demo defaults', () => {
  const state = createDemoState();
  const blank = demoReducer(state, {
    type: 'edit',
    student: 'avery',
    patch: { topics: '   ' },
  });
  assert.ok(reportError(blank.drafts.avery));
  assert.equal(
    demoReducer(blank, { type: 'publish', student: 'avery' }),
    blank,
  );
  assert.ok(reportError({ ...state.drafts.avery, feedback: 'a'.repeat(1201) }));
  assert.deepEqual(createDemoState(), state);
});
test('demo cohort and session times match confirmed class format', () => {
  assert.equal(students.length, 4);
  assert.equal(lessonTime(upcoming.start, upcoming.end), '10:00–12:00 SGT');
  assert.equal(lessonTime(completed.start, completed.end), '10:00–11:30 SGT');
});
