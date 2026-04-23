'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Clock,
  Download,
  History,
  Maximize2,
  QrCode as QrCodeIcon,
  RotateCw,
  X,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

const QrCodeSvg = dynamic(() => import('react-qr-code'), { ssr: false });

type Activity = {
  id: number;
  title: string;
};

interface QRSession {
  id: number;
  activity_id: number;
  session_token: string;
  created_at: string;
  expires_at: string;
  metadata: unknown;
  activity_title: string;
  activity_date: string;
  attendance_count: number;
}

interface CreatedQrSession {
  sessionId: number;
  token: string;
  payload: string;
}

interface BulkScanRecord {
  student_id: number;
  student_name: string;
  class_name: string;
  scanned_at: string;
}

type TeacherQrTab = 'create' | 'history' | 'bulk' | 'analytics';

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenCapableDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

function parseQrSessionOptions(raw: unknown): { single_use?: boolean; max_scans?: number | null } {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return raw as { single_use?: boolean; max_scans?: number | null };
  }
  return {};
}

async function loadActivityOption(activityId: number): Promise<Activity | null> {
  const res = await fetch(`/api/activities/${activityId}`);
  if (!res.ok) return null;

  const json = await res.json();
  const activity = json?.activity ?? json?.data?.activity ?? json?.data ?? json;
  if (!activity?.id || !activity?.title) return null;

  return {
    id: Number(activity.id),
    title: String(activity.title),
  };
}

