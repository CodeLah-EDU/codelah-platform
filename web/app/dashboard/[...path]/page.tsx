import { notFound, redirect } from 'next/navigation';
import { currentAccount } from '@/lib/supabase/access';
import { loadWorkspace } from '@/lib/supabase/workspace';
import { sections } from '@/lib/workspace';
import { Workspace } from '@/components/workspace/workspace';
import { requestTimestamp } from '@/lib/lessons';
export const dynamic = 'force-dynamic';
export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ child?: string }>;
}) {
  const { client, account } = await currentAccount();
  if (!account || account.status !== 'active' || account.role === 'pending')
    redirect('/dashboard');
  if (account.role === 'admin') redirect('/admin');
  const { path } = await params;
  const { child } = await searchParams;
  if (!sections[account.role].includes(path[0]) || path.length > 3) notFound();
  if (
    path.length > (path[0] === 'students' ? 3 : path[0] === 'calendar' ? 2 : 1)
  )
    notFound();
  if (
    path[0] === 'students' &&
    path[2] &&
    ![
      'overview',
      'calendar',
      'timeline',
      'objectives',
      ...(account.role === 'teacher' ? ['worksheets'] : []),
    ].includes(path[2])
  )
    notFound();
  const { data, failed } = await loadWorkspace(client, account);
  if (
    path[0] === 'students' &&
    path[1] &&
    !data.people.some((p) => p.id === path[1] && p.role === 'student')
  )
    notFound();
  if (
    path[0] === 'calendar' &&
    path[1] &&
    !data.lessons.some((l) => l.id === path[1])
  )
    notFound();
  return (
    <Workspace
      data={data}
      path={path}
      childId={child}
      failed={failed}
      now={requestTimestamp()}
    />
  );
}
