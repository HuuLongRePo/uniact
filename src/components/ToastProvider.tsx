// Toast Notification Provider
'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const systemDarkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const explicitTheme = root.getAttribute('data-theme');
      if (explicitTheme === 'dark') {
        setIsDark(true);
        return;
      }
      if (explicitTheme === 'light') {
        setIsDark(false);
        return;
      }
      setIsDark(systemDarkMedia.matches);
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    systemDarkMedia.addEventListener('change', apply);
    return () => {
      observer.disconnect();
      systemDarkMedia.removeEventListener('change', apply);
    };
  }, []);

  return (
    <Toaster
      position={isMobile ? 'top-center' : 'top-right'}
      reverseOrder={false}
      gutter={isMobile ? 6 : 8}
      containerStyle={
        isMobile
          ? {
              top: 'max(4.75rem, calc(env(safe-area-inset-top) + 4rem))',
              left: 'max(0.75rem, env(safe-area-inset-left))',
              right: 'max(0.75rem, env(safe-area-inset-right))',
              zIndex: 44,
            }
          : {
              top: 'max(0.875rem, calc(env(safe-area-inset-top) + 0.5rem))',
              right: 'max(0.875rem, env(safe-area-inset-right))',
              zIndex: 45,
            }
      }
      toastOptions={{
        duration: isMobile ? 3200 : 4000,
        style: {
          background: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#e2e8f0' : '#363636',
          padding: isMobile ? '9px 11px' : '16px',
          borderRadius: isMobile ? '12px' : '8px',
          boxShadow: isDark
            ? '0 10px 30px rgba(2, 6, 23, 0.55)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: isDark ? '1px solid rgba(148, 163, 184, 0.24)' : '1px solid rgba(148, 163, 184, 0.2)',
          maxWidth: isMobile ? 'min(92vw, 340px)' : '420px',
          fontSize: isMobile ? '12px' : '14px',
        },
        success: {
          duration: isMobile ? 2400 : 3000,
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
        },
        loading: {
          iconTheme: {
            primary: '#3B82F6',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}
