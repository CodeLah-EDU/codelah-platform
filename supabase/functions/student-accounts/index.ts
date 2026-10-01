import { createClient } from "npm:@supabase/supabase-js@2.116.0";

// Called by CodeLah's server with the user's JWT. The gateway also verifies JWTs.
// Service credentials are supplied by Supabase, never by the web app or caller.
Deno.serve(async (request: Request) => {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (Number(request.headers.get("content-length") ?? 0) > 4096)
    return reply({ error: "Request too large" }, 413);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authorization = request.headers.get("authorization") ?? "";
  const client = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user) return reply({ error: "Sign in required" }, 401);
    const { data: actor, error: actorError } = await client
      .from("accounts")
      .select("role,status")
      .eq("id", user.id)
      .single();
    if (
      actorError ||
      actor?.status !== "active" ||
      !["admin", "parent", "teacher"].includes(actor.role)
    )
      return reply({ error: "Access denied" }, 403);
    const raw = await request.text();
    if (raw.length > 4096) return reply({ error: "Request too large" }, 413);
    const body = JSON.parse(raw);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (body.action === "invite_adult") {
      if (actor.role !== "admin") return reply({ error: "Access denied" }, 403);
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const name = typeof body.display_name === "string" ? body.display_name.trim() : "";
      if (
        !["parent", "teacher"].includes(body.role) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        email.endsWith("@students.codelah.invalid") ||
        name.length < 1 ||
        name.length > 100
      )
        return reply({ error: "Check the name, role, and email." }, 400);
      // Invitation destinations come from deployment configuration, never the caller.
      const configuredOrigin = Deno.env.get("CODELAH_APP_ORIGIN");
      if (!configuredOrigin) return reply({ error: "Adult invitations are not configured." }, 503);
      const redirect = new URL("/auth/confirm", configuredOrigin);
      if (
        redirect.protocol !== "https:" &&
        !(redirect.protocol === "http:" && redirect.hostname === "localhost")
      )
        return reply({ error: "Invitation destination is invalid." }, 503);
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        email,
        { redirectTo: redirect.href },
      );
      if (inviteError || !invited.user)
        return reply(
          { error: "Invitation could not be sent. The email may already have an account." },
          400,
        );
      const { data: profile, error: profileError } = await admin
        .from("accounts")
        .update({ role: body.role, status: "pending", display_name: name })
        .eq("id", invited.user.id)
        .eq("role", "pending")
        .select("id")
        .maybeSingle();
      // The email has already been sent. Leave the account pending for manual setup if needed.
      return reply({
        ok: true,
        account_id: invited.user.id,
        needs_setup: Boolean(profileError) || !profile,
      });
    }
    const password = body.password;
    if (typeof password !== "string" || password.length < 12 || password.length > 128)
      return reply({ error: "Use a password with 12–128 characters." }, 400);
    if (body.action === "reset_password") {
      // Parents reset their own children's passwords; teachers ask an administrator.
      if (!["admin", "parent"].includes(actor.role)) return reply({ error: "Access denied" }, 403);
      if (typeof body.student_id !== "string") return reply({ error: "Invalid student" }, 400);
      const { data: allowed, error } = await client.rpc("can_manage_student", {
        target: body.student_id,
      });
      if (error || !allowed) return reply({ error: "Access denied" }, 403);
      const { error: updateError } = await admin.auth.admin.updateUserById(body.student_id, {
        password,
      });
      if (updateError)
        return reply({ error: "Password could not be changed. Please try again." }, 400);
      // Shown to administrators. The password has already changed, so a failed log is not an error.
      await admin.from("student_password_changes").insert({
        student_id: body.student_id,
        changed_by: user.id,
        changed_by_role: actor.role,
      });
      return reply({ ok: true });
    }
    if (body.action === "create_student") {
      if (actor.role !== "admin") return reply({ error: "Access denied" }, 403);
      const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
      const name = typeof body.display_name === "string" ? body.display_name.trim() : "";
      if (!/^[a-z][a-z0-9_]{3,23}$/.test(username) || name.length < 1 || name.length > 100)
        return reply({ error: "Check the student name and username." }, 400);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: `${username}@students.codelah.invalid`,
        password,
        email_confirm: true,
      });
      if (createError || !created.user)
        return reply({ error: "Student could not be created. Try another username." }, 400);
      const studentId = created.user.id;
      const { error: profileError } = await admin
        .from("accounts")
        .update({ role: "student", status: "active", display_name: name })
        .eq("id", studentId);
      const { error: usernameError } = profileError
        ? { error: profileError }
        : await admin.from("student_usernames").insert({ student_id: studentId, username });
      if (profileError || usernameError) {
        // Compensate only the identity created by this request, never an existing user.
        await admin.auth.admin.deleteUser(studentId);
        return reply({ error: "Student setup failed. Please try again." }, 500);
      }
      return reply({ ok: true, student_id: studentId });
    }
    return reply({ error: "Unknown action" }, 400);
  } catch {
    return reply({ error: "Request could not be completed." }, 400);
  }
});
