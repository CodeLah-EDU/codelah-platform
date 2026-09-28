import { formText, safeOrigin } from '@/lib/accounts';
import { createDailyRoom, dailyConfigured, deleteDailyRoom } from '@/lib/daily';
import { isId } from '@/lib/lessons';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin) return new Response('Invalid request origin', { status: 403 });
  let path = '/dashboard/lessons';
  const finish = (saved = false) =>
    Response.redirect(
      `${origin}${path}?message=${saved ? 'saved' : 'failed'}`,
      303,
    );
  try {
    const form = await request.formData();
    const lessonId = formText(form, 'lesson_id').trim();
    if (!isId(lessonId)) return finish();
    path = `/dashboard/lessons/${lessonId}`;
    if (!dailyConfigured()) return finish();

    const client = await supabaseServer();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return finish();
    const [{ data: account }, { data: lesson }, { data: existing }] =
      await Promise.all([
        client
          .from('accounts')
          .select('role,status')
          .eq('id', user.id)
          .single(),
        client
          .from('lessons')
          .select('id,starts_at,ends_at,status')
          .eq('id', lessonId)
          .single(),
        client
          .from('lesson_video_rooms')
          .select('lesson_id')
          .eq('lesson_id', lessonId)
          .maybeSingle(),
      ]);
    if (
      account?.status !== 'active' ||
      !['admin', 'teacher'].includes(account?.role ?? '') ||
      !lesson ||
      lesson.status !== 'scheduled'
    )
      return finish();
    if (existing) return finish(true);

    const room = await createDailyRoom(
      lesson.id,
      lesson.starts_at,
      lesson.ends_at,
    );
    const inserted = await client
      .from('lesson_video_rooms')
      .insert({
        lesson_id: lesson.id,
        provider: 'daily',
        room_name: room.name,
        room_url: room.url,
        created_by: user.id,
      })
      .select('lesson_id')
      .single();
    if (inserted.error || !inserted.data) {
      await deleteDailyRoom(room.name).catch(() => undefined);
      return finish();
    }
    return finish(true);
  } catch {
    return finish();
  }
}
