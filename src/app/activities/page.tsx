'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * DEPRECATED: /activities page
 * Redirects to role-specific activity pages:
 * - Admin → /admin/activities (quản lý hoạt động)
 * - Teacher → /teacher/activities (hoạt động của tôi)
 * - Student → /student/activities (đăng ký hoạt động)
 */
export default function ActivitiesRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Redirect based on role
      switch (user.role) {
        case 'admin':
          router.replace('/admin/activities');
          break;
        case 'teacher':
          router.replace('/teacher/activities');
          break;
        case 'student':
          router.replace('/student/activities');
          break;
        default:
          router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return <LoadingSpinner />;
}
