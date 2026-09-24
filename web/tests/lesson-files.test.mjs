import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanFileName,
  fileSize,
  MAX_LESSON_FILE_BYTES,
  validateLessonFile,
} from '../lib/lesson-files.ts';

test('accepts teaching files and gives active content a safe download type', () => {
  assert.equal(
    validateLessonFile({ name: 'loops.py', size: 50 }).mimeType,
    'text/plain',
  );
  assert.equal(
    validateLessonFile({ name: 'game.sb3', size: 500 }).mimeType,
    'application/octet-stream',
  );
  assert.equal(
    validateLessonFile({ name: 'worksheet.PDF', size: 500 }).extension,
    'pdf',
  );
  assert.equal(
    validateLessonFile({ name: 'page.html', size: 500 }).mimeType,
    'text/plain',
  );
});

test('rejects empty, oversized, and unsupported files', () => {
  for (const file of [
    { name: 'empty.pdf', size: 0 },
    { name: 'large.pdf', size: MAX_LESSON_FILE_BYTES + 1 },
    { name: 'vector.svg', size: 100 },
    { name: 'program.exe', size: 100 },
    { name: 'README', size: 100 },
  ])
    assert.throws(() => validateLessonFile(file));
});

test('normalises names and presents readable sizes', () => {
  assert.equal(cleanFileName('../week 1/loops.pdf'), '.._week 1_loops.pdf');
  assert.equal(fileSize(950), '950 B');
  assert.equal(fileSize(1500), '2 KB');
  assert.equal(fileSize(2 * 1024 * 1024), '2.0 MB');
});
