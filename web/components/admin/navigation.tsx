'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const links = [
  ['/admin', 'Overview', '01'],
  ['/admin/students', 'Students', '02'],
  ['/admin/adults', 'Parents & teachers', '03'],
  ['/admin/classes', 'Classes', '04'],
  ['/admin/relationships', 'Parent links', '05'],
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
