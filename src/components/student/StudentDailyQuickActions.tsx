'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ClipboardCheck,
  Laptop,
  LayoutDashboard,
  PieChart,
  QrCode,
} from 'lucide-react';
import type { ComponentType } from 'react';

type QuickAction = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const ACTIONS: QuickAction[] = [
  { label: 'Quét mã QR', href: '/student/check-in', icon: QrCode },
  { label: 'Hoạt động của tôi', href: '/student/my-activities', icon: BookOpen },
  { label: 'Thông báo', href: '/student/notifications', icon: Bell },
  { label: 'Cảnh báo', href: '/student/alerts', icon: AlertTriangle },
  { label: 'Điểm số', href: '/student/scores', icon: PieChart },
  { label: 'Khảo sát', href: '/student/polls', icon: ClipboardCheck },
  { label: 'Bảng điều khiển', href: '/student/dashboard', icon: LayoutDashboard },
];

const DEVICES_ACTION: QuickAction = { label: 'Thiết bị', href: '/student/devices', icon: Laptop };

type StudentDailyQuickActionsProps = {
  includeDevices?: boolean;
  className?: string;
};

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export default function StudentDailyQuickActions({
  includeDevices = false,
  className = '',
}: StudentDailyQuickActionsProps) {
  const pathname = usePathname();
  const resolvedActions = includeDevices ? [...ACTIONS, DEVICES_ACTION] : ACTIONS;

  return (
    <nav
      aria-label="Tác vụ nhanh học viên"
      data-testid="student-daily-quick-actions"
      className={`rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 ${className}`.trim()}
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Tác vụ nhanh
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
        {resolvedActions.map((action) => {
          const Icon = action.icon;
          const active = isActivePath(pathname, action.href);

          return (
            <Link
              key={action.href}
              href={action.href}
              aria-current={active ? 'page' : undefined}
              data-testid="student-daily-quick-action-link"
              className={`inline-flex min-h-[2.5rem] shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-slate-900 ${
                active
                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
