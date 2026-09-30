import { AdminPage } from '@/components/admin/page';
import type { AdminSearch } from '@/components/admin/console-ui';
export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<AdminSearch>;
}) {
  return (
    <AdminPage
      path={['classes', (await params).id]}
      search={await searchParams}
    />
  );
}
