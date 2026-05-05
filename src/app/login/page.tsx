'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginTestPanel from '@/components/LoginTestPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmit } from '@/lib/use-submit-hook';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();

  const showDemoAccounts =
    process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === '1';
  const shouldExplainMissingDemoPanel = !showDemoAccounts && process.env.NODE_ENV === 'production';

  const resolvePostLoginTarget = () => {
    const isSafeInternalPath = (value: string | null) =>
      Boolean(value && value.startsWith('/') && !value.startsWith('//'));

    const nextPath = searchParams.get('next');
    if (isSafeInternalPath(nextPath)) {
      return nextPath as string;
    }

    const redirectPath = searchParams.get('redirect');
    if (isSafeInternalPath(redirectPath)) {
      const passthrough = new URLSearchParams(searchParams.toString());
      passthrough.delete('next');
      passthrough.delete('redirect');
      const query = passthrough.toString();
      return query ? `${redirectPath}?${query}` : (redirectPath as string);
    }

    return '/dashboard';
  };

  const handleQuickLogin = async (nextEmail: string, nextPassword: string) => {
    setEmail(nextEmail);
    setPassword(nextPassword);
    setLoginError('');

    try {
      await login(nextEmail, nextPassword);
    } catch (err: any) {
      setLoginError(err?.message || 'Dang nhap that bai');
    }
  };

  useEffect(() => {
    if (!user) return;
    router.push(resolvePostLoginTarget());
  }, [user, router, searchParams]);

  const { handleSubmit: submitLogin, state } = useSubmit(
    async () => {
      if (user) {
        router.push(resolvePostLoginTarget());
        return;
      }

      await login(email, password);
    },
    {
      debounceMs: 300,
      cooldownMs: 1000,
      onError: (err) => {
        setLoginError(err.message || 'Dang nhap that bai');
      },
    }
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    await submitLogin();
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl mb-4">...</div>
          <div className="text-lg text-gray-600">Dang chuyen huong...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Dang nhap vao Cong Hoat Dong
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoac{' '}
            <Link href="/register" className="font-medium text-green-600 hover:text-green-500">
              dang ky tai khoan moi
            </Link>
          </p>
        </div>

        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleFormSubmit}>
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {loginError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="admin@annd.edu.vn"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mat khau
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="********"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={state.isDisabled}
              className={`group relative w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent text-base sm:text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${state.buttonClass}`}
            >
              {state.buttonText}
            </button>
          </div>

          {shouldExplainMissingDemoPanel && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Demo account panel chi hien thi khi bat{' '}
              <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=1</code>{' '}
              va <code className="rounded bg-amber-100 px-1">ENABLE_DEMO_ACCOUNTS=1</code> tren
              production.
            </div>
          )}
        </form>
      </div>

      {showDemoAccounts && <LoginTestPanel onSelectAccount={handleQuickLogin} />}
    </div>
  );
}
