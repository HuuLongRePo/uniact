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
  const [selectedActivities, setSelectedActivities] = useState<number[]>([]);
  const [modal, setModal] = useState<{ type: 'approve' | 'reject'; activityId: number | null }>({
    type: 'approve',
    activityId: null,
  });

  useEffect(() => {
    fetchPendingActivities();
  }, []);

  const fetchPendingActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/activities/pending');
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data.activities || []);
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
      const response = await fetch(`/api/activities/${modal.activityId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data.content }),
      });
      if (!response.ok) throw new Error('Failed to approve');
      toast.success('Đã phê duyệt hoạt động');
      setModal({ type: 'approve', activityId: null });
      fetchPendingActivities();
    } catch (error: any) {
      toast.error(error.message || 'Không thể phê duyệt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (data: any) => {
    if (!modal.activityId) return;
    try {
      setActionLoading(true);
      const response = await fetch(`/api/activities/${modal.activityId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: data.content }),
      });
      if (!response.ok) throw new Error('Failed to reject');
      toast.success('Đã từ chối hoạt động');
      setModal({ type: 'reject', activityId: null });
      fetchPendingActivities();
    } catch (error: any) {
      toast.error(error.message || 'Không thể từ chối');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <ActivitySkeleton count={5} />;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Phê Duyệt Hoạt Động</h1>

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
