import { safeOrigin, formText } from "@/lib/accounts";
import { isId, lessonTimes } from "@/lib/lessons";
import { supabaseServer } from "@/lib/supabase/server";
export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response("Invalid request origin", { status: 403 });
  const fail = () => Response.redirect(`${origin}/dashboard/lessons/new?message=failed`, 303);
  try {
    const form = await request.formData();
    const classroom_id = formText(form, "classroom_id").trim();
    const title = formText(form, "title").trim(),
      objective = formText(form, "objective").trim();
    if (!isId(classroom_id) || !title || title.length > 160 || objective.length > 2000)
      return fail();
    const times = lessonTimes(formText(form, "starts_at"), formText(form, "ends_at"));
    const client = await supabaseServer();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return fail();
    const { data: account } = await client
      .from("accounts")
      .select("role,status")
      .eq("id", user.id)
      .single();
    if (account?.status !== "active" || !["teacher", "admin"].includes(account.role)) return fail();
    const { data: classroom } = await client
      .from("classrooms")
      .select("id")
      .eq("id", classroom_id)
      .eq("active", true)
      .single();
    if (!classroom) return fail();
    const { data, error } = await client
      .from("lessons")
      .insert({ classroom_id, title, objective, ...times, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return fail();
    return Response.redirect(`${origin}/dashboard/lessons/${data.id}?message=created`, 303);
  } catch {
    return fail();
  }
}
