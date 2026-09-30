'use client';
import { useRouter } from 'next/navigation';
import { useAdmin, Field, Form } from './console-ui';

const singaporeInput = (instant: string) =>
  new Date(new Date(instant).valueOf() + 8 * 3600000)
    .toISOString()
    .slice(0, 16);

export function LessonEditor({
  id,
  classroomId,
  close,
}: {
  id?: string;
  classroomId?: string;
  close: () => void;
}) {
  const { data, today, href } = useAdmin();
  const router = useRouter();
  const lesson = data.lessons.find((l) => l.id === id);
  return (
    <Form
      action="lesson_save"
      values={id ? { id } : {}}
      label={id ? 'Save lesson' : 'Schedule lesson'}
      onSaved={(saved) => {
        close();
        if (!id && saved) router.push(href(`attendance/${saved}`));
      }}
    >
      {!id && (
        <Field label="Class">
          <select name="classroom_id" defaultValue={classroomId ?? ''} required>
            <option value="">Choose a class</option>
            {data.classes
              .filter((c) => c.active)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
      )}
      <Field label="Lesson title">
        <input
          name="title"
          defaultValue={lesson?.title}
          required
          maxLength={160}
        />
      </Field>
      <Field label="Learning focus">
        <textarea
          name="objective"
          defaultValue={lesson?.objective}
          maxLength={2000}
          rows={3}
        />
      </Field>
      <Field label="Starts (Singapore time)">
        <input
          type="datetime-local"
          name="starts_at"
          defaultValue={
            lesson ? singaporeInput(lesson.starts_at) : `${today}T16:00`
          }
          required
        />
      </Field>
      <Field label="Ends (Singapore time)" hint="Lessons last 90–120 minutes.">
        <input
          type="datetime-local"
          name="ends_at"
          defaultValue={
            lesson ? singaporeInput(lesson.ends_at) : `${today}T17:30`
          }
          required
        />
      </Field>
      {id ? (
        <Field label="Lesson status">
          <select name="status" defaultValue={lesson?.status}>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
      ) : (
        <input type="hidden" name="status" value="scheduled" />
      )}
      <p className="ops-form-note">
        {id
          ? 'Cancelling preserves attendance and lesson work. Rescheduling keeps this lesson’s existing students.'
          : 'Schedule a future time. The class’s current students become this lesson’s roster, up to four places.'}
      </p>
    </Form>
  );
}
