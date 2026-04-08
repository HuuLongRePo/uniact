'use client';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const requestReset = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yêu cầu thất bại');
      // Nếu hệ thống chưa có email service, token trả về để mô phỏng
      if (data.reset_token) setToken(data.reset_token);
      setMessage('Nếu email tồn tại, yêu cầu đã được ghi nhận. Token hiển thị (môi trường demo).');
      setStep('confirm');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/confirm-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đặt lại thất bại');
      setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.');
      setStep('done');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Đặt lại mật khẩu</h1>
      {message && (
        <div className="mb-4 text-sm text-blue-700 bg-blue-100 p-2 rounded">{message}</div>
      )}

      {step === 'request' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="nhap.email@domain.edu"
            />
          </div>
          <button
            onClick={requestReset}
            disabled={loading || !email}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
          >
            {loading ? 'Đang gửi...' : 'Yêu cầu đặt lại'}
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Token (demo hiển thị):</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Paste token ở đây"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mật khẩu mới:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>
          <button
            onClick={confirmReset}
            disabled={loading || !token || newPassword.length < 6}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
          >
            {loading ? 'Đang đặt lại...' : 'Xác nhận đặt lại'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <p className="text-green-700">Mật khẩu đã được cập nhật. Hãy quay lại trang đăng nhập.</p>
        </div>
      )}
    </div>
  );
}
