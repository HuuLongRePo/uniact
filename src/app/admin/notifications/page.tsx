'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import NotificationInbox from '@/components/notifications/NotificationInbox';

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [loading, router, user]);

  if (loading || !user || user.role !== 'admin') {
    return <LoadingSpinner message="Dang tai thong bao quan tri..." />;
  }

  return <NotificationInbox title="Thong bao quan tri" />;
}
