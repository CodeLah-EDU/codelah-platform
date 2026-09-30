import { notFound } from 'next/navigation';
import { adminWorkspaceData } from '@/lib/admin';
import { adminRouteValid } from '@/lib/admin-workspace';
import { requestTimestamp } from '@/lib/lessons';
import { AdminConsole } from './console';
import type { AdminSearch } from './console-ui';
export async function AdminPage({
  path = ['overview'],
  search = {},
}: {
  path?: string[];
  search?: AdminSearch;
}) {
  if (!adminRouteValid(path)) notFound();
  const data = await adminWorkspaceData();
  if (
    path[1] &&
    path[1] !== 'new' &&
    ['accounts', 'students', 'classes', 'attendance'].includes(path[0])
  ) {
    const records =
      path[0] === 'classes'
        ? data.classes
        : path[0] === 'attendance'
          ? data.lessons
          : data.people;
    const source =
      path[0] === 'classes'
        ? 'Classes'
        : path[0] === 'attendance'
          ? 'Lessons'
          : 'Accounts';
    if (
      !data.unavailable.includes(source) &&
      !records.some((record) => record.id === path[1])
    )
      notFound();
  }
  return (
    <AdminConsole
      data={data}
      path={path}
      search={search}
      now={requestTimestamp()}
    />
  );
}
