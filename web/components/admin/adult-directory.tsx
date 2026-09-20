import Link from 'next/link';
import { adminData } from '@/lib/admin';
import { AdminHeading, AdminNotice, Empty, Status, AccessForm } from './ui';

export async function AdultDirectory({
  accountRole,
  message,
}: {
  accountRole: 'parent' | 'teacher';
  message?: string;
}) {
  const { people, links, assignments, classes } = await adminData();
  const adults = people.filter((person) => person.role === accountRole);
  const parent = accountRole === 'parent';
  const path = parent ? '/admin/parents' : '/admin/teachers';
  return (
    <>
      <AdminHeading
        title={parent ? 'Parents' : 'Teachers'}
        description={
          parent
            ? 'Parent contact details and the students they support.'
            : 'Teacher accounts, contact details, and assigned classes.'
        }
      />
      <AdminNotice message={message} />
      <p className="admin-directory-note muted">
        New registrations appear in{' '}
        <Link href="/admin/adults">Account requests</Link> until you assign
        their role.
      </p>
      <section className="panel">
        <div className="admin-section-heading">
          <h2>{parent ? 'Parent directory' : 'Teacher directory'}</h2>
          <span className="muted">
            {adults.length} {parent ? 'parents' : 'teachers'}
          </span>
        </div>
        {!adults.length ? (
          <Empty>
            {parent ? 'No parent accounts yet.' : 'No teacher accounts yet.'}{' '}
            Assign the appropriate role in Account requests to get started.
          </Empty>
        ) : (
          <ul className="admin-directory">
            {adults.map((person) => (
              <li key={person.id} id={`${accountRole}-${person.id}`}>
                <div className="admin-record">
                  <div>
                    <h3>{person.display_name}</h3>
                    <p className="muted">
                      {person.contact_email ? (
                        <a href={`mailto:${person.contact_email}`}>
                          {person.contact_email}
                        </a>
                      ) : (
                        'Email verification pending'
                      )}
                    </p>
                  </div>
                  <Status value={person.status} />
                </div>
                <section
                  className="admin-related-info"
                  aria-label={parent ? 'Linked students' : 'Assigned classes'}
                >
                  <h4>{parent ? 'Linked students' : 'Assigned classes'}</h4>
                  {parent ? (
                    links.some(
                      (link) => link.parent_id === person.id && link.active,
                    ) ? (
                      <ul>
                        {links
                          .filter(
                            (link) =>
                              link.parent_id === person.id && link.active,
                          )
                          .map((link) => (
                            <li key={link.student_id}>
                              <Link
                                href={`/admin/students#student-${link.student_id}`}
                              >
                                {people.find((p) => p.id === link.student_id)
                                  ?.display_name ?? 'Student unavailable'}
                              </Link>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="muted">No students linked yet.</p>
                    )
                  ) : assignments.some(
                      (a) => a.teacher_id === person.id && a.active,
                    ) ? (
                    <ul>
                      {assignments
                        .filter((a) => a.teacher_id === person.id && a.active)
                        .map((a) => (
                          <li key={a.classroom_id}>
                            <Link href={`/admin/classes/${a.classroom_id}`}>
                              {classes.find((c) => c.id === a.classroom_id)
                                ?.name ?? 'Class unavailable'}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="muted">No classes assigned yet.</p>
                  )}
                  <Link
                    href={parent ? '/admin/relationships' : '/admin/classes'}
                  >
                    {parent
                      ? 'Manage parent links →'
                      : 'Manage class assignments →'}
                  </Link>
                </section>
                <details>
                  <summary>Edit name, role & access</summary>
                  <AccessForm person={person} returnTo={path} />
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
