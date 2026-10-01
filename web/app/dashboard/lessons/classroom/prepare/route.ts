import { formText, safeOrigin } from '@/lib/accounts';
import { dailyConfigured } from '@/lib/daily';
import { isId } from '@/lib/lessons';
import { openLessonRoom } from '@/lib/supabase/classroom';
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

    await openLessonRoom(client, user.id, lesson);
    return finish(true);
  } catch {
    return finish();
  }
}
