import Link from "next/link";
import { SaveForm } from "@/components/lessons/save-form";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/supabase/access";

export default async function NewLesson() {
  const { client, account } = await currentAccount();
  if (account?.role !== "teacher" && account?.role !== "admin") redirect("/dashboard/lessons");
  const { data: classrooms, error } = await client
    .from("classrooms")
    .select("id,name")
    .eq("active", true)
    .order("name");
  return (
    <main id="main" className="account-shell">
      <header className="account-header">
        <Link className="wordmark" href="/dashboard/lessons">
          CodeLah<span>_</span>
        </Link>
        <Link href="/dashboard/lessons">Back to lessons</Link>
      </header>
      <p className="eyebrow">TEACHING WEEK</p>
      <h1>Schedule a lesson</h1>
      <p className="muted">Create a saved lesson record for an assigned class.</p>
      {error ? (
        <p className="notice" role="alert">
          We couldn’t load your classes. Please refresh to try again.
        </p>
      ) : !classrooms?.length ? (
        <p className="panel">
          No active class is assigned yet. Ask your administrator to connect your class.
        </p>
      ) : (
        <SaveForm className="panel account-form lesson-form" action="/dashboard/lessons/create">
          <label>
            Class
            <select name="classroom_id" required>
              <option value="">Choose a class</option>
              {(classrooms ?? []).map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lesson title
            <input name="title" required maxLength={160} placeholder="Loops and event handlers" />
          </label>
          <label>
            Objective
            <textarea
              name="objective"
              maxLength={2000}
              rows={3}
              placeholder="What should students be able to explain or build?"
            />
          </label>
          <div className="lesson-form-grid">
            <label>
              Starts
              <input type="datetime-local" name="starts_at" required />
            </label>
            <label>
              Ends
              <input type="datetime-local" name="ends_at" required />
            </label>
          </div>
          <p className="muted">Enter Singapore time (SGT). Each lesson must last 90–120 minutes.</p>
          <div className="form-actions">
            <Link className="button" href="/dashboard/lessons">
              Cancel
            </Link>
            <button className="button primary">Save lesson</button>
          </div>
        </SaveForm>
      )}
    </main>
  );
}
