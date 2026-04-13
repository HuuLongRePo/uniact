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
    (async () => {
      // QUICK FIX: Set a very short timeout for mobile compatibility
      const totalTimeout = setTimeout(() => {
        console.warn('⏱️ Auth init timeout - forcing loading=false (mobile fast mode)');
        setLoading(false);
      }, 2000); // Just 2 seconds max

      try {
        // Try to check auth but don't wait too long
        const authPromise = checkAuth();
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));

        // Race between auth check and timeout
        await Promise.race([authPromise, timeoutPromise]);
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        clearTimeout(totalTimeout);
        setLoading(false);
      }
    })();
  }, []);

  const checkAuth = async (): Promise<boolean> => {
    try {
      console.warn('🔄 AuthContext: Auth check with exponential backoff...');

      const result = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

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
            } else {
              console.warn('❌ AuthContext: Not authenticated');
              setUser(null);
              return false;
            }
          } finally {
            clearTimeout(timeoutId);
          }
        },
        {
          maxRetries: 3,
          initialDelayMs: 100,
          maxDelayMs: 2000,
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
    await fetch('/api/auth/logout', { method: 'POST' });
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
