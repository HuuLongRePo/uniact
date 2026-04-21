'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import ApprovalList from './ApprovalList';
import ApprovalDialog from './ApprovalDialog';
import { Activity } from './types';

export default function AdminApprovalsPage() {
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

  useEffect(() => {
    fetchPendingActivities();
  }, [page]);

  const fetchPendingActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/activities/pending?page=${page}&limit=20`);
      if (!response.ok) throw new Error('Không thể tải danh sách hoạt động');
      const data = await response.json();
      const payload = data?.data ?? data;
      const nextActivities = payload?.activities || [];
      setActivities(nextActivities);
      setPagination(
        payload?.pagination || { page, limit: 20, total: nextActivities.length || 0, pages: 1 }
      );
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Không thể tải hoạt động');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (data: any) => {
    if (!modal.activityId) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/activities/${modal.activityId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', notes: data.content || '' }),
      });
      if (!response.ok) throw new Error('Không thể phê duyệt hoạt động');
      toast.success('Đã phê duyệt hoạt động');
      setModal({ type: 'approve', activityId: null });
      fetchPendingActivities();
    } catch (error: any) {
      toast.error(error.message || 'Không thể phê duyệt hoạt động');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (data: any) => {
    if (!modal.activityId) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/activities/${modal.activityId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', notes: data.content }),
      });
      if (!response.ok) throw new Error('Không thể từ chối hoạt động');
      toast.success('Đã từ chối hoạt động');
      setModal({ type: 'reject', activityId: null });
      fetchPendingActivities();
    } catch (error: any) {
      toast.error(error.message || 'Không thể từ chối hoạt động');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <ActivitySkeleton count={5} />;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Phê duyệt hoạt động</h1>

      {activities.length === 0 ? (
        <EmptyState
          title="Không tìm thấy dữ liệu"
          message="Hiện chưa có hoạt động nào trong danh sách này."
        />
      ) : (
        <ApprovalList
          activities={activities}
          loading={loading}
          selectedActivities={selectedActivities}
          onSelectActivity={(id) =>
            setSelectedActivities((prev) =>
              prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
            )
          }
          onSelectAll={(checked) =>
            setSelectedActivities(checked ? activities.map((a) => a.id) : [])
          }
          onApprove={(activity) => setModal({ type: 'approve', activityId: activity.id })}
          onReject={(activity) => setModal({ type: 'reject', activityId: activity.id })}
        />
      )}

      {activities.length > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-700">
            Hiển thị{' '}
            <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>-
            <span className="font-medium">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            trong tổng số <span className="font-medium">{pagination.total}</span> hoạt động chờ
            duyệt
          </p>
          {pagination.pages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={pagination.page === 1}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Trước
              </button>
              <span className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700">
                Trang {pagination.page}/{pagination.pages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(pagination.pages, prev + 1))}
                disabled={pagination.page === pagination.pages}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tiếp →
              </button>
            </div>
          )}
        </div>
      )}

      <ApprovalDialog
        type={modal.type}
        isOpen={modal.activityId !== null}
        activityId={modal.activityId}
        onClose={() => setModal({ type: 'approve', activityId: null })}
        onSubmit={modal.type === 'approve' ? handleApprove : handleReject}
        loading={actionLoading}
      />
    </div>
  );
}
