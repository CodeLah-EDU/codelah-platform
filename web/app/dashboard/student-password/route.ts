import { studentAction } from '@/lib/supabase/student-action';
export async function POST(request: Request) {
  return studentAction(request, 'reset_password');
}
