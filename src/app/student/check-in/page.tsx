'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  StudentQRScanner,
  type StudentQrScannerDebugState,
} from '@/components/StudentQRScanner';

interface ParsedQrPayload {
  qr_token: string;
  session_id: number;
}

interface QrCheckInDiagnostics extends StudentQrScannerDebugState {
  parseState: 'idle' | 'success' | 'error';
  parsedPayload: ParsedQrPayload | null;
  validateState: 'idle' | 'pending' | 'success' | 'error';
  validateStatus: number | null;
  validateMessage: string | null;
  lastUpdatedAt: string | null;
}

class AttendanceValidationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AttendanceValidationError';
    this.status = status;
  }
}

export function parseQrPayload(rawValue: string): ParsedQrPayload {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    throw new Error('Mã QR trống. Vui lòng thử lại.');
  }

  const compactPayloadMatch = trimmed.match(/^(\d+):([A-Za-z0-9_-]+)$/);
  if (compactPayloadMatch) {
    return {
      session_id: Number(compactPayloadMatch[1]),
      qr_token: compactPayloadMatch[2],
    };
  }

  const compactPrefixedPayloadMatch = trimmed.match(/^S(\d+):([A-Za-z0-9_-]+)$/);
  if (compactPrefixedPayloadMatch) {
    return {
      session_id: Number(compactPrefixedPayloadMatch[1]),
      qr_token: compactPrefixedPayloadMatch[2],
    };
  }

  const extractPayload = (payload: Record<string, unknown>): ParsedQrPayload | null => {
    const token =
      payload.t ??
      payload.T ??
      payload.qr_token ??
      payload.QR_TOKEN ??
      payload.session_token ??
      payload.SESSION_TOKEN;
    const sessionId =
      payload.s ?? payload.S ?? payload.session_id ?? payload.SESSION_ID ?? payload.id ?? payload.ID;
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    const normalizedSessionId = Number(sessionId);

    if (
      !normalizedToken ||
      !Number.isInteger(normalizedSessionId) ||
      normalizedSessionId <= 0
    ) {
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
    return extractPayload({
      t:
        params.get('t') ??
        params.get('T') ??
        params.get('qr_token') ??
        params.get('QR_TOKEN') ??
        params.get('session_token') ??
        params.get('SESSION_TOKEN'),
      s:
        params.get('s') ??
        params.get('S') ??
        params.get('session_id') ??
        params.get('SESSION_ID') ??
        params.get('id') ??
        params.get('ID'),
    });
  };

  try {
    const url = new URL(trimmed);
    const payload = tryParseAsUrlSearchParams(url.searchParams);
    if (payload) return payload;
  } catch {}

  if (trimmed.includes('=')) {
    let queryCandidate = trimmed;
    const questionIndex = trimmed.indexOf('?');
    if (questionIndex >= 0) {
      queryCandidate = trimmed.slice(questionIndex);
    } else if (trimmed.startsWith('/')) {
      // Relative path without absolute origin, e.g. /student/check-in?s=..&t=..
      const nextQuestionIndex = trimmed.indexOf('?');
      queryCandidate = nextQuestionIndex >= 0 ? trimmed.slice(nextQuestionIndex) : trimmed;
    }
    const params = new URLSearchParams(
      queryCandidate.startsWith('?') ? queryCandidate : `?${queryCandidate}`
    );
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
    throw new AttendanceValidationError(data?.message || 'Xác thực thất bại', res.status);
  }
  return data;
}

async function requireLoggedInForDeepLink() {
  const res = await fetch('/api/profile/me', { method: 'GET' });
  if (res.status === 401) return 'unauthenticated' as const;
  if (res.ok) return 'authenticated' as const;
  return 'unknown' as const;
}

const INITIAL_DIAGNOSTICS: QrCheckInDiagnostics = {
  scanState: 'idle',
  cameraState: 'idle',
  decoderEngine: 'initializing',
  decoderState: 'idle',
  lastDecodedRaw: null,
  error: null,
  note: 'Chưa có dữ liệu chẩn đoán.',
  parseState: 'idle',
  parsedPayload: null,
  validateState: 'idle',
  validateStatus: null,
  validateMessage: null,
  lastUpdatedAt: null,
};

