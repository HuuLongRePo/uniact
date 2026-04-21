'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Key, ArrowLeft } from 'lucide-react';

export default function PasswordResetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 1: Request reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Không thể gửi yêu cầu đặt lại mật khẩu');
      }

      const result = await response.json();
      setToken(result.token);

      // Show OTP if in development
      if (result.otp) {
        toast((t) => (
          <div className="space-y-2">
            <p>
              OTP: <code className="bg-gray-200 px-2 py-1 rounded font-mono">{result.otp}</code>
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.otp);
                toast.success('Copied OTP!');
              }}
              className="text-blue-600 text-sm underline"
            >
              Copy
            </button>
          </div>
        ));
      }

      setStep('otp');
      toast.success('OTP đã được gửi!');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi yêu cầu reset');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/password-reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          otp,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }

      const result = await response.json();
      toast.success(result.message);

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || 'Lỗi reset mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-indigo-100 rounded-lg mb-4">
            <Key className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
          <p className="text-gray-600 mt-2">
            {step === 'email' && 'Nhập email của bạn để tiếp tục'}
            {step === 'otp' && 'Nhập mã OTP'}
            {step === 'reset' && 'Đặt mật khẩu mới'}
          </p>
        </div>

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
            >
              {loading ? 'Đang gửi...' : 'Tiếp tục'}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep('reset');
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã OTP (6 chữ số)
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                maxLength={6}
                placeholder="000000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center text-lg tracking-widest"
              />
              <p className="text-xs text-gray-500 mt-1">Kiểm tra email hoặc QR code</p>
            </div>

            <button
              type="submit"
              disabled={otp.length !== 6}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
            >
              Xác nhận OTP
            </button>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Ít nhất 8 ký tự"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Nhập lại mật khẩu"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-600">Mật khẩu không khớp</p>
            )}

            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>

            <button
              type="button"
              onClick={() => setStep('otp')}
              className="w-full py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
