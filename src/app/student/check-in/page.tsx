'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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

  const tryParseAsUrlSearchParams = (params: URLSearchParams) => {
    const payload = extractPayload({
      t: params.get('t') ?? params.get('qr_token') ?? params.get('session_token'),
      s: params.get('s') ?? params.get('session_id') ?? params.get('id'),
    });
    return payload;
  };

  // Support full URLs embedded into QR (e.g. http(s)://host/student/check-in?s=...&t=...)
  try {
    const url = new URL(trimmed);
    const payload = tryParseAsUrlSearchParams(url.searchParams);
    if (payload) return payload;
  } catch {}

  if (trimmed.includes('=')) {
    const params = new URLSearchParams(trimmed.startsWith('?') ? trimmed : `?${trimmed}`);
    const payload = tryParseAsUrlSearchParams(params);
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activityId') ?? searchParams.get('activity_id');

  const [autoCheckinState, setAutoCheckinState] = useState<
    'idle' | 'checking' | 'success' | 'needs_login' | 'error'
  >('idle');
  const [autoCheckinError, setAutoCheckinError] = useState<string | null>(null);

  const deepLinkPayload = useMemo(() => {
    const token = searchParams.get('t') ?? searchParams.get('qr_token') ?? searchParams.get('session_token');
    const sessionId = searchParams.get('s') ?? searchParams.get('session_id') ?? searchParams.get('id');
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    const normalizedSessionId = Number(sessionId);

    if (!normalizedToken || !Number.isFinite(normalizedSessionId)) {
      return null;
    }

    return { qr_token: normalizedToken, session_id: normalizedSessionId } satisfies ParsedQrPayload;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    if (!deepLinkPayload) {
      setAutoCheckinState('idle');
      setAutoCheckinError(null);
      return;
    }

    setAutoCheckinState('checking');
    setAutoCheckinError(null);

    void (async () => {
      try {
        const result = await validateAttendance(deepLinkPayload);
        if (cancelled) return;
        setAutoCheckinState('success');
        toast.success(result?.message || 'Điểm danh thành công');
      } catch (err: unknown) {
        if (cancelled) return;

        const message = err instanceof Error ? err.message : 'Xác thực thất bại';
        const normalized = message.toLowerCase();

        if (
          normalized.includes('không có quyền') ||
          normalized.includes('unauthorized') ||
          normalized.includes('forbidden') ||
          normalized.includes('chưa đăng nhập') ||
          normalized.includes('đăng nhập')
        ) {
          setAutoCheckinState('needs_login');
          const next = `${pathname}?${searchParams.toString()}`;
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        setAutoCheckinState('error');
        setAutoCheckinError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deepLinkPayload, pathname, router, searchParams]);

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-gray-200 px-5 py-5 sm:px-7">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-800">
              Điểm danh QR cho học viên
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Điểm danh hoạt động</h1>
            <p className="text-sm leading-6 text-gray-600 sm:text-base">
              Giảng viên tạo mã QR tại trang quản lý điểm danh. Học viên dùng trang này để quét mã
              và xác thực tham gia.
            </p>
            {activityId && (
              <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Hoạt động #{activityId}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          {deepLinkPayload && (
            <div className="content-card space-y-1 p-4 text-sm sm:p-5">
              <div className="font-semibold text-gray-900">Đang xử lý điểm danh từ đường link...</div>
              <div className="text-xs text-gray-600">
                Phiên #{deepLinkPayload.session_id} • Mã: {deepLinkPayload.qr_token.slice(0, 6)}…
              </div>
              {autoCheckinState === 'checking' && (
                <div className="text-xs text-gray-600">Đang xác thực, vui lòng chờ.</div>
              )}
              {autoCheckinState === 'success' && (
                <div className="text-xs text-emerald-700">Đã điểm danh thành công.</div>
              )}
              {autoCheckinState === 'error' && autoCheckinError && (
                <div className="text-xs text-red-700">{autoCheckinError}</div>
              )}
            </div>
          )}

          <StudentQRScanner
            onScan={async (rawValue) => {
              const payload = parseQrPayload(rawValue);
              const result = await validateAttendance(payload);
              toast.success(result?.message || 'Điểm danh thành công');
            }}
          />

          <section className="content-card space-y-2 p-4 text-xs text-gray-600 sm:p-5">
            <p>
              Mã QR hợp lệ phải chứa cả <code>session_id</code> và <code>qr_token</code>. Nếu camera
              không nhận diện được, bạn có thể dán nguyên dữ liệu QR để điểm danh thủ công.
            </p>
            <p>
              Nếu báo hết hạn, phiên QR đã đóng hoặc đã đổi mã mới. Hãy liên hệ giảng viên để mở lại
              phiên điểm danh.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
