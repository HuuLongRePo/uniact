'use client';

import { useState, useEffect } from 'react';

type Alert = {
  id: number;
  level: string;
  message: string;
  related_table?: string;
  related_id?: number;
  is_read?: number;
  created_at?: string;
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalUnread, setTotalUnread] = useState<number>(0);

  const getLevelLabel = (level?: string) => {
    const key = (level || '').toLowerCase();
    switch (key) {
      case 'warning':
        return 'Cảnh báo';
      case 'critical':
        return 'Khẩn cấp';
      case 'info':
      default:
        return 'Thông tin';
    }
  };

  const fetchAlerts = async (opts: { unreadOnly?: boolean; page?: number } = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(opts.page || page));
      qs.set('per_page', String(perPage));
      if (opts.unreadOnly) qs.set('unread', '1');
      const res = await fetch('/api/alerts?' + qs.toString());
      const j = await res.json();
      setAlerts(j.alerts || []);
      setTotal(j.meta?.total || 0);
      setTotalUnread(j.meta?.total_unread || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts({ page });
  }, [page]);

  const markRead = async (ids: number[]) => {
    if (ids.length === 0) return;
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    setSelected([]);
    fetchAlerts({ page });
  };

  const toggle = (id: number) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const toggleAll = () => {
    if (selected.length === alerts.length) setSelected([]);
    else setSelected(alerts.map((a) => a.id));
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Hộp tin (Thông báo)</h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Chưa đọc: {totalUnread}
          </span>
        </div>
        {loading && <p>Đang tải...</p>}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <button
              onClick={() => markRead(selected)}
              className="bg-blue-600 text-white px-3 py-1 rounded mr-2"
            >
              Đánh dấu đã đọc
            </button>
            <button onClick={toggleAll} className="px-3 py-1 border rounded">
              {selected.length === alerts.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div className="text-sm text-gray-600">Tổng: {total}</div>
        </div>

        <div className="space-y-3">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`p-4 border rounded ${a.is_read ? 'bg-white' : 'bg-yellow-50'}`}
            >
              <div className="flex justify-between">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(a.id)}
                    onChange={() => toggle(a.id)}
                  />
                  <div>
                    <div className="font-medium">{getLevelLabel(a.level)}</div>
                    <div className="text-sm text-gray-700">{a.message}</div>
                    <div className="text-xs text-gray-500">{a.created_at}</div>
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  {!a.is_read && (
                    <button
                      onClick={() => markRead([a.id])}
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Đã đọc
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center items-center space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded"
          >
            Trang trước
          </button>
          <div>
            Trang {page} / {totalPages}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded"
          >
            Trang sau
          </button>
        </div>
      </main>
    </div>
  );
}
