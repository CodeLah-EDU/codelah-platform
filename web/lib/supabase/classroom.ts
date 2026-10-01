import type { SupabaseClient } from '@supabase/supabase-js';
import { createDailyRoom, deleteDailyRoom } from '@/lib/daily';

// Creates the lesson's private Daily room and records it. Row-level security only
// lets the lesson's teacher or an administrator insert the record.
export async function openLessonRoom(
  client: SupabaseClient,
  userId: string,
  lesson: { id: string; starts_at: string; ends_at: string },
) {
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
      created_by: userId,
    })
    .select('room_name,room_url')
    .single();
  if (inserted.error || !inserted.data) {
    await deleteDailyRoom(room.name).catch(() => undefined);
    throw new Error('The classroom could not be recorded.');
  }
  return inserted.data as { room_name: string; room_url: string };
}
