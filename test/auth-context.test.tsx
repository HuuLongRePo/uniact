import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

vi.mock('@/lib/retry-logic', () => ({
  retryWithBackoff: async (fn: () => Promise<any>) => fn(),
}));

function AuthProbe({ onReady }: { onReady: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading) {
      onReady(auth);
    }
  }, [auth, onReady]);

  return null;
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/api/auth/me')) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ error: 'Chưa đăng nhập' }),
          } as any;
        }

        if (url.includes('/api/auth/logout')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as any;
      })
    );

    Object.defineProperty(window, 'location', {
      value: { href: '/' },
      writable: true,
    });
  });

  it('sends credentials include on logout for cookie-backed sessions', async () => {
    const onReady = vi.fn();
    render(
      <AuthProvider>
        <AuthProbe onReady={onReady} />
      </AuthProvider>
    );

    await waitFor(() => expect(onReady).toHaveBeenCalled());
    const auth = onReady.mock.calls.at(-1)?.[0];

    await act(async () => {
      await auth.logout();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
    expect(window.location.href).toBe('/');
  });
});
