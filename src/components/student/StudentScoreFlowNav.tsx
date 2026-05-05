'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SCORE_FLOW_LINKS = [
  { href: '/student/points', label: 'Điểm rèn luyện' },
  { href: '/student/scores', label: 'Bảng điểm' },
  { href: '/student/ranking', label: 'Xếp hạng' },
  { href: '/student/history', label: 'Lịch sử tham gia' },
  { href: '/student/awards', label: 'Giải thưởng' },
] as const;

function isFlowItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href === '/student/awards' && pathname.startsWith('/student/awards')) return true;
  return pathname.startsWith(`${href}/`);
}

export default function StudentScoreFlowNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng nhanh luồng điểm số"
      data-testid="student-score-flow-nav"
      className="sticky z-20 rounded-3xl border border-slate-200/90 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 xl:static xl:bg-white xl:backdrop-blur-0 dark:xl:bg-slate-900"
      style={{
        top: 'max(var(--app-mobile-nav-offset, 5.5rem), calc(env(safe-area-inset-top) + 4.75rem))',
      }}
    >
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {SCORE_FLOW_LINKS.map((item) => {
          const isActive = isFlowItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-[2.5rem] shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-slate-900 ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-700 dark:hover:text-blue-300'
              }`}
              aria-current={isActive ? 'page' : undefined}
              data-testid="student-score-flow-link"
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
