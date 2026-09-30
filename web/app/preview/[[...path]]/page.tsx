import { notFound } from 'next/navigation';
import { Workspace } from '@/components/workspace/workspace';
import { workspacePreview } from '@/lib/workspace-preview';
import { sections } from '@/lib/workspace';
import { requestTimestamp } from '@/lib/lessons';
export const dynamic = 'force-dynamic';
export default async function Preview({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<{ child?: string }>;
}) {
  const { path = ['student', 'home'] } = await params;
  const { child } = await searchParams;
  const role = path[0] as 'student' | 'teacher' | 'parent';
  if (!['student', 'teacher', 'parent'].includes(role)) notFound();
  const route = path.slice(1).length ? path.slice(1) : ['home'];
  if (!sections[role].includes(route[0])) notFound();
  const now = requestTimestamp();
  return (
    <Workspace
      key={`${role}-${child || ''}`}
      data={workspacePreview(role, now)}
      path={route}
      childId={child}
      preview
      now={now}
    />
  );
}
