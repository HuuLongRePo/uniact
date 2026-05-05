'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDebounce } from '@/lib/debounce-hooks';
import ActivityFilters from './ActivityFilters';
import ActivityStats from './ActivityStats';
import ActivityTable from './ActivityTable';
import { Activity } from './types';

type ActiveQrSessionSummary = {
  session_id: number;
  expires_at: string;
};

function parseActivitiesPayload(payload: any) {
  const activities = payload?.activities || payload?.data?.activities || payload?.data || [];
  return Array.isArray(activities) ? (activities as Activity[]) : [];
}

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

  const fetchActivities = useCallback(async () => {
    try {
      setIsListLoading(true);
      const response = await fetch('/api/admin/activities');
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong the tai danh sach hoat dong');
      }

      setActivities(parseActivitiesPayload(body));
    } catch (error) {
      console.error('Admin activities fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai danh sach hoat dong');
      setActivities([]);
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchActivities();
  }, [fetchActivities, user?.id, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const intervalId = window.setInterval(() => {
      void fetchActivities();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [fetchActivities, user?.id, user?.role]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    if (activities.length === 0) {
      setActiveQrSessions({});
      return;
    }

    let cancelled = false;
    const now = Date.now();

    const candidates = activities
      .filter((activity) => activity.status === 'published' && activity.approval_status === 'approved')
      .map((activity) => {
        const date = new Date(activity.date_time).getTime();
        return { activity, date, distance: Math.abs(date - now) };
      })
      .filter(({ date }) => Number.isFinite(date))
      .sort((left, right) => left.distance - right.distance)
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
  }, [activities, user?.id, user?.role]);

  async function performDelete(id: number) {
    try {
      const response = await fetch(`/api/admin/activities/${id}`, {
        method: 'DELETE',
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error || body?.message || 'Khong the huy hoat dong');
      }

      toast.success(body?.message || 'Da huy hoat dong');
      await fetchActivities();
    } catch (error) {
      console.error('Admin activity delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi huy hoat dong');
    }
  }

  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) => {
        const matchSearch =
          effectiveSearch.length === 0 ||
          activity.title.toLowerCase().includes(effectiveSearch) ||
          activity.description.toLowerCase().includes(effectiveSearch) ||
          activity.teacher_name.toLowerCase().includes(effectiveSearch);

        const matchWorkflow = workflowFilter === 'all' || activity.status === workflowFilter;
        const matchReview = reviewFilter === 'all' || activity.approval_status === reviewFilter;

        return matchSearch && matchWorkflow && matchReview;
      }),
    [activities, effectiveSearch, reviewFilter, workflowFilter]
  );

  const archivedCount = useMemo(
    () =>
      activities.filter((activity) => {
        const activityTime = new Date(activity.date_time).getTime();
        return (
          (activity.status === 'published' && Number.isFinite(activityTime) && activityTime <= Date.now()) ||
          activity.status === 'completed' ||
          activity.status === 'cancelled'
        );
      }).length,
    [activities]
  );

  if (authLoading) {
    return <LoadingSpinner message="Dang tai khu quan ly hoat dong..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Activity operations
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Quan ly hoat dong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Admin quan sat workflow tao hoat dong, ra soat trang thai review va nhay nhanh sang
              diem danh neu QR session dang hoat dong.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchActivities()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Tai lai
            </button>
            <Link
              href="/admin/approvals"
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              Phe duyet hoat dong
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Workflow va review tach rieng</div>
            <p className="mt-2 text-sm text-slate-600">
              Admin co the loc theo trang thai van hanh cua hoat dong va ket qua review doc lap nhau.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">QR shortcut cho van hanh</div>
            <p className="mt-2 text-sm text-slate-600">
              Khi co QR session dang mo, bang se hien nut vao thang man diem danh de can thiep nhanh.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Canh bao hoat dong da qua</div>
            <p className="mt-2 text-sm text-slate-600">
              Cac hoat dong da qua hoac da khep lai duoc danh dau ro de admin ra soat viec close-out.
            </p>
          </div>
        </div>
      </section>

      <ActivityFilters
        search={search}
        onSearchChange={setSearch}
        workflowFilter={workflowFilter}
        onWorkflowFilterChange={setWorkflowFilter}
        reviewFilter={reviewFilter}
        onReviewFilterChange={setReviewFilter}
      />

      <ActivityStats activities={activities} />

      <ActivityTable
        activities={filteredActivities}
        loading={isListLoading}
        onDelete={setDeleteActivity}
        activeQrSessions={activeQrSessions}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-600">
        <div>
          Hien thi <span className="font-semibold text-slate-900">{filteredActivities.length}</span> /
          <span className="font-semibold text-slate-900"> {activities.length}</span> hoat dong.
        </div>
        <div className="mt-2">
          Trong toan bo danh sach hien co{' '}
          <span className="font-semibold text-slate-900">{archivedCount}</span> hoat dong da qua
          hoac da khep lai.
        </div>
      </section>

      <ConfirmDialog
        isOpen={!!deleteActivity}
        title="Huy hoat dong"
        message={
          deleteActivity
            ? `Ban co chac chan muon huy hoat dong "${deleteActivity.title}"?`
            : ''
        }
        confirmText="Huy hoat dong"
        cancelText="Dong"
        variant="danger"
        onCancel={() => setDeleteActivity(null)}
        onConfirm={async () => {
          if (!deleteActivity) return;
          await performDelete(deleteActivity.id);
          setDeleteActivity(null);
        }}
      />
    </div>
  );
}
