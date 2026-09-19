'use client';

import { useEffect, useReducer, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  MessageSquare,
  MonitorUp,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  brand,
  students,
  upcoming,
  completed,
  lessonDate,
  lessonTime,
  createDemoState,
  demoReducer,
  reportError,
  type StudentId,
  type Attendance,
  type Report,
  type Role,
} from '@/lib/demo';

function LessonCard({
  onClassroom,
  parent = false,
}: {
  onClassroom: () => void;
  parent?: boolean;
}) {
  return (
    <section
      className="lesson-card"
      aria-labelledby={parent ? 'parent-next' : 'next-lesson'}
    >
      <div className="lesson-top">
        <span className="eyebrow">UP NEXT · LESSON {upcoming.number}</span>
        <span className="tag">Web Foundations</span>
      </div>
      <h2 id={parent ? 'parent-next' : 'next-lesson'}>
        Make your quiz
        <br />
        come to life.
      </h2>
      <p>{upcoming.objective}</p>
      <div className="lesson-meta">
        <span>
          <CalendarDays size={17} />
          {lessonDate(upcoming.start)}
        </span>
        <span>
          <Clock3 size={17} />
          {lessonTime(upcoming.start, upcoming.end)}
        </span>
      </div>
      <div className="lesson-bottom">
        {parent ? (
          <span className="parent-next-note">
            <Video size={18} />
            Avery joins from the student dashboard.
          </span>
        ) : (
          <Button className="primary-action" onClick={onClassroom}>
            <Video size={18} />
            Preview classroom
            <ArrowUpRight size={17} />
          </Button>
        )}
        <span className="small">4 students · Teacher Maya</span>
      </div>
      <Code2 className="lesson-mark" aria-hidden="true" />
    </section>
  );
}
function WorksheetButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button variant="outline" className="secondary-action" onClick={onOpen}>
      <BookOpen size={18} />
      Open worksheet
      <ArrowUpRight size={17} />
    </Button>
  );
}
function Preparation({ onWorksheet }: { onWorksheet: () => void }) {
  return (
    <aside className="paper-card prep-card">
      <p className="eyebrow">BEFORE WE MEET</p>
      <h2>A small head start.</h2>
      <div className="prep-item">
        <span className="step-number">01</span>
        <div>
          <h3>Open your worksheet</h3>
          <p>Read the challenge and think of three quiz questions.</p>
        </div>
      </div>
      <div className="prep-item">
        <span className="step-number">02</span>
        <div>
          <h3>Bring your curiosity</h3>
          <p>We’ll build and debug together in class.</p>
        </div>
      </div>
      <WorksheetButton onOpen={onWorksheet} />
    </aside>
  );
}
function Feedback({
  report,
  parent = false,
}: {
  report?: Report;
  parent?: boolean;
}) {
  return (
    <section className="paper-card feedback-card">
      <span className="section-icon">
        <MessageSquare size={21} />
      </span>
      <p className="eyebrow">LAST CLASS · LESSON {completed.number}</p>
      <h2>
        {parent
          ? 'This week, in Avery’s words and work.'
          : 'Your latest teacher update.'}
      </h2>
      <p>
        {completed.title}
        <br />
        <span className="small-meta">
          {lessonDate(completed.start)} ·{' '}
          {lessonTime(completed.start, completed.end)}
        </span>
      </p>
      {report ? (
        <>
          <div className="report-status">
            <span className="status-pill">
              <CheckCircle2 size={15} />
              {report.attendance}
            </span>
            <span className="small-meta">Published sample update</span>
          </div>
          <h3>What we covered</h3>
          <p className="report-copy">{report.topics}</p>
          <div className="teacher-note">
            {report.feedback}
            <span>Teacher Maya · Sample feedback for Avery</span>
          </div>
          <div className="practice-note">
            <h3>Try before next class</h3>
            <p>{report.practice}</p>
          </div>
        </>
      ) : (
        <div className="empty-note">
          <MessageSquare size={24} />
          <h3>No update published yet</h3>
          <p>The teacher’s note will appear here once it is published.</p>
        </div>
      )}
    </section>
  );
}
function WorksheetCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="paper-card worksheet-card">
      <span className="section-icon coral">
        <FileText size={21} />
      </span>
      <p className="eyebrow">YOUR WORKSHEET</p>
      <h2>Quiz Lab</h2>
      <p>Turn three questions into a small interactive quiz.</p>
      <div className="code-label">HTML + JAVASCRIPT</div>
      <div className="worksheet-footer">
        <span>Lesson 04 · 3 challenges</span>
      </div>
      <WorksheetButton onOpen={onOpen} />
    </section>
  );
}
function WeeklyEditor({
  state,
  dispatch,
}: {
  state: ReturnType<typeof createDemoState>;
  dispatch: React.Dispatch<Parameters<typeof demoReducer>[1]>;
}) {
  const [selected, setSelected] = useState<StudentId>('avery');
  const [message, setMessage] = useState('');
  const draft = state.drafts[selected];
  const published = state.published[selected];
  const dirty = JSON.stringify(draft) !== JSON.stringify(published);
  const isInvalid = reportError(draft);
  const change = (patch: Partial<Report>) => {
    dispatch({ type: 'edit', student: selected, patch });
    setMessage('');
  };
  return (
    <section className="paper-card teacher-editor">
      <div className="section-heading editor-heading">
        <div>
          <p className="eyebrow">AFTER CLASS · LESSON {completed.number}</p>
          <h2>Leave a useful weekly update.</h2>
        </div>
        <span className="status-pill neutral">
          {dirty ? 'Draft changes' : 'Published'}
        </span>
      </div>
      <p className="editor-intro">
        {completed.title} · {lessonDate(completed.start)} ·{' '}
        {lessonTime(completed.start, completed.end)}
      </p>
      <RadioGroup
        className="student-picker"
        aria-label="Student to review"
        value={selected}
        onValueChange={(value) => {
          setSelected(value as StudentId);
          setMessage('');
        }}
      >
        {students.map((student) => (
          <label
            key={student.id}
            className={
              selected === student.id
                ? 'student-choice selected'
                : 'student-choice'
            }
          >
            <RadioGroupItem value={student.id} />
            <span className="avatar">{student.initials}</span>
            <span>
              {student.name}
              <small>
                {state.published[student.id]
                  ? 'Update published'
                  : 'No update yet'}
              </small>
            </span>
          </label>
        ))}
      </RadioGroup>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isInvalid) {
            setMessage(isInvalid);
            return;
          }
          dispatch({ type: 'publish', student: selected });
          setMessage(
            `Demo update published for ${students.find((student) => student.id === selected)?.name}. ${selected === 'avery' ? 'Switch to Parent to see it.' : 'The parent demo is linked to Avery only.'}`,
          );
        }}
      >
        <fieldset className="attendance-field">
          <legend>Attendance</legend>
          <RadioGroup
            className="attendance-options"
            value={draft.attendance}
            onValueChange={(value) =>
              change({ attendance: value as Attendance })
            }
          >
            {(['Present', 'Late', 'Absent'] as const).map((status) => (
              <label key={status}>
                <RadioGroupItem value={status} />
                {status}
              </label>
            ))}
          </RadioGroup>
        </fieldset>
        <label className="field-label" htmlFor="topics">
          What did you cover?
        </label>
        <Input
          className="report-input"
          id="topics"
          value={draft.topics}
          maxLength={200}
          required
          onChange={(event) => change({ topics: event.target.value })}
        />
        <label className="field-label" htmlFor="feedback">
          How did the lesson go?
        </label>
        <Textarea
          className="report-textarea"
          id="feedback"
          value={draft.feedback}
          maxLength={1200}
          required
          rows={4}
          onChange={(event) => change({ feedback: event.target.value })}
        />
        <label className="field-label" htmlFor="practice">
          Suggested practice
        </label>
        <Textarea
          className="report-textarea"
          id="practice"
          value={draft.practice}
          maxLength={600}
          required
          rows={2}
          onChange={(event) => change({ practice: event.target.value })}
        />
        <div className="publish-row">
          <p>
            Drafts stay here until you publish.
            <br />
            Demo changes reset on refresh.
          </p>
          <Button type="submit" className="primary-action">
            <Check size={18} />
            Publish demo update
          </Button>
        </div>
        <output className="form-status" aria-live="polite">
          {message}
        </output>
      </form>
    </section>
  );
}
function Worksheet() {
  return (
    <div className="worksheet-reader">
      <p className="eyebrow">LESSON 04 · WEB FOUNDATIONS</p>
      <div className="worksheet-objective">
        <Code2 size={28} />
        <p>
          <strong>Your challenge</strong>
          <br />
          Build a three-question quiz that responds to answers and keeps score.
        </p>
      </div>
      <ol className="challenge-list">
        <li>
          <h3>Plan your questions</h3>
          <p>
            Write three questions and their correct answers. Choose a topic you
            enjoy: animals, space, or your favourite game.
          </p>
        </li>
        <li>
          <h3>Check an answer</h3>
          <p>
            Read this sample. What changes when you call the function with
            “Mars”? What happens with “Venus”?
          </p>
          <pre>
            <code>{`let score = 0;\n\nfunction checkAnswer(answer) {\n  if (answer === "Mars") {\n    score += 1;\n    return "Correct!";\n  }\n  return "Try again.";\n}`}</code>
          </pre>
          <p className="small-meta">
            Reading example only · Code does not run in this preview.
          </p>
        </li>
        <li>
          <h3>Explain your next step</h3>
          <p>
            How would you stop someone earning points by answering the same
            question twice? Bring your idea to class.
          </p>
        </li>
      </ol>
      <div className="worksheet-end">
        <CheckCircle2 size={20} />
        <p>
          <strong>Ready when you can explain</strong>
          <br />
          What an event handler does, when a score changes, and how to test an
          incorrect answer.
        </p>
      </div>
    </div>
  );
}
function Classroom() {
  return (
    <div className="classroom-preview">
      <div className="call-banner">
        <VideoOff size={17} />
        Layout preview · No camera, microphone, or live call.
      </div>
      <div className="screen-area">
        <MonitorUp size={42} />
        <h3>Teacher’s shared screen</h3>
        <p>Code, explain, and debug together.</p>
        <span className="code-label">{upcoming.title}</span>
      </div>
      <div className="participant-row">
        {students.map((student) => (
          <div key={student.id} className="participant">
            <span className="avatar">{student.initials}</span>
            <span>{student.name.split(' ')[0]}</span>
            <span className="small-meta">Sample student</span>
          </div>
        ))}
      </div>
      <div className="call-detail">
        <span>
          <Users size={17} />4 students + 1 teacher
        </span>
        <span>
          <Clock3 size={17} />
          90–120-minute lessons
        </span>
      </div>
      <p className="classroom-materials">
        <BookOpen size={20} />
        <span>
          <strong>Keep the worksheet close</strong>
          <br />
          Lesson materials will stay accessible during and after the call.
        </span>
      </p>
    </div>
  );
}

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelDocument = Document & {
  modelContext?: {
    registerTool: (
      tool: Tool,
      options: { signal: AbortSignal },
    ) => void | Promise<void>;
  };
};

