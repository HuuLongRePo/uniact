'use client';

import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

interface FingerprintLoginProps {
  userId?: number;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  mode?: 'register' | 'authenticate';
}

export default function FingerprintLogin({
  userId,
  onSuccess,
  onError,
  mode = 'authenticate',
}: FingerprintLoginProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleRegister = async () => {
    if (!userId) {
      onError?.('Cần đăng nhập trước khi đăng ký vân tay');
      return;
    }

    setLoading(true);
    setStatus('Đang chuẩn bị đăng ký vân tay...');

    try {
      // Get registration options from server
      const optionsRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!optionsRes.ok) {
        throw new Error('Không thể tạo yêu cầu đăng ký');
      }

      const options = await optionsRes.json();
      setStatus('Vui lòng chạm vào cảm biến vân tay...');

      // Start WebAuthn registration
      const credential = await startRegistration(options);

      // Verify registration with server
      const verifyRes = await fetch('/api/auth/webauthn/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, credential }),
      });

      if (!verifyRes.ok) {
        throw new Error('Xác minh vân tay thất bại');
      }

      const { success } = await verifyRes.json();

      if (success) {
        setStatus('✅ Đăng ký vân tay thành công!');
        setTimeout(() => onSuccess('registered'), 1500);
      } else {
        throw new Error('Đăng ký không thành công');
      }
    } catch (error: any) {
      console.error('Fingerprint registration error:', error);
      const errorMsg =
        error.name === 'NotAllowedError'
          ? 'Bạn đã hủy đăng ký vân tay'
          : error.message || 'Đăng ký vân tay thất bại';
      setStatus(`❌ ${errorMsg}`);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    setLoading(true);
    setStatus('Đang chuẩn bị xác thực...');

    try {
      // Get authentication options from server
      const optionsRes = await fetch('/api/auth/webauthn/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userId ? undefined : 'auto' }), // Auto-detect credentials
      });

      if (!optionsRes.ok) {
        throw new Error('Không tìm thấy vân tay đã đăng ký');
      }

      const options = await optionsRes.json();
      setStatus('Vui lòng chạm vào cảm biến vân tay...');

      // Start WebAuthn authentication
      const credential = await startAuthentication(options);

      // Verify authentication with server
      const verifyRes = await fetch('/api/auth/webauthn/login', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (!verifyRes.ok) {
        throw new Error('Xác thực vân tay thất bại');
      }

      const { token } = await verifyRes.json();

      if (token) {
        setStatus('✅ Đăng nhập thành công!');
        setTimeout(() => onSuccess(token), 1000);
      } else {
        throw new Error('Không nhận được token');
      }
    } catch (error: any) {
      console.error('Fingerprint authentication error:', error);
      const errorMsg =
        error.name === 'NotAllowedError'
          ? 'Bạn đã hủy xác thực'
          : error.name === 'NotSupportedError'
            ? 'Thiết bị không hỗ trợ vân tay'
            : error.message || 'Xác thực thất bại';
      setStatus(`❌ ${errorMsg}`);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fingerprint-login bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">🔐</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {mode === 'register' ? 'Đăng ký vân tay' : 'Đăng nhập bằng vân tay'}
          </h3>
          <p className="text-sm text-gray-600">
            {mode === 'register'
              ? 'Sử dụng Touch ID, Windows Hello, hoặc cảm biến vân tay'
              : 'Chạm vào cảm biến để xác thực'}
          </p>
        </div>
      </div>

      {status && (
        <div
          className={`mb-4 p-3 rounded-md text-sm ${
            status.includes('✅')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : status.includes('❌')
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {status}
        </div>
      )}

      <button
        onClick={mode === 'register' ? handleRegister : handleAuthenticate}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
          loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Đang xử lý...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="text-xl">👆</span>
            {mode === 'register' ? 'Đăng ký ngay' : 'Xác thực'}
          </span>
        )}
      </button>

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>✓ Hoạt động offline (không cần internet)</p>
        <p>✓ Dữ liệu vân tay không rời khỏi thiết bị</p>
        <p>✓ Hỗ trợ: iPhone Touch/Face ID, Android Fingerprint, Windows Hello</p>
      </div>
    </div>
  );
}