export default function StudentCheckInPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activityId = searchParams.get('activityId') ?? searchParams.get('activity_id');
  const debugMode = searchParams.get('debug') === 'qr';

  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<QrCheckInDiagnostics>(INITIAL_DIAGNOSTICS);

  function updateDiagnostics(patch: Partial<QrCheckInDiagnostics>) {
    setDiagnostics((prev) => ({
      ...prev,
      ...patch,
      lastUpdatedAt: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }));
  }

  const deepLinkPayload = useMemo(() => {
    const token =
      searchParams.get('t') ??
      searchParams.get('T') ??
      searchParams.get('qr_token') ??
      searchParams.get('QR_TOKEN') ??
      searchParams.get('session_token') ??
      searchParams.get('SESSION_TOKEN');
    const sessionId =
      searchParams.get('s') ??
      searchParams.get('S') ??
      searchParams.get('session_id') ??
      searchParams.get('SESSION_ID') ??
      searchParams.get('id') ??
      searchParams.get('ID');
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    const normalizedSessionId = Number(sessionId);

    if (
      !normalizedToken ||
      !Number.isInteger(normalizedSessionId) ||
      normalizedSessionId <= 0
    ) {
      return null;
    }

    return { qr_token: normalizedToken, session_id: normalizedSessionId } satisfies ParsedQrPayload;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const guardDeepLink = async () => {
      if (!deepLinkPayload) {
        setDeepLinkNotice(null);
        return;
      }

      const authState = await requireLoggedInForDeepLink();
      if (cancelled) return;

      if (authState === 'unauthenticated') {
        const next = `${pathname}?${searchParams.toString()}`;
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      if (authState === 'unknown') {
        setDeepLinkNotice(
          'Hệ thống tạm thời chưa xác minh được phiên đăng nhập. Hãy bật camera web và quét lại mã QR; nếu vẫn lỗi, tải lại trang.'
        );
        return;
      }

      setDeepLinkNotice(
        'Bạn đã mở liên kết QR từ ứng dụng bên ngoài. Theo quy định, hãy bật camera web và quét lại mã QR để điểm danh.'
      );
    };

    void guardDeepLink();

    return () => {
      cancelled = true;
    };
  }, [deepLinkPayload, pathname, router, searchParams]);

  const shouldShowDiagnostics = debugMode;

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50/90 via-white to-cyan-50/70 px-5 py-5 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40 sm:px-7">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-800 dark:bg-blue-500/20 dark:text-blue-100">
              Điểm danh QR cho học viên
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Điểm danh hoạt động</h1>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Học viên bắt buộc bật camera web và quét mã QR trong trang này. Truy cập liên kết trực
              tiếp không tự động điểm danh.
            </p>
            {activityId && (
              <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                Hoạt động #{activityId}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          {deepLinkPayload && (
            <div className="content-card space-y-2 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-5">
              <div className="font-semibold text-slate-900 dark:text-slate-100">Phát hiện dữ liệu từ liên kết QR</div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Phiên #{deepLinkPayload.session_id} - Mã: {deepLinkPayload.qr_token.slice(0, 6)}...
              </div>
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                {deepLinkNotice ||
                  'Hệ thống đang kiểm tra đăng nhập. Sau khi vào được trang, bạn vẫn phải quét lại QR bằng camera web để điểm danh.'}
              </div>
            </div>
          )}

          <StudentQRScanner
            onDebugChange={
              shouldShowDiagnostics ? (patch) => updateDiagnostics(patch) : undefined
            }
            onScan={async (rawValue) => {
              updateDiagnostics({
                lastDecodedRaw: rawValue,
                parseState: 'idle',
                parsedPayload: null,
                validateState: 'idle',
                validateStatus: null,
                validateMessage: null,
              });

              let payload: ParsedQrPayload;
              try {
                payload = parseQrPayload(rawValue);
                updateDiagnostics({
                  parseState: 'success',
                  parsedPayload: payload,
                  note: 'Đã phân tích thành công payload từ mã QR.',
                });
              } catch (err: unknown) {
                const parseError = err instanceof Error ? err.message : 'Không phân tích được nội dung QR.';
                updateDiagnostics({
                  parseState: 'error',
                  parsedPayload: null,
                  validateState: 'idle',
                  validateStatus: null,
                  validateMessage: null,
                  error: parseError,
                  note: 'Đã đọc được mã QR nhưng payload không hợp lệ.',
                });
                throw err;
              }

              updateDiagnostics({
                validateState: 'pending',
                validateStatus: null,
                validateMessage: 'Đang gọi API /api/attendance/validate...',
                error: null,
                note: 'Đang gửi payload lên máy chủ để xác thực điểm danh.',
              });

              try {
                const result = await validateAttendance(payload);
                updateDiagnostics({
                  validateState: 'success',
                  validateStatus: 200,
                  validateMessage: result?.message || 'Điểm danh thành công',
                  note: 'Máy chủ đã ghi nhận điểm danh thành công.',
                });
              } catch (err: unknown) {
                updateDiagnostics({
                  validateState: 'error',
                  validateStatus:
                    err instanceof AttendanceValidationError ? err.status : null,
                  validateMessage:
                    err instanceof Error ? err.message : 'Máy chủ từ chối yêu cầu điểm danh.',
                  note: 'Máy chủ đã nhận payload nhưng không xác thực thành công.',
                });
                throw err;
              }
            }}
          />

          {shouldShowDiagnostics ? (
            <details className="content-card p-4 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 sm:p-5" open={debugMode}>
              <summary className="cursor-pointer list-none font-semibold text-slate-900 dark:text-slate-100">
                Chẩn đoán kỹ thuật
                {diagnostics.lastUpdatedAt ? (
                  <span className="ml-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                    Cập nhật: {diagnostics.lastUpdatedAt}
                  </span>
                ) : null}
              </summary>

              <div className="mt-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="font-medium text-slate-900 dark:text-slate-100">Camera</div>
                    <div className="mt-1 font-mono text-[11px]">{diagnostics.cameraState}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="font-medium text-slate-900 dark:text-slate-100">Engine quét</div>
                    <div className="mt-1 font-mono text-[11px]">
                      {diagnostics.decoderEngine} / {diagnostics.decoderState}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="font-medium text-slate-900 dark:text-slate-100">Phân tích payload</div>
                    <div className="mt-1 font-mono text-[11px]">{diagnostics.parseState}</div>
                    {diagnostics.parsedPayload ? (
                      <div className="mt-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        s={diagnostics.parsedPayload.session_id}, t=
                        {diagnostics.parsedPayload.qr_token.slice(0, 10)}...
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="font-medium text-slate-900 dark:text-slate-100">API xác thực</div>
                    <div className="mt-1 font-mono text-[11px]">
                      {diagnostics.validateState}
                      {diagnostics.validateStatus ? ` (${diagnostics.validateStatus})` : ''}
                    </div>
                    {diagnostics.validateMessage ? (
                      <div className="mt-1 leading-5 text-slate-600 dark:text-slate-300">{diagnostics.validateMessage}</div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="font-medium text-slate-900 dark:text-slate-100">Raw QR gần nhất</div>
                  <div className="mt-1 break-all font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {diagnostics.lastDecodedRaw || 'Chưa đọc được mã QR nào.'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="font-medium text-slate-900 dark:text-slate-100">Nhận xét hiện tại</div>
                  <div className="mt-1 leading-5 text-slate-700 dark:text-slate-300">
                    {diagnostics.error || diagnostics.note || 'Chưa có dữ liệu.'}
                  </div>
                </div>
              </div>
            </details>
          ) : null}

          <section className="content-card space-y-2 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 sm:p-5">
            <p>
              Quy tắc mới: chỉ ghi nhận điểm danh sau khi quét QR bằng camera web trong trang
              <code> /student/check-in</code>.
            </p>
            <p>
              Nếu chưa đăng nhập và mở liên kết QR, hệ thống chỉ chuyển hướng đến đăng nhập; sau khi
              đăng nhập xong bạn vẫn phải quét lại mã QR.
            </p>
            <p>
              Nếu đã đăng nhập sẵn, truy cập vào trang này cũng không tự điểm danh. Bạn vẫn phải bật
              camera và quét lại mã QR.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
