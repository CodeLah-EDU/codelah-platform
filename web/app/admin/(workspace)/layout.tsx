import Link from 'next/link';
import { requireAdministrator } from '@/lib/admin';
import { AdminNavigation } from '@/components/admin/navigation';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account } = await requireAdministrator();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="wordmark" href="/admin">
          CodeLah<span>_</span>
        </Link>
        <p className="admin-sidebar-label">ADMIN WORKSPACE</p>
        <AdminNavigation />
        <div className="admin-sidebar-footer">
          <span>{account?.display_name}</span>
          <Link href="/auth/password">Change password</Link>
          <form action="/auth/logout" method="post">
            <button>Sign out</button>
          </form>
        </div>
      </aside>
      <main id="main" className="account-shell admin-main">
        {children}
      </main>
    </div>
  );
}
