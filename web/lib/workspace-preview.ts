import type { Account } from './accounts';
import { singaporeDay, type WorkspaceData } from './workspace';

// These fictional records never connect to Supabase or impersonate real accounts.
export function workspacePreview(
  role: 'student' | 'parent' | 'teacher',
  now: number,
): WorkspaceData {
  const people: Account[] = [
    { id: 'maya', display_name: 'Maya Tan', role: 'student', status: 'active' },
    { id: 'leo', display_name: 'Leo Tan', role: 'student', status: 'active' },
    {
      id: 'aarav',
      display_name: 'Aarav Lim',
      role: 'student',
      status: 'active',
    },
    {
      id: 'sophie',
      display_name: 'Sophie Lee',
      role: 'student',
      status: 'active',
    },
    { id: 'ryan', display_name: 'Ryan Ng', role: 'student', status: 'active' },
    {
      id: 'teacher',
      display_name: 'Alex Chen',
      role: 'teacher',
      status: 'active',
    },
    {
      id: 'parent',
      display_name: 'Jamie Tan',
      role: 'parent',
      status: 'active',
      contact_email: 'jamie@example.invalid',
    },
    {
      id: 'parent-two',
      display_name: 'Robin Tan',
      role: 'parent',
      status: 'active',
      contact_email: 'robin@example.invalid',
    },
  ];
  const account = people.find(
    (p) => p.id === (role === 'student' ? 'maya' : role),
  )!;
  const day = new Date(
    `${singaporeDay(new Date(now).toISOString())}T16:00:00+08:00`,
  ).valueOf();
  const lessons: WorkspaceData['lessons'] = [-21, -14, -7, 1, 5, 8].map(
    (offset, i) => ({
      id: `lesson-${i + 1}`,
      classroom_id: i % 2 ? 'class-python' : 'class-builders',
      title: [
        'Meet your helper robot',
        'The potion shop',
        'Choose your own adventure',
        'Make a guessing game',
        'Loops in the wild',
        'Your mini project',
      ][i],
      objective: [
        'Give a robot a name using variables and strings.',
        'Read input and calculate prices.',
        'Build a branching story with conditions.',
        'Use loops and conditions to build an interactive game.',
        'Spot patterns and use loops to make less work.',
        'Bring your new skills together in a project.',
      ][i],
      starts_at: new Date(day + offset * 86400000).toISOString(),
      ends_at: new Date(day + offset * 86400000 + 90 * 60000).toISOString(),
      status: i < 3 ? 'completed' : 'scheduled',
    }),
  );
  const courses = [
    {
      id: 'python',
      name: 'Python',
      description: 'From your first line of code to projects of your own.',
    },
    {
      id: 'web',
      name: 'AI Web Dev',
      description: 'Plan, build, and improve something for the web.',
    },
  ];
  const levels = [
    'First steps with Python',
    'Build with logic',
    'Explore your data',
    'Machine learning foundations',
    'Create with AI',
  ].map((name, i) => ({
    id: `level-${i + 1}`,
    course_id: 'python',
    name,
    position: i + 1,
  }));
  const objectives = [
    [
      'Print messages and run a Python program',
      'Store information with variables',
      'Read input and work with numbers',
      'Make decisions with conditions',
    ],
    [
      'Repeat actions with loops',
      'Group information in lists',
      'Build reusable functions',
      'Break a project into smaller steps',
    ],
    [
      'Read and organise a dataset',
      'Create a chart to explore a question',
      'Explain what your data shows',
    ],
    [
      'Prepare data for a model',
      'Train and compare a simple model',
      'Check results using new data',
    ],
    ['Explore how a neural network learns', 'Build and explain an AI project'],
  ].flatMap((titles, level) =>
    titles.map((title, position) => ({
      id: `objective-${level}-${position}`,
      level_id: levels[level].id,
      title,
      position: position + 1,
    })),
  );
  const worksheets: WorkspaceData['worksheets'] = [
    'Robot name lab',
    'The potion shop',
    'Dragon gatekeeper',
    'Space race',
    'Pet hatchery',
    'Data detective',
    'Teacher solution notes',
  ].map((title, i) => ({
    id: `worksheet-${i + 1}`,
    title,
    description: [
      'Give a helper robot its own identity.',
      'A little input. A little maths. Your own shop.',
      'Use decisions to make your story branch.',
      'Build a race with loops and a little logic.',
      'Create a pet, one function at a time.',
      'Follow the clues hiding in a dataset.',
      'Teacher reference and worked solutions.',
    ][i],
    tags: [
      ['variables', 'strings'],
      ['input', 'numbers'],
      ['conditions', 'logic'],
      ['loops', 'project'],
      ['functions', 'project'],
      ['data', 'charts'],
      ['solutions'],
    ][i],
    course_id: 'python',
    level_id: `level-${i < 3 ? 1 : i < 5 ? 2 : 3}`,
    visibility: i === 6 ? 'restricted' : i === 0 ? 'unlocked' : 'locked',
    created_at: new Date(day - i * 86400000).toISOString(),
  }));
  const linked =
    role === 'student'
      ? ['maya']
      : role === 'parent'
        ? ['maya', 'leo']
        : ['maya', 'leo', 'aarav', 'sophie', 'ryan'];
  const roster = lessons.flatMap((l, i) =>
    (i === 4
      ? ['leo', 'aarav']
      : ['maya', 'sophie', ...(i < 3 ? ['ryan'] : [])]
    )
      .filter((s) => linked.includes(s))
      .map((student_id) => ({ lesson_id: l.id, student_id })),
  );
  const visibleLessons =
    role === 'teacher'
      ? lessons
      : lessons.filter((l) => roster.some((r) => r.lesson_id === l.id));
  return {
    account,
    people: people.filter((p) => p.role !== 'student' || linked.includes(p.id)),
    classrooms: [
      { id: 'class-python', name: 'Python explorers', active: true },
      { id: 'class-builders', name: 'Python builders', active: true },
    ],
    enrolments: linked.map((student_id) => ({
      student_id,
      classroom_id: 'class-python',
      active: true,
    })),
    parents: ['parent', 'parent-two'].flatMap((parent_id) =>
      ['maya', 'leo']
        .filter((s) => linked.includes(s))
        .map((student_id) => ({ parent_id, student_id, active: true })),
    ),
    lessons: visibleLessons,
    roster,
    attendance: roster
      .filter((r) => ['lesson-1', 'lesson-2', 'lesson-3'].includes(r.lesson_id))
      .map((r) => ({
        ...r,
        status: r.lesson_id === 'lesson-2' ? 'absent' : 'present',
        note: '',
      })),
    reports: [
      {
        lesson_id: 'lesson-3',
        student_id: 'maya',
        topics: 'Conditions and branching stories',
        note: 'Maya built a story with three different endings and tested each path. She is getting more confident explaining why her code works.',
        practice: 'Try adding one more choice to your story.',
        published_at: lessons[2].ends_at,
      },
      {
        lesson_id: 'lesson-1',
        student_id: 'maya',
        topics: 'Variables and strings',
        note: 'A thoughtful first project. Maya gave her helper robot a name and added a few details of her own.',
        practice: 'Change one value, save, and run again.',
        published_at: lessons[0].ends_at,
      },
    ].filter((r) => linked.includes(r.student_id)),
    feedback: [],
    comments: [
      {
        id: 'comment-1',
        lesson_id: 'lesson-3',
        student_id: 'maya',
        body: 'I added a secret door to my story. Next time I want to make the player find a key first.',
        created_at: lessons[2].ends_at,
      },
    ],
    files: [
      {
        id: 'file-1',
        lesson_id: 'lesson-1',
        student_id: 'maya',
        kind: 'submission',
        file_name: 'my_robot.py',
        size_bytes: 812,
        created_at: lessons[0].ends_at,
      },
      {
        id: 'file-2',
        lesson_id: 'lesson-3',
        student_id: 'maya',
        kind: 'submission',
        file_name: 'dragon_story.py',
        size_bytes: 2430,
        created_at: lessons[2].ends_at,
      },
    ],
    worksheets: worksheets.filter(
      (w) => role === 'teacher' || w.visibility !== 'restricted',
    ),
    assets: worksheets
      .filter(
        (w) =>
          role === 'teacher' ||
          ['worksheet-1', 'worksheet-2', 'worksheet-3'].includes(w.id),
      )
      .map((w) => ({
        worksheet_id: w.id,
        file_name: `${w.title.toLowerCase().replaceAll(' ', '-')}.pdf`,
        size_bytes: 128000,
      })),
    assignments: ['worksheet-2', 'worksheet-3'].map((worksheet_id) => ({
      worksheet_id,
      student_id: 'maya',
    })),
    courses,
    levels,
    objectives,
    studentCourses: linked.map((student_id) => ({
      student_id,
      course_id: 'python',
    })),
    progress: objectives.slice(0, 3).map((o) => ({
      objective_id: o.id,
      student_id: 'maya',
      completed_at: lessons[2].ends_at,
    })),
    profiles: [
      {
        student_id: 'maya',
        school: 'Example school',
        school_year: 'Secondary 1',
        phone: '',
        notes: 'Enjoys storytelling and making games.',
      },
      {
        student_id: 'leo',
        school: 'Example school',
        school_year: 'Primary 5',
        phone: '',
        notes: '',
      },
    ],
    payments: [
      {
        id: 'payment-example-1',
        student_id: 'maya',
        description: 'Example tuition record',
        amount_cents: 5000,
        due_on: singaporeDay(new Date(day).toISOString()),
        status: 'paid',
        paid_on: singaporeDay(lessons[2].starts_at),
      },
    ],
  };
}
