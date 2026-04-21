'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { StudentQRScanner } from '@/components/StudentQRScanner';
import toast from 'react-hot-toast';

interface ParsedQrPayload {
  qr_token: string;
  session_id: number;
}

function parseQrPayload(rawValue: string): ParsedQrPayload {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error('Mã QR trống. Vui lòng thử lại.');
  }

  const extractPayload = (payload: Record<string, unknown>): ParsedQrPayload | null => {
    const token = payload.t ?? payload.qr_token ?? payload.session_token;
    const sessionId = payload.s ?? payload.session_id ?? payload.id;
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    const normalizedSessionId = Number(sessionId);

    if (!normalizedToken || !Number.isFinite(normalizedSessionId)) {
      return null;
    }

    return {
      qr_token: normalizedToken,
      session_id: normalizedSessionId,
    };
  };

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const payload = extractPayload(parsed);
    if (payload) return payload;
  } catch {}

  if (trimmed.includes('=')) {
    const searchParams = new URLSearchParams(trimmed.startsWith('?') ? trimmed : `?${trimmed}`);
    const payload = extractPayload({
      t: searchParams.get('t') ?? searchParams.get('qr_token') ?? searchParams.get('session_token'),
      s: searchParams.get('s') ?? searchParams.get('session_id') ?? searchParams.get('id'),
    });
    if (payload) return payload;
  }

  throw new Error('Mã QR không đúng định dạng mới. Vui lòng yêu cầu giảng viên tạo lại mã QR.');
}

async function validateAttendance(payload: ParsedQrPayload) {
  const res = await fetch('/api/attendance/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Xác thực thất bại');
  }
  return data;
}

export default function StudentCheckInPage() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activityId');

  return (
    <div className="mx-auto max-w-xl space-y-6 py-6">
      <header>
        <h1 className="text-xl font-semibold">Điểm danh hoạt động</h1>
        <p className="text-sm text-gray-600">
          Quét QR hoặc dán dữ liệu mã QR để xác thực tham gia
          {activityId ? ` cho hoạt động #${activityId}` : ''}.
        </p>
      </header>
      <StudentQRScanner
        onScan={async (rawValue) => {
          const payload = parseQrPayload(rawValue);
          const result = await validateAttendance(payload);
          toast.success(result?.message || 'Điểm danh thành công');
        }}
      />
      <section className="space-y-2 text-xs text-gray-500">
        <p>
          Mã QR hiện chứa cả <code>session_id</code> và <code>qr_token</code>. Nếu camera không nhận
          dạng, bạn có thể dán nguyên dữ liệu QR vào ô nhập thủ công bên dưới.
        </p>
        <p>Mã hết hạn: tạo lại bởi giảng viên. Nếu báo hết hạn hãy yêu cầu phiên mới.</p>
      </section>
    </div>
  );
}
