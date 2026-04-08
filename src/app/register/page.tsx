'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext'; // Thêm import
import { useSubmit } from '@/lib/use-submit-hook';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student' as const,
    class_id: '',
  });
  const [registerError, setRegisterError] = useState('');
  const router = useRouter();
  const { user, register } = useAuth(); // Sử dụng register từ AuthContext

  // Redirect nếu đã login
  useEffect(() => {
    if (user) {
      console.warn('✅ Đã login, redirect đến dashboard');
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // useSubmit hook để ngăn double submit
  const { handleSubmit: submitRegister, state } = useSubmit(
    async () => {
      if (user) {
        router.push('/dashboard');
        return;
      }

      console.warn('📝 Đang đăng ký...');

      // Sử dụng register function từ AuthContext
      await register({
        ...formData,
        class_id: formData.class_id ? parseInt(formData.class_id) : undefined,
      });

      console.warn('✅ Đăng ký thành công qua AuthContext');

      // AuthContext sẽ tự động cập nhật và redirect
    },
    {
      debounceMs: 300,
      cooldownMs: 1000,
      onError: (err) => {
        console.warn('❌ Đăng ký thất bại:', err.message);
        setRegisterError(err.message || 'Đăng ký thất bại');
      },
    }
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    await submitRegister();
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng ký tài khoản
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoặc{' '}
            <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
              đăng nhập với tài khoản có sẵn
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleFormSubmit}>
          {registerError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {registerError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Họ và tên
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Vai trò
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="student">Học viên</option>
                <option value="teacher">Giảng viên</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={state.isDisabled}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${state.buttonClass}`}
            >
              {state.buttonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
