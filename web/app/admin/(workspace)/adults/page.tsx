import { adminData } from '@/lib/admin';
import {
  AdminHeading,
  AdminNotice,
  Empty,
  Status,
  AccessForm,
} from '@/components/admin/ui';
export default async function Adults({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const [{ people }, { message }] = await Promise.all([
    adminData(),
    searchParams,
  ]);
  const adults = people.filter((p) => p.role === 'pending');
  return (
    <>
      <AdminHeading
        title="Account requests"
        description="Assign a parent or teacher role to new adult accounts."
      />
      <AdminNotice message={message} />
      <div className="notice">
        Adults register through the parent / teacher sign-in page and confirm
        their email. Their account then appears here for setup. Assigned
        accounts are listed on the Parents or Teachers page.
      </div>
      <section className="panel">
        <div className="admin-section-heading">
          <h2>Awaiting a role</h2>
          <span className="muted">{adults.length} accounts</span>
        </div>
        {!adults.length ? (
          <Empty>No accounts awaiting a role.</Empty>
        ) : (
          <ul className="admin-directory">
            {adults.map((p) => (
              <li key={p.id}>
                <div className="admin-record">
                  <div>
                    <h3>{p.display_name}</h3>
                    <p className="muted">
                      {p.contact_email ?? 'Email verification pending'}
                    </p>
                  </div>
                  <Status value={p.status} />
                </div>
                <p className="account-meta">
                  {p.role === 'pending' ? 'Role not assigned' : p.role}
                </p>
                <details>
                  <summary>Edit name, role & access</summary>
                  <AccessForm person={p} returnTo="/admin/adults" />
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
