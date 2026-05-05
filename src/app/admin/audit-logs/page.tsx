'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import AuditFilters from './AuditFilters';
import AuditTable from './AuditTable';
import DetailModal from './DetailModal';
import { AuditLog } from './types';

type AuditResponse = {
  logs?: AuditLog[];
  data?: {
    logs?: AuditLog[];
  };
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
  message?: string;
  error?: string;
  csv?: string;
};

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [actorId, setActorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (action) params.set('action', action);
      if (targetTable) params.set('target_table', targetTable);
      if (actorId) params.set('actor_id', actorId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as AuditResponse | null;

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai nhat ky he thong');
      }

      const nextLogs =
        payload?.logs || payload?.data?.logs || (Array.isArray(payload?.data) ? payload?.data : []);
      setLogs(Array.isArray(nextLogs) ? nextLogs : []);
      setTotal(Number(payload?.meta?.total || 0));
    } catch (fetchError) {
      console.error('Fetch audit logs error:', fetchError);
      setLogs([]);
      setTotal(0);
      setError(fetchError instanceof Error ? fetchError.message : 'Khong the tai nhat ky he thong');
    } finally {
      setLoading(false);
    }
  }, [action, actorId, dateFrom, dateTo, page, perPage, targetTable]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchLogs();
    }
  }, [authLoading, fetchLogs, router, user]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / perPage));
  }, [perPage, total]);

  async function exportCsv() {
    try {
      setExporting(true);

      const params = new URLSearchParams({ export: 'csv' });
      if (action) params.set('action', action);
      if (targetTable) params.set('target_table', targetTable);
      if (actorId) params.set('actor_id', actorId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as AuditResponse | null;

      if (!response.ok || !payload?.csv) {
        throw new Error(payload?.error || payload?.message || 'Khong the xuat CSV');
      }

      const blob = new Blob([payload.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-logs-page-${page}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Da xuat nhat ky ra CSV');
    } catch (exportError) {
      console.error('Export audit logs error:', exportError);
      toast.error(exportError instanceof Error ? exportError.message : 'Khong the xuat CSV');
    } finally {
      setExporting(false);
    }
  }

  function handleReset() {
    setAction('');
    setTargetTable('');
    setActorId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  if (authLoading || (loading && logs.length === 0 && !error)) {
    return <LoadingSpinner message="Dang tai nhat ky he thong..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                Audit logs
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="admin-audit-logs-heading"
              >
                Nhat ky chi tiet
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Doi soat thay doi he thong, actor thuc hien, doi tuong bi tac dong va xuat nhat ky
                cho kiem tra sau su co.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void fetchLogs()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Lam moi
              </button>
              <button
                type="button"
                onClick={() => void exportCsv()}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Dang xuat...' : 'Xuat CSV'}
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Co loi khi tai nhat ky</div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-slate-100 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Tong log
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{total}</div>
          </div>
          <div className="rounded-[1.5rem] bg-cyan-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Trang hien tai
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{page}</div>
          </div>
          <div className="rounded-[1.5rem] bg-violet-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Muc moi trang
            </div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{perPage}</div>
          </div>
        </section>

        <AuditFilters
          action={action}
          targetTable={targetTable}
          actorId={actorId}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onActionChange={setAction}
          onTargetTableChange={setTargetTable}
          onActorIdChange={setActorId}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onApply={() => {
            setPage(1);
            void fetchLogs();
          }}
          onReset={handleReset}
        />

        <section className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <FileText className="h-4 w-4 text-slate-600" />
            <span>
              Dang hien thi {logs.length} log tren tong {total} ban ghi.
            </span>
          </div>
        </section>

        <AuditTable logs={logs} onViewDetails={setSelectedLog} />

        {totalPages > 1 ? (
          <section className="page-surface rounded-[1.75rem] px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Trang {page} / {totalPages}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Trang truoc
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
