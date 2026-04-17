'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types/database';
import { retryWithBackoff } from '@/lib/retry-logic';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const checkAuth = async (): Promise<boolean> => {
    try {
      console.warn('🔄 AuthContext: Auth check with exponential backoff...');

      const result = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const response = await fetch('/api/auth/me', {
              credentials: 'include',
              cache: 'no-store',
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              const resolvedUser = data?.data?.user ?? data?.user ?? null;
              console.warn('✅ AuthContext: User authenticated:', resolvedUser?.email);
              setUser(resolvedUser);
              return Boolean(resolvedUser);
            }

            if (response.status === 401) {
              console.warn('❌ AuthContext: Not authenticated');
              setUser(null);
              return false;
            }

            const errorPayload = await response.json().catch(() => null);
            throw new Error(errorPayload?.error || `Auth check failed with status ${response.status}`);
          } finally {
            clearTimeout(timeoutId);
          }
        },
        {
          maxRetries: 2,
          initialDelayMs: 150,
          maxDelayMs: 1500,
          backoffMultiplier: 2,
        }
      );

      return result;
    } catch (error: any) {
      console.warn('⚠️ AuthContext: Auth check failed after retries:', error.message);
      setUser(null);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    console.warn('🔐 AuthContext: Đang login...');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    console.warn('📨 AuthContext: Login response status:', response.status);

    if (!response.ok) {
      const data = await response.json();
      console.warn('❌ AuthContext: Login failed:', data.error);
      throw new Error(data.error);
    }

    console.warn('✅ AuthContext: Login API thành công, đang check auth...');

    // Đảm bảo checkAuth hoàn thành trước khi return
    await checkAuth();

    console.warn('🎉 AuthContext: Login process hoàn tất');
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    // Redirect to landing page after logout
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const register = async (userData: any) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error);
    }

    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
