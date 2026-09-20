import Link from 'next/link';
import type { Account } from '@/lib/accounts';
import { Status } from './ui';
export function StudentParents({
  studentId,
  parents,
}: {
  studentId: string;
  parents: Account[];
}) {
  return (
    <section
      className="admin-related-info"
      aria-labelledby={`parents-${studentId}`}
    >
      <div className="admin-section-heading">
        <h4 id={`parents-${studentId}`}>Parent information</h4>
        <Link href={`/admin/relationships?student=${studentId}`}>
          {parents.length ? 'Manage links →' : 'Link a parent →'}
        </Link>
      </div>
      {parents.length ? (
        <ul className="admin-parent-list">
          {parents.map((parent) => (
            <li key={parent.id}>
              <div>
                <Link
                  className="admin-parent-name"
                  href={`/admin/parents#parent-${parent.id}`}
                >
                  {parent.display_name}
                </Link>
                <p className="muted">
                  {parent.contact_email ? (
                    <a href={`mailto:${parent.contact_email}`}>
                      {parent.contact_email}
                    </a>
                  ) : (
                    'Email verification pending'
                  )}
                </p>
              </div>
              <Status value={parent.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          No parent linked. Connect a parent to make their contact details easy
          to find here.
        </p>
      )}
    </section>
  );
}
