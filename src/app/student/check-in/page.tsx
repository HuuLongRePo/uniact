'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StudentQRScanner } from '@/components/StudentQRScanner';
import toast from 'react-hot-toast';

interface ParsedQrPayload {
  qr_token: string;
  session_id: number;
}

class AttendanceValidationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AttendanceValidationError';
    this.status = status;
  }
}

function parseQrPayload(rawValue: string): ParsedQrPayload {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error('Ma QR trong. Vui long thu lai.');
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

  throw new Error('Ma QR khong dung dinh dang moi. Vui long yeu cau giang vien tao lai ma QR.');
}

async function validateAttendance(payload: ParsedQrPayload) {
  const res = await fetch('/api/attendance/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AttendanceValidationError(data?.message || 'Xac thuc that bai', res.status);
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
    setAutoCheckinState('idle');
    setAutoCheckinError(null);
  }, [deepLinkPayload?.qr_token, deepLinkPayload?.session_id]);

  const handleDeepLinkCheckin = async () => {
    if (!deepLinkPayload) return;

    setAutoCheckinState('checking');
    setAutoCheckinError(null);

    try {
      const result = await validateAttendance(deepLinkPayload);
      setAutoCheckinState('success');
      toast.success(result?.message || 'Diem danh thanh cong');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xac thuc that bai';
      const status = err instanceof AttendanceValidationError ? err.status : null;
      const normalized = message.toLowerCase();

      if (status === 403) {
        setAutoCheckinState('error');
        setAutoCheckinError('Tai khoan hien tai khong du quyen diem danh phien QR nay.');
        return;
      }

      if (
        status === 401 ||
        normalized.includes('khong co quyen') ||
        normalized.includes('unauthorized') ||
        normalized.includes('forbidden') ||
        normalized.includes('chua dang nhap') ||
        normalized.includes('dang nhap')
      ) {
        setAutoCheckinState('needs_login');
        const next = `${pathname}?${searchParams.toString()}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      setAutoCheckinState('error');
      setAutoCheckinError(message);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-gray-200 px-5 py-5 sm:px-7">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-800">
              Diem danh QR cho hoc vien
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Diem danh hoat dong</h1>
            <p className="text-sm leading-6 text-gray-600 sm:text-base">
              Giang vien tao ma QR tai trang quan ly diem danh. Hoc vien dung trang nay de quet ma va
              xac thuc tham gia.
            </p>
            {activityId && (
              <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                Hoat dong #{activityId}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          {deepLinkPayload && (
            <div className="content-card space-y-1 p-4 text-sm sm:p-5">
              <div className="font-semibold text-gray-900">Phat hien du lieu diem danh tu duong link</div>
              <div className="text-xs text-gray-600">
                Phien #{deepLinkPayload.session_id} - Ma: {deepLinkPayload.qr_token.slice(0, 6)}...
              </div>
              <div className="text-xs text-gray-600">
                Bam nut xac nhan ben duoi de tien hanh diem danh.
              </div>
              {autoCheckinState === 'checking' && (
                <div className="text-xs text-gray-600">Dang xac thuc, vui long cho.</div>
              )}
              {autoCheckinState === 'success' && (
                <div className="text-xs text-emerald-700">Da diem danh thanh cong.</div>
              )}
              {autoCheckinState === 'error' && autoCheckinError && (
                <div className="text-xs text-red-700">{autoCheckinError}</div>
              )}
              {autoCheckinState !== 'success' && (
                <button
                  type="button"
                  onClick={() => void handleDeepLinkCheckin()}
                  className="mt-2 inline-flex items-center rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Xac nhan diem danh
                </button>
              )}
            </div>
          )}

          <StudentQRScanner
            onScan={async (rawValue) => {
              const payload = parseQrPayload(rawValue);
              const result = await validateAttendance(payload);
              toast.success(result?.message || 'Diem danh thanh cong');
            }}
          />

          <section className="content-card space-y-2 p-4 text-xs text-gray-600 sm:p-5">
            <p>
              Ma QR hop le phai chua ca <code>session_id</code> va <code>qr_token</code>. Neu camera
              khong nhan dien duoc, ban co the dan nguyen du lieu QR de diem danh thu cong.
            </p>
            <p>
              Neu bao het han, phien QR da dong hoac da doi ma moi. Hay lien he giang vien de mo lai
              phien diem danh.
            </p>
            <p>
              Khi hoc vien quet bang app camera/QR ben ngoai va mo dung link
              <code> /student/check-in?s=...&t=...</code>, trang nay se hien thong tin phien va cho
              hoc vien bam nut xac nhan diem danh.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
