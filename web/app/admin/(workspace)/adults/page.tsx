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
  const adults = people.filter(
    (p) => p.role !== 'student' && p.role !== 'admin',
  );
  return (
    <>
      <AdminHeading
        title="Parents & teachers"
        description="Review verified adult accounts and assign their access."
      />
      <AdminNotice message={message} />
      <div className="notice">
        Adults register through the parent / teacher sign-in page and confirm
        their email. Their account then appears here for setup.
      </div>
      <section className="panel">
        <div className="admin-section-heading">
          <h2>Adult accounts</h2>
          <span className="muted">{adults.length} accounts</span>
        </div>
        {!adults.length ? (
          <Empty>No parent or teacher accounts yet.</Empty>
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