export default function Home() {
  const [role, setRole] = useState<Role>('student');
  const [modal, setModal] = useState<'worksheet' | 'classroom' | null>(null);
  const [state, dispatch] = useReducer(demoReducer, undefined, createDemoState);
  useEffect(() => {
    const registry = (document as ModelDocument).modelContext;
    if (!registry?.registerTool) return;
    const lifecycle = new AbortController();
    const tool: Tool = {
      name: 'preview_codelah_role',
      title: 'Preview a CodeLah demo role',
      description:
        'Switch the visible fictional dashboard to student, teacher, or parent. This is not login.',
      inputSchema: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['student', 'teacher', 'parent'] },
        },
        required: ['role'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        if (
          !input ||
          typeof input !== 'object' ||
          !('role' in input) ||
          !['student', 'teacher', 'parent'].includes(String(input.role)) ||
          Object.keys(input).length !== 1
        )
          throw new Error('Provide one valid demo role.');
        const next = input.role as Role;
        flushSync(() => {
          setRole(next);
          setModal(null);
        });
        return { role: next, demo: true };
      },
    };
    try {
      void Promise.resolve(
        registry.registerTool(tool, { signal: lifecycle.signal }),
      ).catch((error) => console.warn('Optional demo tool unavailable', error));
    } catch (error) {
      console.warn('Optional demo tool unavailable', error);
    }
    return () => lifecycle.abort();
  }, []);
  const openWorksheet = () => setModal('worksheet');
  const openClassroom = () => setModal('classroom');
  return (
    <div className="studio">
      <header className="topbar">
        <Link className="wordmark" href="/">
          {brand.name}
          <span aria-hidden="true">{'{ }'}</span>
        </Link>
        <span className="studio-label">LEARNING STUDIO</span>
        <span className="demo-pill">Phase 1 · Demo</span>
      </header>
      <Tabs
        value={role}
        onValueChange={(value) => setRole(value as Role)}
        className="portal-tabs"
      >
        <div className="demo-bar">
          <p>Fictional class data. Changes reset on refresh.</p>
          <div className="role-switch">
            <span>Preview as</span>
            <TabsList aria-label="Demo role">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="teacher">Teacher</TabsTrigger>
              <TabsTrigger value="parent">Parent</TabsTrigger>
            </TabsList>
          </div>
        </div>
        <main id="main" className="workspace" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {role === 'teacher'
                  ? 'TEACHER STUDIO'
                  : role === 'parent'
                    ? 'PARENT STUDIO · LINKED CHILD: AVERY'
                    : 'YOUR CODING STUDIO'}
              </p>
              <h1>
                {role === 'student'
                  ? 'Ready to build, Avery?'
                  : role === 'teacher'
                    ? 'A little guidance. A lot of growth.'
                    : 'Avery’s learning, in focus.'}
              </h1>
              <p>
                {role === 'student'
                  ? 'Your next class, your practice, and the ideas taking shape.'
                  : role === 'teacher'
                    ? 'Plan the next lesson and share what each student learned.'
                    : 'See what Avery explored, how it went, and what comes next.'}
              </p>
            </div>
            <div className="date-label">
              <CalendarDays size={18} />
              Sample week · 14–20 Sep 2026
            </div>
          </div>
          <TabsContent value="student">
            <div className="overview-grid">
              <LessonCard onClassroom={openClassroom} />
              <Preparation onWorksheet={openWorksheet} />
            </div>
            <div className="section-heading">
              <h2>Keep your learning close.</h2>
              <span className="eyebrow">ONE LESSON AT A TIME</span>
            </div>
            <div className="lower-grid">
              <Feedback report={state.published.avery} />
              <WorksheetCard onOpen={openWorksheet} />
            </div>
          </TabsContent>
          <TabsContent value="teacher">
            <div className="overview-grid">
              <LessonCard onClassroom={openClassroom} />
              <aside className="paper-card cohort-card">
                <p className="eyebrow">YOUR CLASS</p>
                <h2>Four curious minds.</h2>
                <p>Web Foundations · Teacher Maya</p>
                <div className="cohort-list">
                  {students.map((student) => (
                    <div key={student.id}>
                      <span className="avatar">{student.initials}</span>
                      <span>{student.name}</span>
                      <span className="small-meta">Sample</span>
                    </div>
                  ))}
                </div>
                <WorksheetButton onOpen={openWorksheet} />
              </aside>
            </div>
            <WeeklyEditor state={state} dispatch={dispatch} />
          </TabsContent>
          <TabsContent value="parent">
            <div className="parent-summary">
              <span className="avatar large">AT</span>
              <div>
                <h2>Avery Tan</h2>
                <p>Web Foundations · Teacher Maya · Sample linked child</p>
              </div>
              <span className="parent-class-size">
                <Users size={18} />4 students per class
              </span>
            </div>
            <div className="lower-grid">
              <Feedback parent report={state.published.avery} />
              <aside className="paper-card">
                <p className="eyebrow">A SMALL WAY TO HELP</p>
                <h2>Let Avery show you.</h2>
                <p>
                  Ask: “What happens when I choose the wrong answer?” Give Avery
                  time to explain and test the idea.
                </p>
                <div className="parent-tip">
                  <BookOpen size={24} />
                  <p>You can read the same worksheet Avery uses in class.</p>
                </div>
                <WorksheetButton onOpen={openWorksheet} />
              </aside>
            </div>
            <div className="section-heading">
              <h2>Coming up next.</h2>
              <span className="eyebrow">SATURDAY STUDIO</span>
            </div>
            <LessonCard parent onClassroom={openClassroom} />
          </TabsContent>
          <footer className="page-footer">
            <span>
              {brand.name} · {brand.tagline}
            </span>
            <span>All lesson times are Singapore time (SGT).</span>
          </footer>
        </main>
      </Tabs>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="lesson-dialog">
          <DialogTitle className="dialog-title">
            {modal === 'classroom'
              ? 'Your classroom, inside CodeLah.'
              : 'Quiz Lab worksheet'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'classroom'
              ? `${lessonDate(upcoming.start)} · ${lessonTime(upcoming.start, upcoming.end)} · Sample lesson`
              : 'Fictional lesson material · Read and practise before class.'}
          </DialogDescription>
          {modal === 'classroom' ? <Classroom /> : <Worksheet />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
