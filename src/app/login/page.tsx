'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSubmit } from '@/lib/use-submit-hook';
import LoginTestPanel from '@/components/LoginTestPanel';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const router = useRouter();
  const { user, login } = useAuth(); // Sử dụng login từ AuthContext

  const isProduction = process.env.NODE_ENV === 'production';
  const demoAccountsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === '1';
  const showDemoAccounts = !isProduction && demoAccountsEnabled;
  const shouldExplainMissingDemoPanel = !isProduction && !demoAccountsEnabled;

  const handleQuickLogin = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    // Auto-submit sau khi fill
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  // Redirect nếu đã login
  useEffect(() => {
    if (user) {
      console.warn('✅ Đã login, redirect đến dashboard');
      router.push('/dashboard');
    }
  }, [user, router]);

  // useSubmit hook để ngăn double submit
  const { handleSubmit: submitLogin, state } = useSubmit(
    async () => {
      // Nếu đã login thì không làm gì
      if (user) {
        router.push('/dashboard');
        return;
      }

      console.warn('🔐 Đang đăng nhập...');

      // Sử dụng login function từ AuthContext thay vì fetch trực tiếp
      await login(email, password);

      console.warn('✅ Login thành công qua AuthContext');

      // AuthContext sẽ tự động cập nhật user state
      // useEffect ở trên sẽ xử lý redirect
    },
    {
      debounceMs: 300,
      cooldownMs: 1000,
      onError: (err) => {
        console.warn('❌ Login thất bại:', err.message);
        setLoginError(err.message || 'Đăng nhập thất bại');
      },
    }
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    await submitLogin();
  };

  // Nếu đã login, hiển thị loading
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl mb-4">🔄</div>
          <div className="text-lg text-gray-600">Đang chuyển hướng...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Đăng nhập vào Cổng Hoạt Động
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoặc{' '}
            <Link href="/register" className="font-medium text-green-600 hover:text-green-500">
              đăng ký tài khoản mới
            </Link>
          </p>
        </div>

        {/* Login form */}
        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleFormSubmit}>
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
              {loginError}
            </div>
          )}

          <div className="space-y-4">
            {/* Email input */}
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

            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 text-base sm:text-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Submit button */}
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
              Quick login đang tắt. Bật <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=1</code> để hiện panel tài khoản demo ở môi trường local/dev.
            </div>
          )}
        </form>
      </div>

      {/* Test Accounts Panel - Only in development */}
      {showDemoAccounts && <LoginTestPanel onSelectAccount={handleQuickLogin} />}
    </div>
  );
}
