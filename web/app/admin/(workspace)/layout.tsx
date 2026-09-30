import { requireAdministrator } from '@/lib/admin';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdministrator();
  return children;
}
