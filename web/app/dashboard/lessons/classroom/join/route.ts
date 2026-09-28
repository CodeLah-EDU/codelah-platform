import { formText, safeOrigin } from '@/lib/accounts';
import {
  classroomWindow,
  createDailyToken,
  dailyConfigured,
} from '@/lib/daily';
import { isId } from '@/lib/lessons';
import { supabaseServer } from '@/lib/supabase/server';

function failed(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!safeOrigin(request)) return failed('Invalid request origin.', 403);
  try {
    const form = await request.formData();
    const lessonId = formText(form, 'lesson_id').trim();
    if (!isId(lessonId)) return failed('Invalid lesson.', 400);
    if (!dailyConfigured())
      return failed('The live classroom is not configured yet.', 503);

    const client = await supabaseServer();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return failed('Please sign in again.', 401);
    const [{ data: account }, { data: lesson }, { data: room }] =
      await Promise.all([
        client
          .from('accounts')
          .select('display_name,role,status')
          .eq('id', user.id)
          .single(),
        client
          .from('lessons')
          .select('id,starts_at,ends_at,status')
          .eq('id', lessonId)
          .single(),
        client
          .from('lesson_video_rooms')
          .select('room_name,room_url')
          .eq('lesson_id', lessonId)
          .single(),
      ]);
    if (
      account?.status !== 'active' ||
      !['admin', 'teacher', 'student'].includes(account?.role ?? '') ||
      !lesson ||
      !room
    )
      return failed('You do not have access to this classroom.', 403);
    if (lesson.status !== 'scheduled')
      return failed('This classroom is closed.', 409);
    const window = classroomWindow(lesson.starts_at, lesson.ends_at);
    if (window === 'early')
      return failed('The classroom opens 15 minutes before the lesson.', 409);
    if (window === 'closed') return failed('This classroom has closed.', 409);

    const owner = account.role === 'admin' || account.role === 'teacher';
    const token = await createDailyToken({
      roomName: room.room_name,
      userId: user.id,
      userName: account.display_name,
      owner,
      expiresAt:
        Math.floor(new Date(lesson.ends_at).getTime() / 1000) + 30 * 60,
    });
    return Response.json({ roomUrl: room.room_url, token });
  } catch {
    return failed('We could not open the classroom. Please try again.', 500);
  }
}
