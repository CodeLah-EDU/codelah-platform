import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASSROOM_MAX_PARTICIPANTS,
  classroomWindow,
  dailyRoomName,
  dailyRoomRequest,
  dailyTokenRequest,
} from '../lib/daily.ts';

const lessonId = '00000000-0000-0000-0000-000000000030';
const starts = '2026-10-01T10:00:00+08:00';
const ends = '2026-10-01T11:30:00+08:00';

test('classroom window opens 15 minutes early and closes 30 minutes late', () => {
  assert.equal(
    classroomWindow(starts, ends, Date.parse('2026-10-01T09:44:59+08:00')),
    'early',
  );
  assert.equal(
    classroomWindow(starts, ends, Date.parse('2026-10-01T09:45:00+08:00')),
    'open',
  );
  assert.equal(
    classroomWindow(starts, ends, Date.parse('2026-10-01T12:00:01+08:00')),
    'closed',
  );
});

test('private room request is limited to one teacher and four students', () => {
  const request = dailyRoomRequest(lessonId, starts, ends);
  assert.equal(request.name, dailyRoomName(lessonId));
  assert.equal(request.privacy, 'private');
  assert.equal(request.properties.max_participants, CLASSROOM_MAX_PARTICIPANTS);
  assert.equal(request.properties.eject_at_room_exp, true);
  assert.equal(request.properties.enable_chat, false);
  assert.equal(request.properties.enable_recording, false);
});

test('teacher token owns the room while student token cannot screen share', () => {
  const teacher = dailyTokenRequest({
    roomName: dailyRoomName(lessonId),
    userId: 'teacher',
    userName: 'Teacher',
    owner: true,
    expiresAt: 123,
  });
  const student = dailyTokenRequest({
    roomName: dailyRoomName(lessonId),
    userId: 'student',
    userName: 'Student',
    owner: false,
    expiresAt: 123,
  });
  assert.equal(teacher.properties.is_owner, true);
  assert.equal(teacher.properties.enable_screenshare, true);
  assert.equal(student.properties.is_owner, false);
  assert.equal(student.properties.enable_screenshare, false);
  assert.equal(student.properties.enable_recording, false);
  assert.equal(student.properties.enable_recording_ui, false);
});
