import type { Account } from './accounts';

export type Lesson = {
  id: string;
  classroom_id: string;
  title: string;
  objective: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
};
export type Worksheet = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  course_id: string | null;
  level_id: string | null;
  visibility: 'unlocked' | 'locked' | 'restricted';
  created_at: string;
};
export type LearningFile = {
  id: string;
  lesson_id: string;
  student_id: string | null;
  kind: 'material' | 'submission';
  file_name: string;
  size_bytes: number;
  created_at: string;
};
export type WorkspaceData = {
  account: Account;
  people: Account[];
  classrooms: { id: string; name: string; active: boolean }[];
  enrolments: { classroom_id: string; student_id: string; active: boolean }[];
  parents: { parent_id: string; student_id: string; active: boolean }[];
  lessons: Lesson[];
  roster: { lesson_id: string; student_id: string }[];
  attendance: {
    lesson_id: string;
    student_id: string;
    status: string;
    note: string;
  }[];
  reports: {
    lesson_id: string;
    student_id: string;
    topics: string;
    note: string;
    practice: string;
    published_at: string;
  }[];
  feedback: {
    id: string;
    lesson_id: string;
    student_id: string;
    topics: string;
    note: string;
    practice: string;
    status: string;
  }[];
  comments: {
    id: string;
    lesson_id: string;
    student_id: string;
    body: string;
    created_at: string;
  }[];
  files: LearningFile[];
  worksheets: Worksheet[];
  assets: { worksheet_id: string; file_name: string; size_bytes: number }[];
  assignments: { worksheet_id: string; student_id: string }[];
  courses: { id: string; name: string; description: string }[];
  levels: { id: string; course_id: string; name: string; position: number }[];
  objectives: {
    id: string;
    level_id: string;
    title: string;
    position: number;
  }[];
  studentCourses: { student_id: string; course_id: string }[];
  progress: {
    student_id: string;
    objective_id: string;
    completed_at: string;
  }[];
  profiles: {
    student_id: string;
    school: string;
    school_year: string;
    phone: string;
    notes: string;
  }[];
  payments: {
    id: string;
    student_id: string;
    description: string;
    amount_cents: number;
    due_on: string;
    status: string;
    paid_on: string | null;
  }[];
};
export const sections = {
  student: ['home', 'worksheets', 'progress', 'calendar', 'files', 'practise'],
  teacher: ['home', 'calendar', 'students', 'worksheets'],
  parent: ['home', 'calendar', 'students'],
};
export function singaporeDay(value: string) {
  return new Date(new Date(value).valueOf() + 8 * 3600000)
    .toISOString()
    .slice(0, 10);
}
export function calendarStatus(
  lesson: Lesson,
  attendance: string | undefined,
  now: number,
) {
  if (lesson.status === 'cancelled') return 'cancelled';
  if (attendance === 'present' || attendance === 'late') return 'attended';
  if (attendance === 'absent') return 'missed';
  if (attendance === 'excused') return 'excused';
  if (
    new Date(lesson.ends_at).valueOf() >= now &&
    lesson.status === 'scheduled'
  )
    return 'upcoming';
  return 'unmarked';
}
export function worksheetAvailable(
  data: WorkspaceData,
  worksheet: Worksheet,
  studentId?: string,
) {
  if (data.account.role === 'teacher' || data.account.role === 'admin')
    return true;
  if (worksheet.visibility === 'restricted') return false;
  return (
    worksheet.visibility === 'unlocked' ||
    data.assignments.some(
      (a) =>
        a.worksheet_id === worksheet.id &&
        a.student_id === (studentId || data.account.id),
    )
  );
}
export function studentLessons(data: WorkspaceData, studentId?: string) {
  return studentId
    ? data.lessons.filter((l) =>
        data.roster.some(
          (r) => r.lesson_id === l.id && r.student_id === studentId,
        ),
      )
    : data.lessons;
}
export function monthDays(month: string) {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, number - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) =>
    new Date(Date.UTC(year, number - 1, 1 - offset + i))
      .toISOString()
      .slice(0, 10),
  );
}
export function cleanTags(value: string) {
  const tags = [
    ...new Set(
      value
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (tags.length > 12 || tags.some((t) => t.length > 40))
    throw new Error('Use up to 12 tags, each under 41 characters.');
  return tags;
}
