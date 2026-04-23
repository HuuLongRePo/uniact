'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDebounce } from '@/lib/debounce-hooks';
import ActivityFilters from './ActivityFilters';
import ActivityStats from './ActivityStats';
import ActivityTable from './ActivityTable';
import { Activity } from './types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type ActiveQrSessionSummary = {
  session_id: number;
  expires_at: string;
};

export default function AdminActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [reviewFilter, setReviewFilter] = useState<string>('all');
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null);
  const [activeQrSessions, setActiveQrSessions] = useState<Record<number, ActiveQrSessionSummary>>(
    {}
  );

  const debouncedSearch = useDebounce(search, 400);
  const effectiveSearch = debouncedSearch.trim().toLowerCase();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchActivities();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const intervalId = window.setInterval(() => {
      fetchActivities();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (activities.length === 0) {
      setActiveQrSessions({});
      return;
    }

    let cancelled = false;
    const now = Date.now();

    const candidates = activities
      .filter(
        (activity) => activity.status === 'published' && activity.approval_status === 'approved'
      )
      .map((activity) => {
        const date = new Date(activity.date_time).getTime();
        return { activity, date, distance: Math.abs(date - now) };
      })
      .filter(({ date }) => Number.isFinite(date))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30)
      .map(({ activity }) => activity);

    if (candidates.length === 0) {
      setActiveQrSessions({});
      return;
    }

    const fetchActiveSessions = async () => {
      const entries = await Promise.all(
        candidates.map(async (activity) => {
          try {
            const response = await fetch(`/api/qr-sessions/active?activity_id=${activity.id}`);
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) return null;

            const session = payload?.data?.session ?? payload?.session;
            if (!session) return null;

            const sessionId = Number(session?.session_id ?? session?.id ?? 0);
            const expiresAt = String(session?.expires_at ?? '');
            if (!Number.isFinite(sessionId) || sessionId <= 0 || !expiresAt) return null;

            return [activity.id, { session_id: sessionId, expires_at: expiresAt }] as const;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const nextSessions: Record<number, ActiveQrSessionSummary> = {};
      for (const entry of entries) {
        if (!entry) continue;
        nextSessions[entry[0]] = entry[1];
      }

      setActiveQrSessions(nextSessions);
    };

    void fetchActiveSessions();

    return () => {
      cancelled = true;
    };
  }, [activities, user]);

  const fetchActivities = async () => {
    try {
      setIsListLoading(true);
      const response = await fetch('/api/admin/activities');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || data.data?.activities || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Không thể tải danh sách hoạt động');
    } finally {
      setIsListLoading(false);
    }
  };

  const performDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/activities/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.success(data.message || 'Đã hủy hoạt động');
        fetchActivities();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Không thể xóa hoạt động');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Lỗi khi xóa hoạt động');
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchSearch =
      effectiveSearch.length === 0 ||
      activity.title.toLowerCase().includes(effectiveSearch) ||
      activity.description.toLowerCase().includes(effectiveSearch) ||
      activity.teacher_name.toLowerCase().includes(effectiveSearch);

    const matchWorkflow = workflowFilter === 'all' || activity.status === workflowFilter;
    const matchReview = reviewFilter === 'all' || activity.approval_status === reviewFilter;

    return matchSearch && matchWorkflow && matchReview;
  });

  if (authLoading) return <LoadingSpinner />;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý hoạt động</h1>
            <p className="text-gray-600 mt-2">Tất cả hoạt động trong hệ thống</p>
            <p className="text-sm text-gray-500 mt-1">
              Danh sách tự làm mới định kỳ để giảm nguy cơ bỏ sót hoạt động vừa được duyệt.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchActivities()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
            <Link
              href="/admin/approvals"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCircle className="w-5 h-5" />
              Phê duyệt hoạt động
            </Link>
          </div>
        </div>

        {/* Filters */}
        <ActivityFilters
          search={search}
          onSearchChange={setSearch}
          workflowFilter={workflowFilter}
          onWorkflowFilterChange={setWorkflowFilter}
          reviewFilter={reviewFilter}
          onReviewFilterChange={setReviewFilter}
        />

        {/* Stats Summary */}
        <ActivityStats activities={activities} />

        {/* Activities Table */}
        <ActivityTable
          activities={filteredActivities}
          loading={isListLoading}
          onDelete={(activity) => setDeleteActivity(activity)}
          activeQrSessions={activeQrSessions}
        />

        {/* Total count */}
        <div className="mt-4 space-y-2 text-sm text-gray-600 text-center">
          <div>
            Hiển thị {filteredActivities.length} / {activities.length} hoạt động
          </div>
          <div>
            Trong toàn bộ danh sách hiện có{' '}
            {
              activities.filter((activity) => {
                const activityTime = new Date(activity.date_time).getTime();
                return (
                  (activity.status === 'published' &&
                    Number.isFinite(activityTime) &&
                    activityTime <= Date.now()) ||
                  activity.status === 'completed' ||
                  activity.status === 'cancelled'
                );
              }).length
            }{' '}
            hoạt động đã qua hoặc đã khép lại.
          </div>
        </div>

        <ConfirmDialog
          isOpen={!!deleteActivity}
          title="Xác nhận xóa hoạt động"
          message={
            deleteActivity ? `Bạn có chắc chắn muốn hủy hoạt động "${deleteActivity.title}"?` : ''
          }
          confirmText="Hủy hoạt động"
          cancelText="Hủy"
          variant="danger"
          onCancel={() => setDeleteActivity(null)}
          onConfirm={async () => {
            if (!deleteActivity) return;
            await performDelete(deleteActivity.id);
            setDeleteActivity(null);
          }}
        />
      </div>
    </div>
  );
}
