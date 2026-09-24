import { safeOrigin, formText } from "@/lib/accounts";
import { isId, resourceLink } from "@/lib/lessons";
import { supabaseServer } from "@/lib/supabase/server";
export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response("Invalid request origin", { status: 403 });
  let path = "/dashboard/lessons";
  const finish = (saved = false) =>
    Response.redirect(`${origin}${path}?message=${saved ? "saved" : "failed"}`, 303);
  try {
    const form = await request.formData();
    const text = (name: string, max = 10000) => {
      const value = formText(form, name).trim();
      if (value.length > max) throw new Error("Value too long");
      return value;
    };
    const lesson_id = text("lesson_id", 36),
      action = text("action", 30);
    if (!isId(lesson_id)) return finish();
    path = `/dashboard/lessons/${lesson_id}`;
    const client = await supabaseServer();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return finish();
    const { data: account } = await client
      .from("accounts")
      .select("role,status")
      .eq("id", user.id)
      .single();
    if (account?.status !== "active") return finish();
    const { data: lesson } = await client
      .from("lessons")
      .select("id,status")
      .eq("id", lesson_id)
      .single();
    if (!lesson) return finish();
    if (action === "submission") {
      const response = text("response");
      if (account.role !== "student" || !response || lesson.status === "cancelled") return finish();
      const result = await client
        .from("lesson_submissions")
        .upsert(
          { lesson_id, student_id: user.id, response },
          { onConflict: "lesson_id,student_id" },
        )
        .select("id")
        .single();
      return finish(!result.error && Boolean(result.data));
    }
    if (!["admin", "teacher"].includes(account.role)) return finish();
    if (action === "material") {
      const title = text("title", 160);
      if (!title) return finish();
      const result = await client
        .from("lesson_materials")
        .insert({
          lesson_id,
          title,
          instructions: text("instructions", 5000),
          resource_url: resourceLink(text("resource_url", 2000)),
          created_by: user.id,
        })
        .select("id")
        .single();
      return finish(!result.error && Boolean(result.data));
    }
    if (action === "remove_material") {
      const id = text("material_id", 36);
      if (!isId(id)) return finish();
      const result = await client
        .from("lesson_materials")
        .delete()
        .eq("id", id)
        .eq("lesson_id", lesson_id)
        .select("id")
        .single();
      return finish(!result.error && Boolean(result.data));
    }
    if (action === "lesson_status") {
      const status = text("status", 20);
      if (!["scheduled", "completed", "cancelled"].includes(status)) return finish();
      const result = await client
        .from("lessons")
        .update({ status })
        .eq("id", lesson_id)
        .select("id")
        .single();
      return finish(!result.error && Boolean(result.data));
    }
    const student_id = text("student_id", 36);
    if (!isId(student_id)) return finish();
    if (action === "attendance") {
      const status = text("status", 20);
      if (!["present", "late", "absent", "excused", "unmarked"].includes(status)) return finish();
      const result = await client
        .from("lesson_attendance")
        .upsert(
          {
            lesson_id,
            student_id,
            status,
            note: text("attendance_note", 1000),
            updated_by: user.id,
          },
          { onConflict: "lesson_id,student_id" },
        )
        .select("student_id")
        .single();
      return finish(!result.error && Boolean(result.data));
    }
    if (action === "feedback") {
      const status = text("status", 20),
        note = text("note", 5000);
      if (!["draft", "published"].includes(status) || (status === "published" && !note))
        return finish();
      const result = await client
        .from("lesson_feedback")
        .upsert(
          {
            lesson_id,
            student_id,
            topics: text("topics", 2000),
            note,
            practice: text("practice", 2000),
            status,
            updated_by: user.id,
          },
          { onConflict: "lesson_id,student_id" },
        )
        .select("id")
        .single();
      return finish(!result.error && Boolean(result.data));
    }
    if (action === "review") {
      const result = await client
        .from("lesson_submissions")
        .update({ teacher_note: text("teacher_note", 5000) })
        .eq("lesson_id", lesson_id)
        .eq("student_id", student_id)
        .select("id")
        .single();
      return finish(!result.error && Boolean(result.data));
    }
    return finish();
  } catch {
    return finish();
  }
}
