import Link from 'next/link';
import { adminData } from '@/lib/admin';
import {
  AdminHeading,
  AdminNotice,
  Empty,
  Status,
} from '@/components/admin/ui';
export default async function Classes({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const [{ classes, enrolments, assignments, people }, { message }] =
    await Promise.all([adminData(), searchParams]);
  return (
    <>
      <AdminHeading
        title="Classes"
        description="Create classes, manage rosters, and assign teachers."
        action={{ href: '/admin/classes/new', label: '+ Create class' }}
      />
      <AdminNotice message={message} />
      {!classes.length ? (
        <section className="panel">
          <Empty>
            No classes yet. Create a class, then add its students and teachers.
          </Empty>
        </section>
      ) : (
        <div className="admin-class-grid">
          {classes.map((c) => (
            <section className="panel" key={c.id}>
              <div className="admin-section-heading">
                <span className="eyebrow">CODING CLASS</span>
                <Status value={c.active ? 'active' : 'archived'} />
              </div>
              <h2>{c.name}</h2>
              <p className="admin-capacity">
                {
                  enrolments.filter((e) => e.classroom_id === c.id && e.active)
                    .length
                }
                <span> / 4 students</span>
              </p>
              <p className="muted">
                {assignments
                  .filter((a) => a.classroom_id === c.id && a.active)
                  .map(
                    (a) =>
                      people.find((p) => p.id === a.teacher_id)?.display_name,
                  )
                  .filter(Boolean)
                  .join(', ') || 'No teacher assigned'}
              </p>
              <Link className="button" href={`/admin/classes/${c.id}`}>
                Manage class →
              </Link>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
