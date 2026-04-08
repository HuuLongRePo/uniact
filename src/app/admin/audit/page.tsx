'use client';

import { useEffect, useState } from 'react';

type Audit = {
  id: number;
  actor_id?: number;
  action: string;
  target_table?: string;
  target_id?: number;
  details?: string;
  created_at?: string;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [actorFilter, setActorFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchLogs = async (opts: { page?: number } = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('page', String(opts.page || page));
      qs.set('per_page', String(perPage));
      if (actorFilter) qs.set('actor_id', actorFilter);
      if (actionFilter) qs.set('action', actionFilter);
      if (dateFrom) qs.set('date_from', dateFrom);
      if (dateTo) qs.set('date_to', dateTo);
      const res = await fetch('/api/audit-logs?' + qs.toString());
      const j = await res.json();
      setLogs(j.logs || []);
      setTotal(j.meta?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs({ page });
  }, [page]);

  return (
    <div>
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Audit Logs</h1>
        <div className="mb-4 grid grid-cols-4 gap-4">
          <input
            placeholder="Actor ID"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            placeholder="Action contains"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="p-2 border rounded"
          />
        </div>

        <div className="mb-3 flex items-center space-x-2">
          <button
            onClick={() => {
              setPage(1);
              fetchLogs({ page: 1 });
            }}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            Áp dụng
          </button>
          <button
            onClick={async () => {
              // request CSV export
              const qs = new URLSearchParams();
              if (actorFilter) qs.set('actor_id', actorFilter);
              if (actionFilter) qs.set('action', actionFilter);
              if (dateFrom) qs.set('date_from', dateFrom);
              if (dateTo) qs.set('date_to', dateTo);
              qs.set('export', 'csv');
              const res = await fetch('/api/audit-logs?' + qs.toString());
              const j = await res.json();
              const csv = j.csv || '';
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `audit-export-${new Date().toISOString()}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1 border rounded"
          >
            Xuất CSV
          </button>
        </div>

        {loading && <p>Đang tải...</p>}
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="p-3 border rounded">
              <div className="text-sm text-gray-600">
                {l.created_at} • Người thực hiện: {l.actor_id || 'hệ thống'}
              </div>
              <div className="font-medium break-words">{l.action}</div>
              {l.details && <div className="text-sm text-gray-700 mt-1">{l.details}</div>}
              <div className="text-xs text-gray-500">
                Mục tiêu: {l.target_table || '-'} #{l.target_id || '-'}
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
            Trang {page} • Tổng: {total}
          </div>
          <button
            disabled={page * perPage >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded"
          >
            Trang sau
          </button>
        </div>
      </main>
    </div>
  );
}
