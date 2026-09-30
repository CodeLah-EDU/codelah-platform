import { AdminPage } from '@/components/admin/page';
import type { AdminSearch } from '@/components/admin/console-ui';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AdminSearch>;
}) {
  return <AdminPage path={['classes', 'new']} search={await searchParams} />;
}
