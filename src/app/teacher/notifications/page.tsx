'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import NotificationInbox from '@/components/notifications/NotificationInbox';

export default function TeacherNotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'teacher')) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'teacher') {
    return <LoadingSpinner />;
  }

  return <NotificationInbox title="Thông báo giảng viên" />;
}
