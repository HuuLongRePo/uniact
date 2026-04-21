'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RealtimeNotificationBridge } from '@/components/realtime/RealtimeNotificationBridge';
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(52,211,153,0.14),_transparent_22%),linear-gradient(180deg,_var(--app-shell-bg-start),_var(--app-shell-bg-end))] text-[color:var(--app-text-default)]">
      {shouldShowSidebar && <Sidebar />}
      {user && <RealtimeNotificationBridge />}

      <div className={shouldShowSidebar ? 'xl:ml-72 ml-0' : ''}>
        <main className="min-h-screen px-0 pb-8 pt-0 transition-all duration-300 xl:px-6">
          <div className={shouldShowSidebar ? 'pt-20 xl:pt-6' : ''}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
