'use client';

import LoadingSpinner from '@/components/LoadingSpinner';
import NotificationInbox from '@/components/notifications/NotificationInbox';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentNotificationsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Vui lòng đăng nhập.
          </div>
        </div>
      </div>
    );
  }

  return (
    <NotificationInbox
      title="Thông báo"
      showSettings
      leadingContent={<StudentDailyQuickActions />}
    />
  );
}
