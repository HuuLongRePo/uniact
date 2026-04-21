'use client';

import { useAuth } from '@/contexts/AuthContext';
import NotificationInbox from '@/components/notifications/NotificationInbox';

export default function StudentNotificationsPage() {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-8 text-center">Vui lòng đăng nhập</div>;
  }

  return <NotificationInbox title="Thông báo" showSettings />;
}
