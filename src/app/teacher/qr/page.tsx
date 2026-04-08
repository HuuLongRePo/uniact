'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Clock, History, RotateCw, Zap, BarChart3, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });

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
  metadata: string;
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

export default function TeacherQRPage() {
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
  const [expiresMinutes, setExpiresMinutes] = useState<number>(5);
  const [singleUse, setSingleUse] = useState<boolean>(false);
  const [maxScans, setMaxScans] = useState<number | ''>('');
  const [createdSession, setCreatedSession] = useState<CreatedQrSession | null>(null);
  const [options, setOptions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'bulk' | 'analytics'>('create');
  const [history, setHistory] = useState<QRSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [bulkScans, setBulkScans] = useState<BulkScanRecord[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedBulkSession, setSelectedBulkSession] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/activities');
        if (!res.ok) throw new Error('Không thể tải danh sách hoạt động');
        const json = await res.json();
        const list: Activity[] = json.activities || [];
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

        const requestedIdRaw = searchParams.get('activity_id');
        const requestedId = requestedIdRaw ? Number(requestedIdRaw) : null;
        if (requestedId && !Number.isNaN(requestedId) && list.some((a) => a.id === requestedId)) {
          setSelectedActivity(requestedId);
        } else if (list.length > 0) {
          setSelectedActivity(list[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Lỗi');
      }
    };
    load();
  }, [searchParams]);

  // Auto-refresh history when in history tab and auto-refresh is enabled
  useEffect(() => {
    if (activeTab === 'history' && autoRefresh) {
      // Initial fetch
      fetchHistory();

      // Set up interval for periodic refresh (every 3 seconds)
      refreshIntervalRef.current = setInterval(() => {
        fetchHistory();
      }, 3000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [activeTab, autoRefresh]);

  const fetchHistory = async () => {
    try {
      // Only set loading if we're not in auto-refresh mode
      if (!autoRefresh) setHistoryLoading(true);
      const res = await fetch('/api/qr-sessions');
      if (!res.ok) throw new Error('Không thể tải lịch sử');
      const json = await res.json();
      setHistory(json.sessions || []);
    } catch (err: any) {
      console.error(err);
      if (!autoRefresh) setError(err?.message || 'Lỗi khi tải lịch sử');
    } finally {
      if (!autoRefresh) setHistoryLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setHistoryLoading(true);
    fetchHistory();
  };

  const handleTabChange = (tab: 'create' | 'history' | 'bulk' | 'analytics') => {
    setActiveTab(tab);
    if (tab === 'bulk' || tab === 'analytics') {
      fetchBulkScans();
    }
  };

  const fetchBulkScans = async () => {
    try {
      setBulkLoading(true);
      const sessionId = selectedBulkSession || history[0]?.id;
      if (!sessionId) return;

      const res = await fetch(`/api/qr-sessions/${sessionId}/scans`);
      if (!res.ok) throw new Error('Không thể tải dữ liệu quét');
      const json = await res.json();
      setBulkScans(json.scans || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Không thể tải dữ liệu quét');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportBulkScans = () => {
    const sessionId = selectedBulkSession || history[0]?.id;
    if (!sessionId) {
      toast.error('Vui lòng chọn phiên QR để tải CSV');
      return;
    }

    toast.success('Đang tải tệp CSV điểm danh');
    window.location.href = `/api/qr-sessions/${sessionId}/scans/export`;
  };

  const createSession = async (e: any) => {
    e.preventDefault();
    if (!selectedActivity) return setError('Vui lòng chọn hoạt động');
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
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
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j?.message || j?.error || 'Không thể tạo phiên QR');
      }
      const data = j?.data || j;
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
      toast.success('Tạo mã QR thành công');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Lỗi khi tạo phiên');
      toast.error(err?.message || 'Lỗi khi tạo phiên');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Quản lý mã QR điểm danh</h1>

        {/* Tab Navigation */}
        <div className="border-b flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => handleTabChange('create')}
            className={`py-3 px-6 font-medium flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
          >
            <Clock size={18} />
            Tạo mã QR
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`py-3 px-6 font-medium flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
          >
            <History size={18} />
            Lịch sử ({history.length})
          </button>
          <button
            onClick={() => handleTabChange('bulk')}
            className={`py-3 px-6 font-medium flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bulk' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
            }`}
          >
            <Zap size={18} />
            Bulk Scan
          </button>
          <button
            onClick={() => handleTabChange('analytics')}
            className={`py-3 px-6 font-medium flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600'
            }`}
          >
            <BarChart3 size={18} />
            Phân tích
          </button>
        </div>

        {activeTab === 'create' ? (
          <>
            <form onSubmit={createSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Chọn hoạt động</label>
                <select
                  value={selectedActivity ?? ''}
                  onChange={(e) => setSelectedActivity(Number(e.target.value))}
                  className="mt-1 block w-full border rounded p-2"
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4">
                <div>
                  <label className="block text-sm">Thời lượng (phút)</label>
                  <input
                    type="number"
                    value={expiresMinutes}
                    onChange={(e) => setExpiresMinutes(Number(e.target.value))}
                    className="mt-1 border rounded p-2 w-32"
                  />
                </div>
                <div>
                  <label className="block text-sm">Dùng một lần</label>
                  <input
                    type="checkbox"
                    checked={singleUse}
                    onChange={(e) => setSingleUse(e.target.checked)}
                    className="ml-2"
                  />
                </div>
                <div>
                  <label className="block text-sm">Giới hạn số lượt quét</label>
                  <input
                    type="number"
                    value={maxScans as any}
                    onChange={(e) =>
                      setMaxScans(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1 border rounded p-2 w-32"
                  />
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  isLoading={loading}
                  loadingText="Đang tạo..."
                  variant="primary"
                >
                  Tạo mã QR
                </Button>
              </div>
            </form>

            {error && <p className="text-red-600 mt-4">{error}</p>}

            {createdSession && (
              <div className="mt-6 border rounded p-4 bg-blue-50">
                <div className="mb-3">
                  ID phiên:{' '}
                  <code className="bg-white px-2 py-1 rounded font-mono text-sm">
                    {createdSession.sessionId}
                  </code>
                </div>
                <div className="mb-3">
                  Mã phiên:{' '}
                  <code className="bg-white px-2 py-1 rounded font-mono text-sm">
                    {createdSession.token}
                  </code>
                </div>
                <div className="mb-3">Tùy chọn: {JSON.stringify(options || {})}</div>
                <div className="mb-3 break-all text-sm text-gray-700">
                  Dữ liệu QR:{' '}
                  <code className="bg-white px-2 py-1 rounded">{createdSession.payload}</code>
                </div>
                <div className="bg-white p-4 inline-block">
                  {/* react-qr-code renders SVG */}
                  <QRCode value={createdSession.payload} />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Chia sẻ mã QR này cho học viên. Mã đã chứa cả session_id và qr_token.
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'bulk' ? (
          <>
            {/* Bulk Scan Mode */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Chọn phiên QR</label>
              <select
                value={selectedBulkSession || ''}
                onChange={(e) => setSelectedBulkSession(Number(e.target.value) || null)}
                className="block w-full border rounded p-2"
              >
                <option value="">-- Chọn phiên --</option>
                {history.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.activity_title} -{' '}
                    {new Date(session.created_at).toLocaleString('vi-VN')} (
                    {session.attendance_count} quét)
                  </option>
                ))}
              </select>
            </div>

            {(selectedBulkSession || history.length > 0) && (
              <>
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => fetchBulkScans()}
                    disabled={bulkLoading}
                    className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RotateCw size={16} className={bulkLoading ? 'animate-spin' : ''} />
                    Làm mới
                  </button>
                  <button
                    onClick={handleExportBulkScans}
                    className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50 text-blue-600"
                  >
                    <Download size={16} />
                    Xuất CSV
                  </button>
                </div>

                {bulkScans.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="border px-4 py-2 text-left">Học viên</th>
                          <th className="border px-4 py-2 text-left">Lớp</th>
                          <th className="border px-4 py-2 text-left">Thời gian quét</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkScans.map((scan, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="border px-4 py-2">{scan.student_name}</td>
                            <td className="border px-4 py-2">{scan.class_name}</td>
                            <td className="border px-4 py-2">
                              {new Date(scan.scanned_at).toLocaleString('vi-VN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Chưa có lượt quét nào</p>
                )}
              </>
            )}
          </>
        ) : activeTab === 'analytics' ? (
          <>
            {/* Analytics View */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Chọn phiên QR</label>
              <select
                value={selectedBulkSession || ''}
                onChange={(e) => setSelectedBulkSession(Number(e.target.value) || null)}
                className="block w-full border rounded p-2"
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

            {(selectedBulkSession || history.length > 0) && bulkScans.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="border rounded p-4 bg-blue-50">
                    <div className="text-sm text-gray-600 font-medium">Tổng lượt quét</div>
                    <div className="text-3xl font-bold text-blue-600 mt-2">{bulkScans.length}</div>
                  </div>
                  <div className="border rounded p-4 bg-green-50">
                    <div className="text-sm text-gray-600 font-medium">Học viên quết</div>
                    <div className="text-3xl font-bold text-green-600 mt-2">
                      {new Set(bulkScans.map((s) => s.student_id)).size}
                    </div>
                  </div>
                  <div className="border rounded p-4 bg-purple-50">
                    <div className="text-sm text-gray-600 font-medium">Lớp tham gia</div>
                    <div className="text-3xl font-bold text-purple-600 mt-2">
                      {new Set(bulkScans.map((s) => s.class_name)).size}
                    </div>
                  </div>
                </div>

                {/* Class Summary */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Thống kê theo lớp</h3>
                  <div className="space-y-3">
                    {Array.from(new Set(bulkScans.map((s) => s.class_name))).map((cls) => {
                      const classScans = bulkScans.filter((s) => s.class_name === cls);
                      const percentage = Math.round((classScans.length / bulkScans.length) * 100);
                      return (
                        <div key={cls}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{cls}</span>
                            <span className="text-sm text-gray-600">
                              {classScans.length} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Time Distribution */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Phân bố theo thời gian</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 border-b">
                          <th className="border px-4 py-2 text-left">Giờ</th>
                          <th className="border px-4 py-2 text-left">Số lượt quét</th>
                          <th className="border px-4 py-2 text-left">Biểu đồ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const hourMap = new Map<string, number>();
                          bulkScans.forEach((scan) => {
                            const hour = new Date(scan.scanned_at)
                              .getHours()
                              .toString()
                              .padStart(2, '0');
                            hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
                          });
                          const maxCount = Math.max(...Array.from(hourMap.values()));
                          return Array.from(hourMap.entries()).map(([hour, count]) => (
                            <tr key={hour} className="border-b hover:bg-gray-50">
                              <td className="border px-4 py-2">{hour}:00</td>
                              <td className="border px-4 py-2">{count}</td>
                              <td className="border px-4 py-2">
                                <div className="w-32 bg-gray-200 rounded h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded transition-all"
                                    style={{ width: `${(count / maxCount) * 100}%` }}
                                  ></div>
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={handleManualRefresh}
                disabled={historyLoading}
                className="flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCw size={16} className={historyLoading ? 'animate-spin' : ''} />
                Làm mới
              </button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Tự động cập nhật (mỗi 3 giây)
              </label>
            </div>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((session) => {
                  const options = session.metadata ? JSON.parse(session.metadata) : {};
                  const isExpired = new Date(session.expires_at) < new Date();
                  return (
                    <div key={session.id} className="border rounded p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg">{session.activity_title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Mã:{' '}
                            <code className="bg-gray-100 px-2 py-1 rounded">
                              {session.session_token.substring(0, 8)}...
                            </code>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Tạo: {new Date(session.created_at).toLocaleString('vi-VN')} | Hết hạn:{' '}
                            {new Date(session.expires_at).toLocaleString('vi-VN')}
                          </p>
                          {(options.single_use || options.max_scans) && (
                            <p className="text-xs text-blue-600 mt-1">
                              {options.single_use && '• Dùng một lần'}{' '}
                              {options.max_scans && `• Giới hạn ${options.max_scans} lượt`}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm text-gray-600">Quét</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {session.attendance_count}
                          </div>
                          {isExpired && (
                            <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              Đã hết hạn
                            </span>
                          )}
                          {!isExpired && (
                            <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              Còn hiệu lực
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Chưa có lịch sử QR nào</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
