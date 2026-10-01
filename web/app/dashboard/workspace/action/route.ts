import { formText, passwordError, safeOrigin } from '@/lib/accounts';
import { isId, lessonTimes, scheduledLessonTimes } from '@/lib/lessons';
import { cleanTags } from '@/lib/workspace';
import { validateLessonFile, MAX_LESSON_FILE_BYTES } from '@/lib/lesson-files';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!safeOrigin(request))
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    if (
      Number(request.headers.get('content-length') || 0) >
      MAX_LESSON_FILE_BYTES + 256 * 1024
    )
      throw new Error('Files must be 10 MB or smaller.');
    const form = await request.formData();
    const text = (key: string, max = 5000) => {
      const value = formText(form, key).trim();
      if (value.length > max)
        throw new Error(`${key.replaceAll('_', ' ')} is too long.`);
      return value;
    };
    const id = (key: string) => {
      const value = text(key, 36);
      if (!isId(value)) throw new Error('Choose a valid record.');
      return value;
    };
    const optionalId = (key: string) => (text(key) ? id(key) : null);
    const required = (key: string, max = 160) => {
      const value = text(key, max);
      if (!value) throw new Error('Complete all required fields.');
      return value;
    };
    const action = text('action', 60);
    const client = await supabaseServer();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return Response.json({ error: 'Sign in to continue.' }, { status: 401 });
    const { data: account } = await client
      .from('accounts')
      .select('role,status')
      .eq('id', user.id)
      .single();
    if (account?.status !== 'active')
      return Response.json(
        { error: 'Your account is not active.' },
        { status: 403 },
      );
    if (action === 'student_password') {
      if (account.role !== 'parent')
        return Response.json(
          { error: 'You cannot change this record.' },
          { status: 403 },
        );
      // Not trimmed: spaces are allowed in passwords.
      const password = formText(form, 'password');
      if (passwordError(password))
        throw new Error('Use a password with 12–128 characters.');
      const result = await client.functions.invoke('student-accounts', {
        body: {
          action: 'reset_password',
          student_id: id('student_id'),
          password,
        },
      });
      if (result.error)
        throw new Error('The password could not be changed. Try again.');
      return Response.json(
        { ok: true },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const teacher = ['teacher', 'admin'].includes(account.role);
    const studentActions = [
      'comment_save',
      'comment_delete',
      'file_upload',
      'file_delete',
    ];
    if (
      !teacher &&
      !(account.role === 'student' && studentActions.includes(action))
    )
      return Response.json(
        { error: 'You cannot change this record.' },
        { status: 403 },
      );
    const checked = async <T>(
      query: PromiseLike<{
        data: T;
        error: { message: string; code?: string } | null;
      }>,
    ) => {
      const result = await query;
      if (result.error) {
        const safe =
          result.error.code === '23514' || result.error.code === 'P0001';
        throw new Error(
          safe
            ? result.error.message
            : result.error.code === '23505'
              ? 'This record already exists.'
              : 'The change could not be saved. Check your access and try again.',
        );
      }
      if (
        !result.data ||
        (Array.isArray(result.data) && result.data.length === 0)
      )
        throw new Error(
          'This record is no longer available, or you cannot change it.',
        );
      return result.data;
    };
    let resultId: string | undefined;
    if (action === 'lesson_save') {
      const values = {
        title: required('title'),
        objective: text('objective', 2000),
        ...lessonTimes(text('starts_at'), text('ends_at')),
        status: text('status') || 'scheduled',
      };
      if (!['scheduled', 'completed', 'cancelled'].includes(values.status))
        throw new Error('Choose a valid class status.');
      if (text('id'))
        await checked(
          client
            .from('lessons')
            .update(values)
            .eq('id', id('id'))
            .select('id')
            .single(),
        );
      else {
        if (values.status !== 'scheduled')
          throw new Error('New classes start as scheduled.');
        scheduledLessonTimes(text('starts_at'), text('ends_at'));
        const saved = await checked(
          client
            .from('lessons')
            .insert({
              ...values,
              classroom_id: id('classroom_id'),
              created_by: user.id,
            })
            .select('id')
            .single(),
        );
        resultId = saved.id;
      }
    } else if (action === 'lesson_delete') {
      // Do not orphan private objects. Lessons with uploaded work must be retained/cancelled.
      const lessonId = id('id');
      const { count, error } = await client
        .from('lesson_files')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_id', lessonId);
      if (error || count)
        throw new Error(
          'This class has saved files. Cancel it to preserve student work.',
        );
      await checked(
        client
          .from('lessons')
          .delete()
          .eq('id', lessonId)
          .select('id')
          .single(),
      );
    } else if (action === 'roster_add') {
      await checked(
        client
          .from('lesson_roster')
          .insert({ lesson_id: id('lesson_id'), student_id: id('student_id') })
          .select('student_id')
          .single(),
      );
    } else if (action === 'roster_remove') {
      await checked(
        client
          .from('lesson_roster')
          .delete()
          .eq('lesson_id', id('lesson_id'))
          .eq('student_id', id('student_id'))
          .select('student_id')
          .single(),
      );
    } else if (action === 'worksheet_save') {
      const worksheetId = text('id') ? id('id') : crypto.randomUUID();
      const values = {
        title: required('title'),
        description: text('description', 2000),
        tags: cleanTags(text('tags', 500)),
        visibility: required('visibility'),
        course_id: optionalId('course_id'),
        level_id: optionalId('level_id'),
      };
      if (!['unlocked', 'locked', 'restricted'].includes(values.visibility))
        throw new Error('Choose a visibility setting.');
      if (values.level_id) {
        const level = await checked(
          client
            .from('course_levels')
            .select('course_id')
            .eq('id', values.level_id)
            .single(),
        );
        if (level.course_id !== values.course_id)
          throw new Error('Choose a level in the selected course.');
      }
      const file = form.get('file');
      if (!text('id') && (!(file instanceof File) || !file.size))
        throw new Error('Choose a worksheet file.');
      const fileInfo =
        file instanceof File && file.size ? validateLessonFile(file) : null;
      if (text('id'))
        await checked(
          client
            .from('worksheets')
            .update(values)
            .eq('id', worksheetId)
            .select('id')
            .single(),
        );
      else
        await checked(
          client
            .from('worksheets')
            .insert({ id: worksheetId, ...values })
            .select('id')
            .single(),
        );
      if (fileInfo && file instanceof File) {
        const storagePath = `${worksheetId}/${crypto.randomUUID()}.${fileInfo.extension}`;
        const { data: old } = await client
          .from('worksheet_assets')
          .select('storage_path')
          .eq('worksheet_id', worksheetId)
          .maybeSingle();
        const uploaded = await client.storage
          .from('worksheet-library')
          .upload(storagePath, file, { contentType: fileInfo.mimeType });
        if (uploaded.error) {
          if (!text('id'))
            await client.from('worksheets').delete().eq('id', worksheetId);
          throw new Error('The file upload failed. Please try again.');
        }
        try {
          await checked(
            client
              .from('worksheet_assets')
              .upsert({
                worksheet_id: worksheetId,
                storage_path: storagePath,
                file_name: fileInfo.name,
                mime_type: fileInfo.mimeType,
                size_bytes: file.size,
              })
              .select('worksheet_id')
              .single(),
          );
        } catch (error) {
          await client.storage.from('worksheet-library').remove([storagePath]);
          if (!text('id'))
            await client.from('worksheets').delete().eq('id', worksheetId);
          throw error;
        }
        if (old)
          await client.storage
            .from('worksheet-library')
            .remove([old.storage_path]);
      }
      resultId = worksheetId;
    } else if (action === 'worksheet_delete') {
      const worksheetId = id('id');
      const { data: asset, error } = await client
        .from('worksheet_assets')
        .select('storage_path')
        .eq('worksheet_id', worksheetId)
        .maybeSingle();
      if (error) throw new Error('Could not read the worksheet.');
      if (asset) {
        const removed = await client.storage
          .from('worksheet-library')
          .remove([asset.storage_path]);
        if (removed.error)
          throw new Error('Could not remove the file. Please retry.');
      }
      await checked(
        client
          .from('worksheets')
          .delete()
          .eq('id', worksheetId)
          .select('id')
          .single(),
      );
    } else if (action === 'worksheet_unlock') {
      await checked(
        client
          .from('worksheet_assignments')
          .upsert({
            worksheet_id: id('worksheet_id'),
            student_id: id('student_id'),
          })
          .select('worksheet_id')
          .single(),
      );
    } else if (action === 'worksheet_revoke') {
      await checked(
        client
          .from('worksheet_assignments')
          .delete()
          .eq('worksheet_id', id('worksheet_id'))
          .eq('student_id', id('student_id'))
          .select('worksheet_id')
          .single(),
      );
    } else if (action === 'course_assign') {
      await checked(
        client
          .from('student_courses')
          .upsert({ student_id: id('student_id'), course_id: id('course_id') })
          .select('course_id')
          .single(),
      );
    } else if (action === 'course_remove') {
      await checked(
        client
          .from('student_courses')
          .delete()
          .eq('student_id', id('student_id'))
          .eq('course_id', id('course_id'))
          .select('course_id')
          .single(),
      );
    } else if (action === 'objective_complete') {
      await checked(
        client
          .from('objective_progress')
          .upsert({
            student_id: id('student_id'),
            objective_id: id('objective_id'),
          })
          .select('objective_id')
          .single(),
      );
    } else if (action === 'objective_reset') {
      await checked(
        client
          .from('objective_progress')
          .delete()
          .eq('student_id', id('student_id'))
          .eq('objective_id', id('objective_id'))
          .select('objective_id')
          .single(),
      );
    } else if (
      [
        'course_save',
        'level_save',
        'objective_save',
        'course_delete',
        'level_delete',
        'objective_delete',
      ].includes(action)
    ) {
      const table = action.startsWith('course_')
        ? 'courses'
        : action.startsWith('level_')
          ? 'course_levels'
          : 'course_objectives';
      if (action.endsWith('_delete'))
        await checked(
          client.from(table).delete().eq('id', id('id')).select('id').single(),
        );
      else {
        const position = Number(text('position') || 1);
        if (!Number.isInteger(position) || position < 1 || position > 100)
          throw new Error('Position must be between 1 and 100.');
        const values: {
          name?: string;
          description?: string;
          course_id?: string;
          position?: number;
          title?: string;
          level_id?: string;
        } =
          table === 'courses'
            ? {
                name: required('name', 100),
                description: text('description', 2000),
              }
            : table === 'course_levels'
              ? {
                  name: required('name', 100),
                  course_id: id('course_id'),
                  position,
                }
              : {
                  title: required('title', 500),
                  level_id: id('level_id'),
                  position,
                };
        if (text('id'))
          await checked(
            client
              .from(table)
              .update(values)
              .eq('id', id('id'))
              .select('id')
              .single(),
          );
        else
          await checked(
            client
              .from(table)
              .insert({ ...values })
              .select('id')
              .single(),
          );
      }
    } else if (action === 'profile_save') {
      const student = id('student_id');
      // Profile rows cannot alter roles, credentials, family links, or verified email.
      await checked(
        client
          .from('student_profiles')
          .upsert({
            student_id: student,
            school: text('school', 200),
            school_year: text('school_year', 100),
            phone: text('phone', 40),
            notes: text('notes'),
          })
          .select('student_id')
          .single(),
      );
      const renamed = await client.rpc('update_student_name', {
        student,
        full_name: required('display_name', 100),
      });
      if (renamed.error)
        throw new Error(
          'Profile details saved, but the name could not be updated.',
        );
    } else if (action === 'profile_delete') {
      await checked(
        client
          .from('student_profiles')
          .delete()
          .eq('student_id', id('student_id'))
          .select('student_id')
          .single(),
      );
    } else if (action === 'payment_save') {
      const amount = Number(text('amount'));
      if (
        !/^\d+(\.\d{1,2})?$/.test(text('amount')) ||
        amount < 0 ||
        amount > 1000000
      )
        throw new Error(
          'Enter a valid SGD amount with up to two decimal places.',
        );
      const status = required('status');
      const due = required('due_on');
      if (
        !['paid', 'pending', 'waived'].includes(status) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(due)
      )
        throw new Error('Choose a valid payment status and date.');
      const values = {
        student_id: id('student_id'),
        description: required('description', 200),
        amount_cents: Math.round(amount * 100),
        due_on: due,
        status,
        paid_on: status === 'paid' ? required('paid_on') : null,
      };
      await checked(
        text('id')
          ? client
              .from('student_payments')
              .update(values)
              .eq('id', id('id'))
              .select('id')
              .single()
          : client
              .from('student_payments')
              .insert(values)
              .select('id')
              .single(),
      );
    } else if (action === 'payment_delete') {
      await checked(
        client
          .from('student_payments')
          .delete()
          .eq('id', id('id'))
          .select('id')
          .single(),
      );
    } else if (action === 'attendance_save') {
      const status = required('status');
      if (
        !['present', 'late', 'absent', 'excused', 'unmarked'].includes(status)
      )
        throw new Error('Choose an attendance status.');
      await checked(
        client
          .from('lesson_attendance')
          .upsert({
            lesson_id: id('lesson_id'),
            student_id: id('student_id'),
            status,
            note: text('note', 1000),
            updated_by: user.id,
          })
          .select('student_id')
          .single(),
      );
    } else if (action === 'attendance_delete') {
      await checked(
        client
          .from('lesson_attendance')
          .delete()
          .eq('lesson_id', id('lesson_id'))
          .eq('student_id', id('student_id'))
          .select('student_id')
          .single(),
      );
    } else if (action === 'feedback_save') {
      const status = required('status');
      if (!['draft', 'published'].includes(status))
        throw new Error('Choose draft or published.');
      await checked(
        client
          .from('lesson_feedback')
          .upsert({
            lesson_id: id('lesson_id'),
            student_id: id('student_id'),
            topics: text('topics', 2000),
            note: required('note', 5000),
            practice: text('practice', 2000),
            status,
            updated_by: user.id,
          })
          .select('id')
          .single(),
      );
    } else if (action === 'feedback_delete') {
      await checked(
        client
          .from('lesson_feedback')
          .delete()
          .eq('lesson_id', id('lesson_id'))
          .eq('student_id', id('student_id'))
          .select('id')
          .single(),
      );
    } else if (action === 'comment_save') {
      if (account.role !== 'student')
        throw new Error('Only students can write their own reflections.');
      const values = {
        lesson_id: id('lesson_id'),
        student_id: user.id,
        body: required('body', 5000),
      };
      await checked(
        text('id')
          ? client
              .from('lesson_comments')
              .update(values)
              .eq('id', id('id'))
              .select('id')
              .single()
          : client.from('lesson_comments').insert(values).select('id').single(),
      );
    } else if (action === 'comment_delete') {
      await checked(
        client
          .from('lesson_comments')
          .delete()
          .eq('id', id('id'))
          .select('id')
          .single(),
      );
    } else if (action === 'file_upload') {
      const lessonId = id('lesson_id');
      const lesson = await checked(
        client.from('lessons').select('status').eq('id', lessonId).single(),
      );
      if (lesson.status === 'cancelled')
        throw new Error('Uploads are closed for cancelled classes.');
      const file = form.get('file');
      if (!(file instanceof File)) throw new Error('Choose a file.');
      const info = validateLessonFile(file);
      const kind = teacher ? 'material' : 'submission';
      const path = `${lessonId}/${teacher ? 'materials' : `submissions/${user.id}`}/${crypto.randomUUID()}.${info.extension}`;
      const uploaded = await client.storage
        .from('lesson-files')
        .upload(path, file, { contentType: info.mimeType });
      if (uploaded.error)
        throw new Error('File upload failed. Please try again.');
      try {
        await checked(
          client
            .from('lesson_files')
            .insert({
              lesson_id: lessonId,
              kind,
              student_id: teacher ? null : user.id,
              student_role: teacher ? null : 'student',
              storage_path: path,
              file_name: info.name,
              mime_type: info.mimeType,
              size_bytes: file.size,
              created_by: user.id,
            })
            .select('id')
            .single(),
        );
      } catch (error) {
        await client.storage.from('lesson-files').remove([path]);
        throw error;
      }
    } else if (action === 'file_delete') {
      const record = await checked(
        client
          .from('lesson_files')
          .select('id,storage_path,student_id,kind')
          .eq('id', id('id'))
          .single(),
      );
      if (
        !teacher &&
        (record.student_id !== user.id || record.kind !== 'submission')
      )
        throw new Error('You can only remove your own files.');
      const removed = await client.storage
        .from('lesson-files')
        .remove([record.storage_path]);
      if (removed.error) throw new Error('The file could not be removed.');
      await checked(
        client
          .from('lesson_files')
          .delete()
          .eq('id', record.id)
          .select('id')
          .single(),
      );
    } else throw new Error('Unknown action.');
    return Response.json(
      { ok: true, id: resultId },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'The change could not be saved.',
      },
      { status: 400 },
    );
  }
}
