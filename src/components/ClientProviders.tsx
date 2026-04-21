'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ToastProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AuthContent from '@/components/AuthContent';
import ThemePreferenceSync from '@/components/ThemePreferenceSync';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemePreferenceSync />
        <ToastProvider />
        <AuthContent>{children}</AuthContent>
      </AuthProvider>
    </ErrorBoundary>
  );
}
