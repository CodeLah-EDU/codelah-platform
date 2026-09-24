"use client";
import { useState, type ReactNode, type FormEvent } from "react";
// Retain typed worksheet/feedback content if saving fails; native POST remains a fallback.
export function SaveForm({
  children,
  action = "/dashboard/lessons/update",
  className = "account-form",
  encType,
}: {
  children: ReactNode;
  action?: string;
  className?: string;
  encType?: "multipart/form-data";
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(action, { method: "POST", body: data });
      const target = new URL(response.url);
      if (!response.ok || !["saved", "created"].includes(target.searchParams.get("message") ?? ""))
        throw new Error("Save failed");
      window.location.assign(target.href);
    } catch {
      setError("We couldn’t save this. Your text is still here. Check the details and try again.");
      setSaving(false);
    }
  }
  return (
    <form action={action} method="post" encType={encType} onSubmit={submit} className={className} aria-busy={saving}>
      <fieldset disabled={saving}>{children}</fieldset>
      {saving && <p role="status">Saving…</p>}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
