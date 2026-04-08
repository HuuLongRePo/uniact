'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface NetworkStatus {
  online: boolean;
  lastChecked: Date;
}

/**
 * useNetworkStatus - Detect online/offline state
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChecked: new Date(),
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus({ online: true, lastChecked: new Date() });
    };

    const handleOffline = () => {
      setStatus({ online: false, lastChecked: new Date() });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check (every 30 seconds)
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        setStatus({
          online: response.ok,
          lastChecked: new Date(),
        });
      } catch (error) {
        setStatus({
          online: false,
          lastChecked: new Date(),
        });
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return status;
}

/**
 * OfflineBanner - Display network status banner
 */
export function OfflineBanner() {
  const { online } = useNetworkStatus();

  if (online) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-3 flex items-center gap-3 shadow-lg z-50">
      <WifiOff className="w-5 h-5 flex-shrink-0 animate-pulse" />
      <div>
        <p className="font-semibold text-sm">Bạn đang ở chế độ offline</p>
        <p className="text-xs opacity-90">
          Một số tính năng có thể không hoạt động. Vui lòng kiểm tra kết nối.
        </p>
      </div>
    </div>
  );
}

/**
 * NetworkErrorBanner - Show when request fails due to network
 */
export function NetworkErrorBanner({ error }: { error: Error | null }) {
  if (!error) return null;

  const isNetworkError =
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('offline');

  if (!isNetworkError) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="ml-3">
          <p className="text-sm font-medium text-yellow-800">Lỗi kết nối mạng</p>
          <p className="text-sm text-yellow-700 mt-1">
            {error.message || 'Vui lòng kiểm tra kết nối internet của bạn'}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * withNetworkCheck - HOC to wrap components with network detection
 */
export function withNetworkCheck<P extends object>(Component: React.ComponentType<P>) {
  return function NetworkCheckedComponent(props: P) {
    const { online } = useNetworkStatus();

    return (
      <>
        <OfflineBanner />
        {online ? (
          <Component {...props} />
        ) : (
          <div className="p-8 text-center text-gray-600">
            <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Bạn đang ở chế độ offline. Vui lòng kết nối internet.</p>
          </div>
        )}
      </>
    );
  };
}
