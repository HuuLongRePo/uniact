'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import ApprovalDialog from './ApprovalDialog';
import ApprovalList from './ApprovalList';
import { Activity, ApprovalSubmission } from './types';

export default function AdminApprovalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedActivities, setSelectedActivities] = useState<number[]>([]);
  const [modal, setModal] = useState<{ type: 'approve' | 'reject'; activityId: number | null }>({
    type: 'approve',
    activityId: null,
  });

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  const fetchPendingActivities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/activities/pending?page=${page}&limit=20`);
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong the tai danh sach cho duyet');
      }

      const payload = body?.data ?? body;
      const nextActivities = Array.isArray(payload?.activities) ? payload.activities : [];
      setActivities(nextActivities);
      setPagination(
        payload?.pagination || { page, limit: 20, total: nextActivities.length || 0, pages: 1 }
      );
    } catch (error) {
      console.error('Admin approvals fetch error:', error);
      toast.error(getErrorMessage(error, 'Khong the tai danh sach cho duyet'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchPendingActivities();
  }, [fetchPendingActivities, user?.id, user?.role]);

  function closeModal() {
    setModal({ type: 'approve', activityId: null });
  }

  async function handleApprove(data: ApprovalSubmission) {
    if (!modal.activityId) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/activities/${modal.activityId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', notes: data.content || '' }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong the phe duyet hoat dong');
      }

      toast.success(body?.message || 'Da phe duyet hoat dong');
      closeModal();
      await fetchPendingActivities();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Khong the phe duyet hoat dong'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(data: ApprovalSubmission) {
    if (!modal.activityId) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/activities/${modal.activityId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes: data.content }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong the tu choi hoat dong');
      }

      toast.success(body?.message || 'Da tu choi hoat dong');
      closeModal();
      await fetchPendingActivities();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Khong the tu choi hoat dong'));
    } finally {
      setActionLoading(false);
    }
  }

  const readyToReview = useMemo(
    () => activities.filter((activity) => activity.approval_status === 'requested').length,
    [activities]
  );

  if (authLoading) {
    return <LoadingSpinner message="Dang tai khu phe duyet..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading) return <ActivitySkeleton count={4} />;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Review workflow
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Phe duyet hoat dong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Tong hop cac hoat dong teacher vua gui len de admin phe duyet nhanh, tu choi ro ly do
              va giam nguy co tac nghen workflow.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchPendingActivities()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Tai lai
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Tong hoat dong trong trang</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-950">{activities.length}</div>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">Cho duyet ngay</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-950">{readyToReview}</div>
          </div>
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-800">Dang duoc chon</div>
            <div className="mt-3 text-3xl font-semibold text-violet-950">{selectedActivities.length}</div>
          </div>
        </div>
      </section>

      {activities.length === 0 ? (
        <EmptyState
          title="Khong tim thay du lieu"
          message="Hien chua co hoat dong nao trong danh sach cho duyet."
        />
      ) : (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-3">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-cyan-700" />
                Kiem soat chat luong
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Giu cho workflow ro rang: duyet nhanh neu hop le, tu choi co ghi chu neu can sua.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                Phe duyet co ghi chu
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Co the them ghi chu noi bo khi dua hoat dong sang trang thai duoc duyet.
              </p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <XCircle className="h-4 w-4 text-rose-700" />
                Tu choi co ly do
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Teacher can nhin thay ly do cu the de sua hoat dong, tranh vong lap hoi dap.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <ApprovalList
              activities={activities}
              loading={loading}
              selectedActivities={selectedActivities}
              onSelectActivity={(id) =>
                setSelectedActivities((prev) =>
                  prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                )
              }
              onSelectAll={(checked) =>
                setSelectedActivities(checked ? activities.map((activity) => activity.id) : [])
              }
              onApprove={(activity) => setModal({ type: 'approve', activityId: activity.id })}
              onReject={(activity) => setModal({ type: 'reject', activityId: activity.id })}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
            <div>
              Hien thi{' '}
              <span className="font-semibold text-slate-900">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>
              -
              <span className="font-semibold text-slate-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              trong tong so <span className="font-semibold text-slate-900">{pagination.total}</span>{' '}
              hoat dong cho duyet.
            </div>

            {pagination.pages > 1 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={pagination.page === 1}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trang truoc
                </button>
                <span className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-700">
                  {pagination.page}/{pagination.pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <ApprovalDialog
        type={modal.type}
        isOpen={modal.activityId !== null}
        activityId={modal.activityId}
        onClose={closeModal}
        onSubmit={modal.type === 'approve' ? handleApprove : handleReject}
        loading={actionLoading}
      />
    </div>
  );
}
