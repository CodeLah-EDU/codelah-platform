import { notFound } from 'next/navigation';
import { AdminConsole } from '@/components/admin/console';
import type { AdminSearch } from '@/components/admin/console-ui';
import { adminPreview } from '@/lib/admin-preview';
import { adminRouteValid } from '@/lib/admin-workspace';
import { requestTimestamp } from '@/lib/lessons';
export const dynamic = 'force-dynamic';
export default async function AdminPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<AdminSearch>;
}) {
  const { path = ['overview'] } = await params;
  if (!adminRouteValid(path)) notFound();
  const now = requestTimestamp();
  return (
    <AdminConsole
      data={adminPreview(now)}
      path={path}
      search={await searchParams}
      now={now}
      preview
    />
  );
}
