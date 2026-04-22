'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import AuditFilters from './AuditFilters';
import AuditTable from './AuditTable';
import DetailModal from './DetailModal';
import { AuditLog } from './types';
import { Button } from '@/components/ui/Button';

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [actorId, setActorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(action && { action }),
        ...(targetTable && { target_table: targetTable }),
        ...(actorId && { actor_id: actorId }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      });

      const response = await fetch(`/api/audit-logs?${params}`);
      const data = await response.json();

      if (response.ok) {
        setLogs(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        toast.error(data.error || 'Không thể tải audit logs');
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
      toast.error('Lỗi khi tải audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, action, targetTable, actorId, dateFrom, dateTo]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchLogs();
    }
  }, [user, authLoading, router, fetchLogs]);

  const handleReset = () => {
    setAction('');
    setTargetTable('');
    setActorId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📜 Lịch sử Audit Logs</h1>
        <p className="text-gray-600">Theo dõi tất cả các thay đổi trong hệ thống</p>
      </div>

      <AuditFilters
        action={action}
        targetTable={targetTable}
        actorId={actorId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onActionChange={(e) => {
          setAction(e);
          setPage(1);
        }}
        onTargetTableChange={(e) => {
          setTargetTable(e);
          setPage(1);
        }}
        onActorIdChange={(e) => {
          setActorId(e);
          setPage(1);
        }}
        onDateFromChange={(e) => {
          setDateFrom(e);
          setPage(1);
        }}
        onDateToChange={(e) => {
          setDateTo(e);
          setPage(1);
        }}
        onApply={() => void fetchLogs()}
        onReset={handleReset}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-600">Tổng số logs</div>
            <div className="text-2xl font-bold text-blue-700">{total}</div>
          </div>
          <div className="text-sm text-blue-600">
            Trang {page} / {totalPages}
          </div>
        </div>
      </div>

      <AuditTable logs={logs} onViewDetails={setSelectedLog} />

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="secondary"
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            variant="secondary"
          >
            Next
          </Button>
        </div>
      )}

      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
