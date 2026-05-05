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
    <div
      className="app-shell-root min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(52,211,153,0.14),_transparent_22%),linear-gradient(180deg,_var(--app-shell-bg-start),_var(--app-shell-bg-end))] text-[color:var(--app-text-default)]"
      data-sidebar-enabled={shouldShowSidebar ? 'true' : 'false'}
    >
      {shouldShowSidebar && <Sidebar />}
      {user && <RealtimeNotificationBridge />}

      <div
        className={`app-shell-main ${shouldShowSidebar ? 'app-shell-with-sidebar' : ''}`}
        data-testid="app-shell-main"
      >
        <main className="app-shell-main-inner">
          <div className={`app-shell-content ${shouldShowSidebar ? 'app-shell-content-with-sidebar' : ''}`}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
