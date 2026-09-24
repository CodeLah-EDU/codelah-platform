import Link from "next/link";
import { notFound } from "next/navigation";
import { currentAccount } from "@/lib/supabase/access";
import { isId, lessonDate, lessonTime, resourceLink } from "@/lib/lessons";
import { SaveForm } from "@/components/lessons/save-form";

type Person = { id: string; display_name: string; role: string };
type Material = { id: string; title: string; instructions: string; resource_url: string | null };
type Submission = {
  id: string;
  student_id: string;
  response: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  teacher_note: string | null;
};
type Attendance = { student_id: string; status: string; note: string };
type Feedback = {
  student_id: string;
  topics: string;
  note: string;
  practice: string;
  status?: string;
  published_at?: string;
};
function Fields({
  lessonId,
  action,
  studentId,
}: {
  lessonId: string;
  action: string;
  studentId?: string;
}) {
  return (
    <>
      <input type="hidden" name="lesson_id" value={lessonId} />
      <input type="hidden" name="action" value={action} />
      {studentId && <input type="hidden" name="student_id" value={studentId} />}
    </>
  );
}
function safeLink(value: string | null) {
  try {
    return resourceLink(value ?? "");
  } catch {
    return null;
  }
}
export default async function LessonDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const [{ id }, { message }, { client, account }] = await Promise.all([
    params,
    searchParams,
    currentAccount(),
  ]);
  if (!isId(id)) notFound();
  const { data: lesson, error: lessonError } = await client
    .from("lessons")
    .select("id,classroom_id,title,objective,starts_at,ends_at,status")
    .eq("id", id)
    .maybeSingle();
  if (lessonError)
    return (
      <main id="main" className="account-shell">
        <h1>Lesson unavailable</h1>
        <p role="alert">We couldn’t load this lesson. Please try again.</p>
        <Link href="/dashboard/lessons">Back to lessons</Link>
      </main>
    );
  if (!lesson) notFound();
  const teacher = account?.role === "teacher" || account?.role === "admin";
  const [
    materialsResult,
    submissionsResult,
    attendanceResult,
    feedbackResult,
    reportsResult,
    rosterResult,
    classResult,
  ] = await Promise.all([
    client
      .from("lesson_materials")
      .select("id,title,instructions,resource_url")
      .eq("lesson_id", id)
      .order("created_at"),
    client
      .from("lesson_submissions")
      .select("id,student_id,response,submitted_at,reviewed_at,teacher_note")
      .eq("lesson_id", id),
    client.from("lesson_attendance").select("student_id,status,note").eq("lesson_id", id),
    teacher
      ? client
          .from("lesson_feedback")
          .select("student_id,topics,note,practice,status")
          .eq("lesson_id", id)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("lesson_reports")
      .select("student_id,topics,note,practice,published_at")
      .eq("lesson_id", id),
    client
      .from("enrolments")
      .select("student_id")
      .eq("classroom_id", lesson.classroom_id)
      .eq("active", true),
    client.from("classrooms").select("name").eq("id", lesson.classroom_id).single(),
  ]);
  const studentIds = (rosterResult.data ?? []).map((row) => row.student_id);
  const peopleResult = studentIds.length
    ? await client
        .from("accounts")
        .select("id,display_name,role")
        .in("id", studentIds)
        .order("display_name")
    : { data: [], error: null };
  const failed = [
    materialsResult,
    submissionsResult,
    attendanceResult,
    feedbackResult,
    reportsResult,
    rosterResult,
    classResult,
    peopleResult,
  ].some((r) => r.error);
  const people = (peopleResult.data ?? []) as Person[];
  const materials = (materialsResult.data ?? []) as Material[];
  const submissions = (submissionsResult.data ?? []) as Submission[];
  const attendance = (attendanceResult.data ?? []) as Attendance[];
  const feedback = (feedbackResult.data ?? []) as Feedback[];
  const reports = (reportsResult.data ?? []) as Feedback[];
  const ownSubmission = submissions.find((s) => s.student_id === account?.id);
  const messages: Record<string, string> = {
    created: "Lesson scheduled.",
    saved: "Changes saved.",
    failed: "We couldn’t save that change. Check the details and try again.",
  };
  return (
    <main id="main" className="account-shell lesson-workspace">
      <header className="account-header">
        <Link className="wordmark" href="/dashboard">
          CodeLah<span>_</span>
        </Link>
        <Link href="/dashboard/lessons">← Lesson schedule</Link>
      </header>
      <p className="eyebrow">{classResult.data?.name ?? "YOUR CLASS"}</p>
      <div className="page-heading-row">
        <div>
          <h1>{lesson.title}</h1>
          <p className="lesson-record-date">
            {lessonDate(lesson.starts_at)} · {lessonTime(lesson.starts_at, lesson.ends_at)}
          </p>
        </div>
        <span className={`status-chip status-${lesson.status}`}>{lesson.status}</span>
      </div>
      {lesson.objective && <p className="lesson-objective">{lesson.objective}</p>}
      {message && messages[message] && (
        <output className="notice" role={message === "failed" ? "alert" : undefined}>
          {messages[message]}
        </output>
      )}
      {failed ? (
        <section className="panel" role="alert">
          <h2>We couldn’t load the lesson details.</h2>
          <p>Refresh to try again. Your saved work has not changed.</p>
        </section>
      ) : (
        <>
          {teacher && (
            <details className="lesson-settings">
              <summary>Lesson status</summary>
              <SaveForm>
                <Fields lessonId={id} action="lesson_status" />
                <label>
                  Status
                  <select name="status" defaultValue={lesson.status}>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <button className="button">Save lesson status</button>
              </SaveForm>
            </details>
          )}
          <section className="panel">
            <h2>Worksheets & materials</h2>
            {materials.length ? (
              <ul className="account-list">
                {materials.map((material) => {
                  const url = safeLink(material.resource_url);
                  return (
                    <li key={material.id}>
                      <h3>{material.title}</h3>
                      <p className="preserve-lines">{material.instructions}</p>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          Open worksheet ↗
                        </a>
                      )}
                      {teacher && (
                        <SaveForm>
                          <Fields lessonId={id} action="remove_material" />
                          <input type="hidden" name="material_id" value={material.id} />
                          <button className="button">Remove material</button>
                        </SaveForm>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">Your worksheets will appear here when your teacher adds them.</p>
            )}
            {teacher && (
              <details className="lesson-add-material">
                <summary>Add a worksheet or resource</summary>
                <SaveForm>
                  <Fields lessonId={id} action="material" />
                  <label>
                    Material title
                    <input name="title" maxLength={160} required />
                  </label>
                  <label>
                    Instructions
                    <textarea name="instructions" maxLength={5000} rows={4} />
                  </label>
                  <label>
                    Worksheet or resource link (optional)
                    <input type="url" name="resource_url" maxLength={2000} placeholder="https://" />
                  </label>
                  <p className="muted">
                    Paste a worksheet link or write the activity instructions above.
                  </p>
                  <button className="button primary">Add material</button>
                </SaveForm>
              </details>
            )}
          </section>
          {account?.role === "student" && (
            <section className="panel">
              <h2>Your work</h2>
              {lesson.status === "cancelled" ? (
                <p>This lesson is cancelled. Submissions are closed.</p>
              ) : (
                <SaveForm>
                  <Fields lessonId={id} action="submission" />
                  <label>
                    Your response
                    <textarea
                      name="response"
                      required
                      maxLength={10000}
                      rows={7}
                      defaultValue={ownSubmission?.response ?? ""}
                      placeholder="Share your code, explanation, or project link."
                    />
                  </label>
                  <button className="button primary">
                    {ownSubmission ? "Update submission" : "Submit work"}
                  </button>
                </SaveForm>
              )}
              {ownSubmission?.submitted_at && (
                <p className="muted">Last submitted {lessonDate(ownSubmission.submitted_at)}.</p>
              )}
              {ownSubmission?.teacher_note && (
                <aside className="notice preserve-lines">
                  <strong>Teacher’s review</strong>
                  <p>{ownSubmission.teacher_note}</p>
                </aside>
              )}
            </section>
          )}
          {teacher ? (
            <section className="lesson-follow-up">
              <h2>Student follow-up</h2>
              <p className="muted">
                Attendance and published reports are visible to the student and their linked parent.
              </p>
              {!people.length && (
                <p className="panel">No active students enrolled in this class.</p>
              )}
              <div className="lesson-roster">
                {people.map((person) => {
                  const mark = attendance.find((item) => item.student_id === person.id),
                    draft = feedback.find((item) => item.student_id === person.id),
                    submission = submissions.find((item) => item.student_id === person.id),
                    report = reports.find((item) => item.student_id === person.id);
                  return (
                    <article className="panel" key={person.id} id={`learner-${person.id}`}>
                      <h3>{person.display_name}</h3>
                      <div className="lesson-submission">
                        <h4>Submitted work</h4>
                        {submission ? (
                          <>
                            <pre>{submission.response}</pre>
                            <SaveForm>
                              <Fields lessonId={id} action="review" studentId={person.id} />
                              <label>
                                Review note
                                <textarea
                                  name="teacher_note"
                                  maxLength={5000}
                                  rows={3}
                                  defaultValue={submission.teacher_note ?? ""}
                                />
                              </label>
                              <button className="button">Save review</button>
                            </SaveForm>
                          </>
                        ) : (
                          <p className="muted">No submission yet.</p>
                        )}
                      </div>
                      <details>
                        <summary>Attendance · {mark?.status ?? "unmarked"}</summary>
                        <SaveForm>
                          <Fields lessonId={id} action="attendance" studentId={person.id} />
                          <label>
                            Attendance
                            <select name="status" defaultValue={mark?.status ?? "unmarked"}>
                              {["unmarked", "present", "late", "absent", "excused"].map(
                                (status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          <label>
                            Attendance note (visible to family)
                            <input
                              name="attendance_note"
                              maxLength={1000}
                              defaultValue={mark?.note ?? ""}
                            />
                          </label>
                          <button className="button">Save attendance</button>
                        </SaveForm>
                      </details>
                      <details>
                        <summary>
                          Weekly feedback · {report ? "report published" : "not published"}
                        </summary>
                        <p className="muted">
                          Save a private draft, then publish when ready. A new draft keeps the
                          previous report visible to the family.
                        </p>
                        <SaveForm>
                          <Fields lessonId={id} action="feedback" studentId={person.id} />
                          <label>
                            Topics covered
                            <input
                              name="topics"
                              maxLength={2000}
                              defaultValue={draft?.topics ?? ""}
                            />
                          </label>
                          <label>
                            Teacher feedback
                            <textarea
                              name="note"
                              maxLength={5000}
                              rows={5}
                              defaultValue={draft?.note ?? ""}
                            />
                          </label>
                          <label>
                            Practice for next time
                            <textarea
                              name="practice"
                              maxLength={2000}
                              rows={3}
                              defaultValue={draft?.practice ?? ""}
                            />
                          </label>
                          <div className="form-actions">
                            <button className="button" name="status" value="draft">
                              Save draft
                            </button>
                            <button className="button primary" name="status" value="published">
                              Publish report
                            </button>
                          </div>
                        </SaveForm>
                      </details>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="panel">
              <h2>
                {account?.role === "parent" ? "Your child’s lesson update" : "Your lesson update"}
              </h2>
              {people.map((person) => {
                const mark = attendance.find((item) => item.student_id === person.id),
                  report = reports.find((item) => item.student_id === person.id),
                  submission = submissions.find((item) => item.student_id === person.id);
                return (
                  <article className="family-report" key={person.id}>
                    <h3>{person.display_name}</h3>
                    <p>
                      <strong>Attendance:</strong> {mark?.status ?? "Not marked yet"}
                    </p>
                    {mark?.note && <p>{mark.note}</p>}
                    {report ? (
                      <div className="preserve-lines">
                        <h4>Topics covered</h4>
                        <p>{report.topics || "No topics added."}</p>
                        <h4>Teacher feedback</h4>
                        <p>{report.note}</p>
                        <h4>Practice for next time</h4>
                        <p>{report.practice || "No additional practice set."}</p>
                        <p className="muted">Published {lessonDate(report.published_at!)}.</p>
                      </div>
                    ) : (
                      <p className="muted">Your teacher hasn’t published feedback yet.</p>
                    )}
                    {account?.role === "parent" && (
                      <details>
                        <summary>
                          Student work · {submission ? "submitted" : "not submitted yet"}
                        </summary>
                        {submission && (
                          <>
                            <pre>{submission.response}</pre>
                            {submission.teacher_note && (
                              <p className="notice preserve-lines">
                                Teacher’s review: {submission.teacher_note}
                              </p>
                            )}
                          </>
                        )}
                      </details>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
}