export default function TeacherQRPage() {
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
  const [expiresMinutes, setExpiresMinutes] = useState<number>(10);
  const [singleUse, setSingleUse] = useState<boolean>(false);
  const [maxScans, setMaxScans] = useState<number | ''>('');
  const [createdSession, setCreatedSession] = useState<CreatedQrSession | null>(null);
  const [options, setOptions] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TeacherQrTab>('create');
  const [history, setHistory] = useState<QRSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [bulkScans, setBulkScans] = useState<BulkScanRecord[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedBulkSession, setSelectedBulkSession] = useState<number | null>(null);
  const [showQrProjector, setShowQrProjector] = useState(false);
  const [isProjectorFullscreen, setIsProjectorFullscreen] = useState(false);
  const [fullscreenAutoRequestBlocked, setFullscreenAutoRequestBlocked] = useState(false);
  const projectorRef = useRef<HTMLDivElement | null>(null);
  const projectorAutoOpenedRef = useRef(false);

  const activeBulkSessionId = selectedBulkSession ?? history[0]?.id ?? null;
  const autoProjectorRequested =
    searchParams.get('projector') === '1' || searchParams.get('fullscreen') === '1';

  const getFullscreenElement = () => {
    const fullscreenDocument = document as FullscreenCapableDocument;
    return (
      fullscreenDocument.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null
    );
  };

  const requestProjectorFullscreen = async () => {
    const element = projectorRef.current as FullscreenCapableElement | null;
    if (!element) return;

    try {
      if (typeof element.requestFullscreen === 'function') {
        await element.requestFullscreen();
      } else if (typeof element.webkitRequestFullscreen === 'function') {
        await element.webkitRequestFullscreen();
      } else {
        setFullscreenAutoRequestBlocked(true);
        return;
      }
      setFullscreenAutoRequestBlocked(false);
    } catch {
      setFullscreenAutoRequestBlocked(true);
    }
  };

  const exitProjectorFullscreen = async () => {
    const fullscreenDocument = document as FullscreenCapableDocument;

    try {
      if (typeof fullscreenDocument.exitFullscreen === 'function') {
        await fullscreenDocument.exitFullscreen();
      } else if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
        await fullscreenDocument.webkitExitFullscreen();
      }
    } catch {
      // Ignore exit errors; projector overlay can still be closed safely.
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/activities?scope=operational&status=ongoing');
        if (!res.ok) throw new Error('Không thể tải danh sách hoạt động');
        const json = await res.json();
        const list: Activity[] = json.activities || json.data?.activities || [];
        setActivities(list);

        const tabParam = searchParams.get('tab');
        if (
          tabParam === 'create' ||
          tabParam === 'history' ||
          tabParam === 'bulk' ||
          tabParam === 'analytics'
        ) {
          setActiveTab(tabParam);
        }

        const requestedIdRaw = searchParams.get('activity_id') ?? searchParams.get('activityId');
        const requestedId = requestedIdRaw ? Number(requestedIdRaw) : null;
        if (
          requestedId &&
          !Number.isNaN(requestedId) &&
          list.some((activity) => activity.id === requestedId)
        ) {
          setSelectedActivity(requestedId);
        } else if (requestedId && !Number.isNaN(requestedId)) {
          const requestedActivity = await loadActivityOption(requestedId);
          if (requestedActivity) {
            setActivities((prev) =>
              prev.some((activity) => activity.id === requestedActivity.id)
                ? prev
                : [...prev, requestedActivity]
            );
            setSelectedActivity(requestedActivity.id);
          } else if (list.length > 0) {
            setSelectedActivity(list[0].id);
          }
        } else if (list.length > 0) {
          setSelectedActivity(list[0].id);
        }
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Không thể tải danh sách hoạt động';
        setError(message);
        toast.error(message);
      }
    };
    void load();
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const hydrateActiveSession = async () => {
      if (!selectedActivity) {
        setCreatedSession(null);
        setOptions(null);
        return;
      }

      setCreatedSession(null);
      setOptions(null);

      try {
        const res = await fetch(`/api/qr-sessions/active?activity_id=${selectedActivity}`);
        if (!res.ok) return;

        const json = await res.json().catch(() => ({}));
        const session = json?.session ?? json?.data?.session ?? null;
        const nextSessionId = Number(session?.session_id ?? session?.id);
        const nextToken = String(session?.session_token ?? session?.token ?? '');

        if (cancelled || !Number.isFinite(nextSessionId) || !nextToken) {
          return;
        }

        setCreatedSession({
          sessionId: nextSessionId,
          token: nextToken,
          payload: JSON.stringify({ s: nextSessionId, t: nextToken }),
        });
        setOptions(session?.options || null);
      } catch (err) {
        console.error('Active QR session hydration error:', err);
      }
    };

    void hydrateActiveSession();

    return () => {
      cancelled = true;
    };
  }, [selectedActivity]);

  const fetchHistory = async () => {
    try {
      if (!autoRefresh) setHistoryLoading(true);
      const res = await fetch('/api/qr-sessions');
      if (!res.ok) throw new Error('Không thể tải lịch sử');
      const json = await res.json();
      setHistory(json.sessions || json.data?.sessions || []);
    } catch (err: unknown) {
      console.error(err);
      if (!autoRefresh) {
        const message = err instanceof Error ? err.message : 'Không thể tải lịch sử';
        setError(message);
        toast.error(message);
      }
    } finally {
      if (!autoRefresh) setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && autoRefresh) {
      void fetchHistory();

      refreshIntervalRef.current = setInterval(() => {
        void fetchHistory();
      }, 3000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, autoRefresh]);

  const fetchBulkScans = async () => {
    try {
      setBulkLoading(true);
      const sessionId = activeBulkSessionId;
      if (!sessionId) return;

      const res = await fetch(`/api/qr-sessions/${sessionId}/scans`);
      if (!res.ok) throw new Error('Không thể tải dữ liệu quét');
      const json = await res.json();
      setBulkScans(json.scans || json.data?.scans || []);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Không thể tải dữ liệu quét');
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    if ((activeTab === 'bulk' || activeTab === 'analytics') && activeBulkSessionId) {
      void fetchBulkScans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeBulkSessionId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsProjectorFullscreen(Boolean(getFullscreenElement()));
      if (getFullscreenElement()) {
        setFullscreenAutoRequestBlocked(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!showQrProjector) return;
    void requestProjectorFullscreen();
  }, [showQrProjector]);

  useEffect(() => {
    if (
      !autoProjectorRequested ||
      !createdSession ||
      showQrProjector ||
      projectorAutoOpenedRef.current
    ) {
      return;
    }

    projectorAutoOpenedRef.current = true;
    setShowQrProjector(true);
  }, [autoProjectorRequested, createdSession, showQrProjector]);

  useEffect(() => {
    if (autoProjectorRequested) return;
    projectorAutoOpenedRef.current = false;
  }, [autoProjectorRequested]);

  useEffect(() => {
    if (showQrProjector) return;
    setIsProjectorFullscreen(false);
    setFullscreenAutoRequestBlocked(false);
  }, [showQrProjector]);

  const handleTabChange = (tab: TeacherQrTab) => {
    setActiveTab(tab);
    if (tab === 'bulk' || tab === 'analytics') {
      void fetchBulkScans();
    }
  };

  const handleManualRefresh = () => {
    setHistoryLoading(true);
    void fetchHistory();
  };

  const openQrProjector = () => {
    if (!createdSession) return;
    setFullscreenAutoRequestBlocked(false);
    setShowQrProjector(true);
  };

  const closeQrProjector = () => {
    setShowQrProjector(false);
    setFullscreenAutoRequestBlocked(false);
    setIsProjectorFullscreen(false);
    if (getFullscreenElement()) {
      void exitProjectorFullscreen();
    }
  };

  const handleExportBulkScans = () => {
    const sessionId = activeBulkSessionId;
    if (!sessionId) {
      toast.error('Vui lòng chọn phiên QR để tải CSV');
      return;
    }

    toast.success('Đang tải tệp CSV điểm danh');
    window.location.href = `/api/qr-sessions/${sessionId}/scans/export`;
  };

  const createSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedActivity) {
      setError('Vui lòng chọn hoạt động');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, number | boolean> = {
        activity_id: selectedActivity,
        expires_minutes: Number(expiresMinutes),
      };
      if (singleUse) payload.single_use = true;
      if (maxScans !== '') payload.max_scans = Number(maxScans);

      const res = await fetch('/api/qr-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || json?.error || 'Không thể tạo phiên QR');
      }
      const data = json?.data || json;
      const nextSessionId = Number(data?.session_id);
      const nextToken = String(data?.session_token || '');

      if (!Number.isFinite(nextSessionId) || !nextToken) {
        throw new Error('Phản hồi tạo mã QR không hợp lệ');
      }

      setCreatedSession({
        sessionId: nextSessionId,
        token: nextToken,
        payload: JSON.stringify({ s: nextSessionId, t: nextToken }),
      });
      setOptions(data?.options || null);
      toast.success(
        data?.reused ? 'Đã tái sử dụng phiên QR đang hoạt động' : 'Tạo mã QR thành công'
      );
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Lỗi khi tạo phiên QR';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: TeacherQrTab; label: string; icon: typeof Clock }> = [
    { id: 'create', label: 'Tạo mã QR', icon: Clock },
    { id: 'history', label: `Lịch sử (${history.length})`, icon: History },
    { id: 'bulk', label: 'Quét hàng loạt', icon: Zap },
    { id: 'analytics', label: 'Phân tích', icon: BarChart3 },
  ];

  const analyticsClassStats = Array.from(new Set(bulkScans.map((scan) => scan.class_name))).map(
    (className) => {
      const classScans = bulkScans.filter((scan) => scan.class_name === className);
      const ratio =
        bulkScans.length > 0 ? Math.round((classScans.length / bulkScans.length) * 100) : 0;
      return { className, total: classScans.length, ratio };
    }
  );

  const analyticsByHour = (() => {
    const hourMap = new Map<string, number>();
    bulkScans.forEach((scan) => {
      const hour = new Date(scan.scanned_at).getHours().toString().padStart(2, '0');
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });
    const entries = Array.from(hourMap.entries()).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    const maxCount = entries.length > 0 ? Math.max(...entries.map(([, count]) => count)) : 0;
    return entries.map(([hour, count]) => ({
      hour,
      count,
      ratio: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
    }));
  })();

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <header className="border-b border-gray-200 px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                <QrCodeIcon className="h-6 w-6 text-blue-600" />
                Quản lý mã QR điểm danh
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
                Tạo phiên QR cho hoạt động đang diễn ra, theo dõi lượt quét và xuất báo cáo theo
                lớp.
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
              Đang có {activities.length} hoạt động khả dụng
            </div>
          </div>
        </header>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'create' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
              <form onSubmit={createSession} className="content-card space-y-5 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900">Thiết lập phiên QR</h2>

                <div>
                  <label
                    htmlFor="qr-activity-select"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Chọn hoạt động
                  </label>
                  <select
                    id="qr-activity-select"
                    value={selectedActivity ?? ''}
                    onChange={(event) => setSelectedActivity(Number(event.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    {activities.length === 0 && (
                      <option value="">Không có hoạt động đang diễn ra</option>
                    )}
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="qr-expire-minutes"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Thời lượng (phút)
                    </label>
                    <input
                      id="qr-expire-minutes"
                      type="number"
                      min={1}
                      value={expiresMinutes}
                      onChange={(event) => setExpiresMinutes(Number(event.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="qr-max-scans"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Giới hạn lượt quét
                    </label>
                    <input
                      id="qr-max-scans"
                      type="number"
                      min={1}
                      value={maxScans}
                      onChange={(event) =>
                        setMaxScans(event.target.value === '' ? '' : Number(event.target.value))
                      }
                      placeholder="Không giới hạn"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="inline-flex w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={singleUse}
                        onChange={(event) => setSingleUse(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                      />
                      Dùng một lần
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    isLoading={loading}
                    loadingText="Đang tạo..."
                    variant="primary"
                  >
                    Tạo mã QR
                  </Button>
                  {createdSession && (
                    <span className="text-sm text-gray-600">
                      Phiên hiện tại:{' '}
                      <span className="font-semibold text-gray-900">
                        {createdSession.sessionId}
                      </span>
                    </span>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </form>

              <aside className="content-card p-5 sm:p-6">
                {!createdSession ? (
                  <div className="flex h-full min-h-[18rem] flex-col items-center justify-center text-center">
                    <QrCodeIcon className="mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm text-gray-600">
                      Chưa có mã QR. Hãy tạo phiên để hiển thị mã tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-gray-500">ID phiên</div>
                      <code className="block rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-800">
                        {createdSession.sessionId}
                      </code>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Mã phiên</div>
                      <code className="block break-all rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-800">
                        {createdSession.token}
                      </code>
                    </div>
                    <div className="rounded-xl bg-white p-4">
                      <QrCodeSvg value={createdSession.payload} />
                    </div>
                    <button
                      type="button"
                      onClick={openQrProjector}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Chiếu mã QR toàn màn hình
                    </button>
                    <div className="text-xs leading-5 text-gray-600">
                      Dữ liệu QR:{' '}
                      <code className="rounded bg-gray-100 px-1 py-0.5">
                        {createdSession.payload}
                      </code>
                    </div>
                    <div className="text-xs text-gray-500">
                      Tùy chọn phiên: {JSON.stringify(options || {})}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="content-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={historyLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCw size={16} className={historyLoading ? 'animate-spin' : ''} />
                    Làm mới
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(event) => setAutoRefresh(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                    />
                    Tự động cập nhật mỗi 3 giây
                  </label>
                </div>
                <span className="text-sm text-gray-500">Tổng phiên: {history.length}</span>
              </div>

              {history.length === 0 ? (
                <div className="content-card p-12 text-center text-gray-500">
                  Chưa có lịch sử QR nào.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((session) => {
                    const sessionOptions = parseQrSessionOptions(session.metadata);
                    const isExpired = new Date(session.expires_at) < new Date();
                    return (
                      <article
                        key={session.id}
                        className="content-card p-4 transition-colors hover:bg-gray-50/70"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-base font-semibold text-gray-900">
                              {session.activity_title}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500">
                              Tạo lúc {new Date(session.created_at).toLocaleString('vi-VN')} • Hết
                              hạn {new Date(session.expires_at).toLocaleString('vi-VN')}
                            </p>
                            <p className="mt-2 text-sm text-gray-700">
                              Mã phiên:{' '}
                              <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                                {session.session_token}
                              </code>
                            </p>
                            {(sessionOptions.single_use || sessionOptions.max_scans) && (
                              <p className="mt-2 text-xs text-blue-700">
                                {sessionOptions.single_use && 'Dùng một lần'}
                                {sessionOptions.single_use && sessionOptions.max_scans ? ' • ' : ''}
                                {sessionOptions.max_scans &&
                                  `Tối đa ${sessionOptions.max_scans} lượt quét`}
                              </p>
                            )}
                          </div>
                          <div className="rounded-xl bg-gray-100 px-4 py-3 text-right">
                            <div className="text-xs uppercase tracking-wide text-gray-500">
                              Lượt quét
                            </div>
                            <div className="text-2xl font-bold text-blue-600">
                              {session.attendance_count}
                            </div>
                            <span
                              className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                                isExpired
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {isExpired ? 'Đã hết hạn' : 'Còn hiệu lực'}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'bulk' || activeTab === 'analytics') && (
            <div className="content-card space-y-4 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                <div>
                  <label
                    htmlFor="qr-bulk-session"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Chọn phiên QR
                  </label>
                  <select
                    id="qr-bulk-session"
                    value={selectedBulkSession ?? ''}
                    onChange={(event) => setSelectedBulkSession(Number(event.target.value) || null)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn phiên --</option>
                    {history.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.activity_title} -{' '}
                        {new Date(session.created_at).toLocaleString('vi-VN')}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => void fetchBulkScans()}
                  disabled={bulkLoading || !activeBulkSessionId}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCw size={16} className={bulkLoading ? 'animate-spin' : ''} />
                  Làm mới dữ liệu
                </button>

                <button
                  type="button"
                  onClick={handleExportBulkScans}
                  disabled={!activeBulkSessionId}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={16} />
                  Xuất CSV
                </button>
              </div>

              {activeTab === 'bulk' ? (
                bulkScans.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
                    Chưa có lượt quét trong phiên đã chọn.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                            Học viên
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                            Lớp
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                            Thời gian quét
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {bulkScans.map((scan, index) => (
                          <tr
                            key={`${scan.student_id}-${scan.scanned_at}-${index}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {scan.student_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{scan.class_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(scan.scanned_at).toLocaleString('vi-VN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : bulkScans.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
                  Chưa có dữ liệu để phân tích.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <div className="text-sm text-blue-900">Tổng lượt quét</div>
                      <div className="mt-2 text-3xl font-bold text-blue-700">
                        {bulkScans.length}
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-sm text-emerald-900">Học viên đã quét</div>
                      <div className="mt-2 text-3xl font-bold text-emerald-700">
                        {new Set(bulkScans.map((scan) => scan.student_id)).size}
                      </div>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                      <div className="text-sm text-violet-900">Lớp tham gia</div>
                      <div className="mt-2 text-3xl font-bold text-violet-700">
                        {new Set(bulkScans.map((scan) => scan.class_name)).size}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <section className="rounded-xl border border-gray-200 p-4">
                      <h3 className="text-base font-semibold text-gray-900">Phân bổ theo lớp</h3>
                      <div className="mt-4 space-y-3">
                        {analyticsClassStats.map((row) => (
                          <div key={row.className} className="space-y-1">
                            <div className="flex items-center justify-between text-sm text-gray-700">
                              <span className="font-medium">{row.className}</span>
                              <span>
                                {row.total} lượt ({row.ratio}%)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-200">
                              <div
                                className="h-2 rounded-full bg-blue-600 transition-all"
                                style={{ width: `${row.ratio}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 p-4">
                      <h3 className="text-base font-semibold text-gray-900">Phân bổ theo giờ</h3>
                      {analyticsByHour.length === 0 ? (
                        <p className="mt-3 text-sm text-gray-500">Chưa có dữ liệu theo giờ.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {analyticsByHour.map((row) => (
                            <div key={row.hour} className="space-y-1">
                              <div className="flex items-center justify-between text-sm text-gray-700">
                                <span>{row.hour}:00</span>
                                <span>{row.count} lượt</span>
                              </div>
                              <div className="h-2 rounded-full bg-gray-200">
                                <div
                                  className="h-2 rounded-full bg-emerald-600 transition-all"
                                  style={{ width: `${row.ratio}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {showQrProjector && createdSession && (
        <div ref={projectorRef} className="fixed inset-0 z-[70] bg-black p-4 sm:p-8">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-300">Trình chiếu QR</p>
                <h2 className="text-lg font-semibold text-white sm:text-xl">
                  Giảng viên chiếu mã để học viên quét
                </h2>
              </div>
              <button
                type="button"
                onClick={closeQrProjector}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
                Đóng
              </button>
            </div>

            {!isProjectorFullscreen && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/85 px-3 py-2 text-xs text-slate-200 sm:text-sm">
                <button
                  type="button"
                  onClick={() => void requestProjectorFullscreen()}
                  data-testid="projector-fullscreen-cta"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 sm:text-sm"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Bật toàn màn hình
                </button>
                <span className="text-slate-300" data-testid="projector-fullscreen-hint">
                  {fullscreenAutoRequestBlocked
                    ? 'Trình duyệt đã chặn tự động toàn màn hình. Hãy bấm nút trên để tiếp tục.'
                    : 'Nếu chưa vào toàn màn hình, hãy bấm nút trên để chiếu QR.'}
                </span>
              </div>
            )}

            <div className="mt-5 flex flex-1 items-center justify-center">
              <div className="rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
                <div className="w-[min(86vw,860px)]">
                  <QrCodeSvg value={createdSession.payload} />
                </div>
              </div>
            </div>

            <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-center text-xs text-slate-200 sm:text-sm">
              Phiên #{createdSession.sessionId} • Mã phiên: {createdSession.token}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
