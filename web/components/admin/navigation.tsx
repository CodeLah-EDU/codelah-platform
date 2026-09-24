'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const links = [
  ['/admin', 'Overview', '01'],
  ['/admin/students', 'Students', '02'],
  ['/admin/parents', 'Parents', '03'],
  ['/admin/teachers', 'Teachers', '04'],
  ['/admin/classes', 'Classes', '05'],
  ['/admin/relationships', 'Parent links', '06'],
  ['/admin/adults', 'Account requests', '07'],
  ['/dashboard/lessons', 'Lesson schedule', '08'],
];
export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="Administration">
      {links.map(([href, label, index]) => {
        const active =
          href === '/admin'
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
          >
            <span aria-hidden="true">{index}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
