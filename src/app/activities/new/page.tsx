'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LegacyNewActivityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role === 'teacher') {
      router.replace('/teacher/activities/new');
      return;
    }

    router.replace('/activities');
  }, [loading, router, user]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
          <p className="mt-4 text-gray-700">Dang chuyen den man tao hoat dong moi...</p>
        </div>
      </div>
    </div>
  );
}
