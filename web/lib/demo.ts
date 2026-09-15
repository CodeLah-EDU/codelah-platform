export const brand = {
  name: 'CodeLah',
  tagline: 'Learn code. Build real things.',
};
export const students = [
  { id: 'avery', name: 'Avery Tan', initials: 'AT' },
  { id: 'kai', name: 'Kai Lim', initials: 'KL' },
  { id: 'sara', name: 'Sara Lee', initials: 'SL' },
  { id: 'ethan', name: 'Ethan Ng', initials: 'EN' },
] as const;
export type StudentId = (typeof students)[number]['id'];
export type Role = 'student' | 'teacher' | 'parent';
export type Attendance = 'Present' | 'Late' | 'Absent';
export type Report = {
  attendance: Attendance;
  topics: string;
  feedback: string;
  practice: string;
};
export type DemoState = {
  drafts: Record<StudentId, Report>;
  published: Partial<Record<StudentId, Report>>;
};
export const upcoming = {
  title: 'Make your quiz come to life.',
  objective: 'Use JavaScript to check answers and keep score.',
  start: '2026-09-19T10:00:00+08:00',
  end: '2026-09-19T12:00:00+08:00',
  number: '04',
};
export const completed = {
  title: 'Buttons that do something.',
  start: '2026-09-12T10:00:00+08:00',
  end: '2026-09-12T11:30:00+08:00',
  number: '03',
};
export function lessonDate(start: string) {
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(start));
}
export function lessonTime(start: string, end: string) {
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${format.format(new Date(start))}–${format.format(new Date(end))} SGT`;
}
export function createDemoState(): DemoState {
  const drafts = Object.fromEntries(
    students.map((student) => [
      student.id,
      {
        attendance: 'Present',
        topics: 'Click events and JavaScript event handlers',
        feedback: `${student.name.split(' ')[0]} connected a button to an event handler and explained the result clearly. Next, practise checking more than one answer.`,
        practice:
          'Write three quiz questions. Explain what should happen when each answer is correct or incorrect.',
      },
    ]),
  ) as Record<StudentId, Report>;
  return { drafts, published: { avery: { ...drafts.avery } } };
}
export function reportError(report: Report): string | null {
  if (
    ![report.topics, report.feedback, report.practice].every(
      (value) => value.trim().length > 0,
    )
  )
    return 'Add topics, feedback, and suggested practice before publishing.';
  if (
    report.topics.length > 200 ||
    report.feedback.length > 1200 ||
    report.practice.length > 600
  )
    return 'Shorten the update to fit the field limits.';
  return null;
}
export type DemoAction =
  | { type: 'edit'; student: StudentId; patch: Partial<Report> }
  | { type: 'publish'; student: StudentId };
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === 'edit')
    return {
      ...state,
      drafts: {
        ...state.drafts,
        [action.student]: { ...state.drafts[action.student], ...action.patch },
      },
    };
  const draft = state.drafts[action.student];
  if (reportError(draft)) return state;
  return {
    ...state,
    published: {
      ...state.published,
      [action.student]: {
        ...draft,
        topics: draft.topics.trim(),
        feedback: draft.feedback.trim(),
        practice: draft.practice.trim(),
      },
    },
  };
}
