'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePathname } from 'next/navigation';

export default function AuthContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const noSidebarPages = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  const shouldShowSidebar = user && !noSidebarPages.includes(pathname);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-green-50">
      {shouldShowSidebar && <Sidebar />}

      <div className={shouldShowSidebar ? 'lg:ml-64 ml-0' : ''}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
