import { safeOrigin, formText } from '@/lib/accounts';
import {
  LESSON_FILE_BUCKET,
  MAX_LESSON_FILE_BYTES,
  validateLessonFile,
} from '@/lib/lesson-files';
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
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_LESSON_FILE_BYTES + 256 * 1024) return finish();
    const form = await request.formData();
    const lessonId = formText(form, 'lesson_id').trim();
    const action = formText(form, 'action').trim();
    if (!isId(lessonId)) return finish();
    path = `/dashboard/lessons/${lessonId}`;

    const client = await supabaseServer();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return finish();
    const [{ data: account }, { data: lesson }] = await Promise.all([
      client.from('accounts').select('role,status').eq('id', user.id).single(),
      client.from('lessons').select('id,status').eq('id', lessonId).single(),
    ]);
    if (account?.status !== 'active' || !lesson) return finish();

    if (action === 'delete') {
      const fileId = formText(form, 'file_id').trim();
      if (!isId(fileId)) return finish();
      const { data: record } = await client
        .from('lesson_files')
        .select('id,storage_path')
        .eq('id', fileId)
        .eq('lesson_id', lessonId)
        .single();
      if (!record) return finish();
      const removed = await client.storage
        .from(LESSON_FILE_BUCKET)
        .remove([record.storage_path]);
      if (removed.error) return finish();
      const deleted = await client
        .from('lesson_files')
        .delete()
        .eq('id', record.id)
        .select('id')
        .single();
      return finish(!deleted.error && Boolean(deleted.data));
    }

    if (action !== 'upload' || lesson.status === 'cancelled') return finish();
    const kind = formText(form, 'kind');
    const teacher = account.role === 'teacher' || account.role === 'admin';
    if (
      (kind === 'material' && !teacher) ||
      (kind === 'submission' && account.role !== 'student')
    )
      return finish();
    if (!['material', 'submission'].includes(kind)) return finish();
    const file = form.get('file');
    if (!(file instanceof File)) return finish();
    const checked = validateLessonFile(file);
    const folder = kind === 'material' ? 'materials' : `submissions/${user.id}`;
    const storagePath = `${lessonId}/${folder}/${crypto.randomUUID()}.${checked.extension}`;
    const uploaded = await client.storage
      .from(LESSON_FILE_BUCKET)
      .upload(storagePath, file, {
        contentType: checked.mimeType,
        upsert: false,
      });
    if (uploaded.error) return finish();
    const inserted = await client
      .from('lesson_files')
      .insert({
        lesson_id: lessonId,
        kind,
        student_id: kind === 'submission' ? user.id : null,
        student_role: kind === 'submission' ? 'student' : null,
        storage_path: storagePath,
        file_name: checked.name,
        mime_type: checked.mimeType,
        size_bytes: file.size,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (inserted.error || !inserted.data) {
      await client.storage.from(LESSON_FILE_BUCKET).remove([storagePath]);
      return finish();
    }
    return finish(true);
  } catch {
    return finish();
  }
}
