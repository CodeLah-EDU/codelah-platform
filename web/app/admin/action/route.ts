import {
  formText,
  safeOrigin,
  passwordError,
  studentEmail,
} from '@/lib/accounts';
import {
  amountCents,
  validDate,
  expenseCategories,
} from '@/lib/admin-workspace';
import { isId, lessonTimes, scheduledLessonTimes } from '@/lib/lessons';
import { singaporeDay } from '@/lib/workspace';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const origin = safeOrigin(request);
  if (!origin)
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 32768)
      throw new Error('This request is too large.');
    const client = await supabaseServer();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return Response.json({ error: 'Sign in to continue.' }, { status: 401 });
    const { data: actor } = await client
      .from('accounts')
      .select('role,status')
      .eq('id', user.id)
      .single();
    if (actor?.role !== 'admin' || actor.status !== 'active')
      return Response.json(
        { error: 'Administrator access required.' },
        { status: 403 },
      );
    const form = await request.formData();
    const today = singaporeDay(new Date().toISOString());
    const text = (key: string, max = 2000) => {
      const value = formText(form, key).trim();
      if (value.length > max)
        throw new Error(`${key.replaceAll('_', ' ')} is too long.`);
      return value;
    };
    const required = (key: string, max = 200) => {
      const value = text(key, max);
      if (!value) throw new Error('Complete all required fields.');
      return value;
    };
    const id = (key: string) => {
      const value = text(key, 36);
      if (!isId(value)) throw new Error('Choose a valid record.');
      return value;
    };
    const date = (key: string) => {
      const value = required(key, 10);
      if (!validDate(value)) throw new Error('Choose a valid date.');
      return value;
    };
    const checked = async <T>(
      query: PromiseLike<{
        data: T;
        error: { code?: string; message: string } | null;
      }>,
    ) => {
      const result = await query;
      if (result.error)
        throw new Error(
          ['23514', 'P0001'].includes(result.error.code ?? '')
            ? result.error.message
            : result.error.code === '23503'
              ? 'This record has linked records. Remove its connections before changing the role.'
              : result.error.code === '23505'
                ? 'This record already exists.'
                : 'Could not save this change. Check your access and try again.',
        );
      if (
        result.data === null ||
        (Array.isArray(result.data) && !result.data.length)
      )
        throw new Error(
          'This record is no longer available. Refresh and try again.',
        );
      return result.data;
    };
    let resultId: string | undefined;
    let message: string | undefined;
    switch (text('action', 60)) {
      case 'account_save': {
        const target = id('id');
        const { data: previous } = await client
          .from('accounts')
          .select('role,contact_email')
          .eq('id', target)
          .single();
        const role = required('role'),
          status = required('status');
        if (
          !previous ||
          previous.role === 'admin' ||
          target === user.id ||
          !['student', 'parent', 'teacher', 'pending'].includes(role) ||
          !['active', 'pending', 'suspended'].includes(status)
        )
          throw new Error('This account cannot be changed here.');
        if ((previous.role === 'student') !== (role === 'student'))
          throw new Error('Student accounts keep their student role.');
        if (
          role !== 'student' &&
          status === 'active' &&
          (!previous.contact_email || role === 'pending')
        )
          throw new Error(
            'The adult must verify their email and have a role before activation.',
          );
        await checked(
          client
            .from('accounts')
            .update({
              display_name: required('display_name', 100),
              role,
              status,
            })
            .eq('id', target)
            .select('id')
            .single(),
        );
        break;
      }
      case 'create_student': {
        const password = formText(form, 'password');
        if (passwordError(password) || !studentEmail(text('username')))
          throw new Error(
            'Use a valid username and a password with 12–128 characters.',
          );
        const result = await client.functions.invoke('student-accounts', {
          body: {
            action: 'create_student',
            display_name: required('display_name', 100),
            username: text('username'),
            password,
          },
        });
        if (result.error || !result.data?.student_id)
          throw new Error(
            'Student could not be created. Check the username and try again.',
          );
        resultId = result.data.student_id;
        break;
      }
      case 'invite_adult': {
        const role = required('role'),
          email = required('email', 254).toLowerCase();
        if (
          !['parent', 'teacher'].includes(role) ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          email.endsWith('@students.codelah.invalid')
        )
          throw new Error('Choose an adult role and a valid email.');
        const result = await client.functions.invoke('student-accounts', {
          body: {
            action: 'invite_adult',
            display_name: required('display_name', 100),
            role,
            email,
          },
        });
        if (result.error || !result.data?.account_id)
          throw new Error(
            'Invitation could not be sent. Check whether the email already has an account and whether invitations are configured.',
          );
        resultId = result.data.account_id;
        if (result.data.needs_setup)
          message =
            'Invitation sent. Review the intended role on this account before activating it after email verification.';
        break;
      }
      case 'reset_password': {
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
          throw new Error('Password could not be changed. Try again.');
        break;
      }
      case 'class_save': {
        const values = {
          name: required('name', 100),
          active: text('active') === 'true',
        };
        const saved = text('id')
          ? await checked(
              client
                .from('classrooms')
                .update(values)
                .eq('id', id('id'))
                .select('id')
                .single(),
            )
          : await checked(
              client.from('classrooms').insert(values).select('id').single(),
            );
        resultId = saved.id;
        break;
      }
      case 'parent_link':
        await checked(
          client
            .from('parent_student_links')
            .upsert({
              parent_id: id('parent_id'),
              student_id: id('student_id'),
              active: text('active') === 'true',
            })
            .select('student_id')
            .single(),
        );
        break;
      case 'teacher':
        await checked(
          client
            .from('teacher_assignments')
            .upsert({
              classroom_id: id('classroom_id'),
              teacher_id: id('teacher_id'),
              active: text('active') === 'true',
            })
            .select('teacher_id')
            .single(),
        );
        break;
      case 'enrolment':
        await checked(
          client
            .from('enrolments')
            .upsert({
              classroom_id: id('classroom_id'),
              student_id: id('student_id'),
              active: text('active') === 'true',
            })
            .select('student_id')
            .single(),
        );
        break;
      case 'profile_save':
        await checked(
          client
            .from('student_profiles')
            .upsert({
              student_id: id('student_id'),
              school: text('school', 160),
              school_year: text('school_year', 100),
              phone: text('phone', 40),
              notes: text('notes', 5000),
            })
            .select('student_id')
            .single(),
        );
        break;
      case 'fee_save': {
        const status = required('status');
        if (!['paid', 'pending', 'waived'].includes(status))
          throw new Error('Choose a payment status.');
        const values = {
          student_id: id('student_id'),
          description: required('description'),
          amount_cents: amountCents(required('amount')),
          due_on: date('due_on'),
          status,
          paid_on: status === 'paid' ? date('paid_on') : null,
        };
        if (values.paid_on && values.paid_on > today)
          throw new Error('A received payment cannot be dated in the future.');
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
        break;
      }
      case 'fee_delete':
        await checked(
          client
            .from('student_payments')
            .delete()
            .eq('id', id('id'))
            .select('id')
            .single(),
        );
        break;
      case 'expense_save': {
        const category = required('category');
        if (!expenseCategories.includes(category))
          throw new Error('Choose an expense category.');
        const values = {
          description: required('description'),
          category,
          vendor: text('vendor', 160),
          amount_cents: amountCents(required('amount')),
          paid_on: date('paid_on'),
          reference: text('reference', 160),
          notes: text('notes'),
        };
        if (values.paid_on > today)
          throw new Error('A paid expense cannot be dated in the future.');
        await checked(
          text('id')
            ? client
                .from('admin_expenses')
                .update(values)
                .eq('id', id('id'))
                .select('id')
                .single()
            : client
                .from('admin_expenses')
                .insert(values)
                .select('id')
                .single(),
        );
        break;
      }
      case 'expense_delete':
        await checked(
          client
            .from('admin_expenses')
            .delete()
            .eq('id', id('id'))
            .select('id')
            .single(),
        );
        break;
      case 'lesson_save': {
        const status = required('status');
        if (!['scheduled', 'completed', 'cancelled'].includes(status))
          throw new Error('Choose a valid lesson status.');
        const values = {
          title: required('title', 160),
          objective: text('objective', 2000),
          ...lessonTimes(text('starts_at'), text('ends_at')),
          status,
        };
        if (text('id')) {
          await checked(
            client
              .from('lessons')
              .update(values)
              .eq('id', id('id'))
              .select('id')
              .single(),
          );
        } else {
          if (status !== 'scheduled')
            throw new Error('New lessons start as scheduled.');
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
        break;
      }
      case 'attendance_save': {
        const entries = JSON.parse(required('entries', 12000));
        if (!Array.isArray(entries) || entries.length < 1 || entries.length > 4)
          throw new Error('Choose up to four roster entries.');
        await checked(
          client.rpc('admin_save_attendance', {
            target: id('lesson_id'),
            entries,
          }),
        );
        break;
      }
      default:
        throw new Error('Unknown action.');
    }
    return Response.json(
      { ok: true, id: resultId, message },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not save. Please try again.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
