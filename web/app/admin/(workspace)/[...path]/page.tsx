import { AdminPage } from '@/components/admin/page';
import type { AdminSearch } from '@/components/admin/console-ui';
export default async function Administration({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<AdminSearch>;
}) {
  return <AdminPage path={(await params).path} search={await searchParams} />;
}
