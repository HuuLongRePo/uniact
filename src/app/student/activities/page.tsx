'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle, Search, SlidersHorizontal } from 'lucide-react';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import ConfirmationModal from '@/components/ConfirmationModal';
import EmptyState from '@/components/EmptyState';
import StudentActivityCard from '@/components/activity/StudentActivityCard';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import type { StudentActivitySummary as ActivitySummary } from '@/components/activity/student-activity-types';
import { useAuth } from '@/contexts/AuthContext';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';
import { formatDate } from '@/lib/formatters';

interface RegistrationConflictItem {
  id: number;
  title: string;
  date_time: string;
  location: string;
}

interface RegistrationConflictState {
  activityId: number;
  activityTitle: string;
  conflicts: RegistrationConflictItem[];
}

interface ActivityTypeOption {
  id: number;
  name: string;
  base_points?: number;
}

const PAGE_SIZE = 12;

function parseActivitiesResponse(payload: any) {
  const activities = payload?.activities || payload?.data?.activities || [];
  const total = Number(payload?.total || payload?.data?.total || 0);
  return { activities, total };
}

function EmptyActivitiesState() {
  return (
    <EmptyState
      title="Không tìm thấy hoạt động phù hợp"
      description="Thử đổi bộ lọc, tìm kiếm lại hoặc chuyển sang nhóm hoạt động khác."
    />
  );
}

export default function StudentActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [registering, setRegistering] = useState<number | null>(null);
  const [cancelModalActivity, setCancelModalActivity] = useState<ActivitySummary | null>(null);
  const [registerConflict, setRegisterConflict] = useState<RegistrationConflictState | null>(null);
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'all'>('upcoming');
  const [visibilityTab, setVisibilityTab] = useState<'applicable' | 'not_applicable'>('applicable');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchActivities();
      void fetchActivityTypes();
    }
  }, [authLoading, page, router, user]);

  useEffect(() => {
    setPage(1);
  }, [timeFilter, visibilityTab, selectedType, selectedStatus, searchQuery]);

  async function fetchActivityTypes() {
    try {
      const response = await fetch(resolveClientFetchUrl('/api/activity-types'));
      const payload = await response.json();
      if (!response.ok) return;

      setActivityTypes(
        payload?.activityTypes ||
          payload?.types ||
          payload?.data?.activityTypes ||
          payload?.data?.types ||
          []
      );
    } catch (error) {
      console.error('Error fetching activity types:', error);
    }
  }

  async function fetchActivities() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const response = await fetch(resolveClientFetchUrl(`/api/activities?${params.toString()}`));
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải danh sách hoạt động');
      }

      const normalized = parseActivitiesResponse(payload);
      setActivities(normalized.activities);
      setTotal(normalized.total);
    } catch (error) {
      console.error('Fetch activities error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải danh sách hoạt động'
      );
      setActivities([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(activityId: number, forceRegister: boolean = false) {
    setRegistering(activityId);
    try {
      const selectedActivity = activities.find((activity) => activity.id === activityId);
      const response = await fetch(resolveClientFetchUrl(`/api/activities/${activityId}/register`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_register: forceRegister }),
      });
      const payload = await response.json();

      if (response.ok) {
        setRegisterConflict(null);
        toast.success(payload?.message || 'Đăng ký thành công');
        await fetchActivities();
        return;
      }

      if (
        payload?.code === 'CONFLICT' &&
        payload?.details?.can_override === true &&
        Array.isArray(payload?.details?.conflicts)
      ) {
        setRegisterConflict({
          activityId,
          activityTitle: selectedActivity?.title || 'Hoạt động đã chọn',
          conflicts: payload.details.conflicts,
        });
        return;
      }

      throw new Error(payload?.error || payload?.message || 'Đăng ký thất bại');
    } catch (error) {
      console.error('Register error:', error);
      toast.error(error instanceof Error ? error.message : 'Đăng ký thất bại');
    } finally {
      setRegistering(null);
    }
  }

  async function handleCancelRegistration(activityId: number) {
    setRegistering(activityId);
    try {
      const response = await fetch(resolveClientFetchUrl(`/api/activities/${activityId}/register`), {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Hủy đăng ký thất bại');
      }

      toast.success(payload?.message || 'Hủy đăng ký thành công');
      setCancelModalActivity(null);
      await fetchActivities();
    } catch (error) {
      console.error('Cancel registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Hủy đăng ký thất bại');
    } finally {
      setRegistering(null);
    }
  }

  const filteredActivities = useMemo(() => {
    const now = Date.now();

    return [...activities]
      .filter((activity) => {
        const appliesToStudent = activity.applies_to_student !== false;
        if (visibilityTab === 'applicable' && !appliesToStudent) return false;
        if (visibilityTab === 'not_applicable' && appliesToStudent) return false;
        if (timeFilter === 'upcoming' && new Date(activity.date_time).getTime() <= now) return false;
        if (selectedType !== 'all' && activity.activity_type !== selectedType) return false;
        if (selectedStatus === 'registered' && !activity.is_registered) return false;
        if (selectedStatus === 'available' && activity.is_registered) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const matches =
            activity.title.toLowerCase().includes(query) ||
            activity.description.toLowerCase().includes(query) ||
            activity.location.toLowerCase().includes(query);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  }, [activities, searchQuery, selectedStatus, selectedType, timeFilter, visibilityTab]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);
  const applicableCount = activities.filter((activity) => activity.applies_to_student !== false).length;
  const outsideScopeCount = activities.length - applicableCount;

  if (authLoading || loading) {
    return <ActivitySkeleton count={5} />;
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                Khám phá và đăng ký
              </div>
              <h1 data-testid="activities-heading" className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                Khám phá hoạt động
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Tìm các hoạt động phù hợp, đăng ký nhanh và kiểm tra ngay các xung đột lịch học
                hay giờ bắt đầu ngay trên điện thoại.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[23rem]">
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                  Áp dụng với tôi
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{applicableCount}</div>
              </div>
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                  Ngoài phạm vi
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{outsideScopeCount}</div>
              </div>
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid gap-4 xl:flex-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <Search className="h-4 w-4" />
                  Tìm kiếm
                </span>
                <input
                  data-testid="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tên hoạt động, mô tả, địa điểm..."
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <SlidersHorizontal className="h-4 w-4" />
                  Loại hoạt động
                </span>
                <select
                  data-testid="filter-type"
                  value={selectedType}
                  onChange={(event) => setSelectedType(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                >
                  <option value="all">Tất cả loại</option>
                  {activityTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name} ({type.base_points ?? 0} điểm)
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Trạng thái</span>
                <select
                  data-testid="filter-status"
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-500/20"
                >
                  <option value="all">Tất cả</option>
                  <option value="registered">Đã đăng ký</option>
                  <option value="available">Chưa đăng ký</option>
                </select>
              </label>
            </div>

            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1" aria-label="Bộ lọc thời gian">
              <button
                data-testid="time-filter-upcoming"
                type="button"
                onClick={() => setTimeFilter('upcoming')}
                aria-pressed={timeFilter === 'upcoming'}
                className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  timeFilter === 'upcoming'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Sắp diễn ra
              </button>
              <button
                data-testid="time-filter-all"
                type="button"
                onClick={() => setTimeFilter('all')}
                aria-pressed={timeFilter === 'all'}
                className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  timeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>

          <div className="mt-5 -mx-1 flex snap-x gap-2 overflow-x-auto px-1" aria-label="Bộ lọc phạm vi">
            <button
              data-testid="scope-filter-applicable"
              type="button"
              onClick={() => setVisibilityTab('applicable')}
              aria-pressed={visibilityTab === 'applicable'}
              className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                visibilityTab === 'applicable'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20'
              }`}
            >
              Áp dụng với tôi
            </button>
            <button
              data-testid="scope-filter-not-applicable"
              type="button"
              onClick={() => setVisibilityTab('not_applicable')}
              aria-pressed={visibilityTab === 'not_applicable'}
              className={`shrink-0 snap-start rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ${
                visibilityTab === 'not_applicable'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20'
              }`}
            >
              Không thuộc phạm vi của bạn
            </button>
          </div>
        </section>

        {filteredActivities.length === 0 ? (
          <EmptyActivitiesState />
        ) : (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredActivities.map((activity) => (
                <StudentActivityCard
                  key={activity.id}
                  activity={activity}
                  registering={registering}
                  onRegister={(id) => void handleRegister(id)}
                  onCancel={(selectedActivity) => setCancelModalActivity(selectedActivity)}
                />
              ))}
            </section>

            <section className="page-surface rounded-[1.75rem] px-5 py-4 sm:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Hiển thị {rangeStart} - {rangeEnd} / {total} hoạt động
                </p>

                {total > PAGE_SIZE ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-300/60"
                    >
                      Trang trước
                    </button>
                    <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      Trang {page}/{totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page >= totalPages}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-300/60"
                    >
                      Trang sau
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!cancelModalActivity}
        onClose={() => setCancelModalActivity(null)}
        onConfirm={() => {
          if (cancelModalActivity) {
            void handleCancelRegistration(cancelModalActivity.id);
          }
        }}
        title="Xác nhận hủy đăng ký"
        message="Bạn có chắc chắn muốn hủy đăng ký hoạt động này không?"
        confirmText="Hủy đăng ký"
        cancelText="Giữ lại"
        confirmButtonClass="bg-rose-600 hover:bg-rose-700"
        icon={<AlertTriangle className="h-6 w-6 text-rose-600" />}
        details={
          cancelModalActivity ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Hoạt động</span>
                <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                  {cancelModalActivity.title}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Thời gian</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDate(cancelModalActivity.date_time)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 dark:text-slate-400">Địa điểm</span>
                <span className="text-right font-medium text-slate-900 dark:text-slate-100">
                  {cancelModalActivity.location}
                </span>
              </div>
            </div>
          ) : null
        }
      />

      {registerConflict ? (
        <ConfirmationModal
          isOpen={!!registerConflict}
          onClose={() => setRegisterConflict(null)}
          onConfirm={() => {
            const activityId = registerConflict.activityId;
            setRegisterConflict(null);
            void handleRegister(activityId, true);
          }}
          title="Xác nhận đăng ký dù trùng giờ"
          message={`Bạn đã có hoạt động khác trùng giờ bắt đầu với "${registerConflict.activityTitle}".`}
          confirmText="Vẫn đăng ký"
          cancelText="Xem lại"
          confirmButtonClass="bg-amber-600 hover:bg-amber-700"
          icon={<AlertTriangle className="h-6 w-6 text-amber-600" />}
          details={
            <div className="space-y-2 text-sm">
              {registerConflict.conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{conflict.title}</div>
                  <div className="text-slate-600 dark:text-slate-300">{formatDate(conflict.date_time)}</div>
                  <div className="text-slate-600 dark:text-slate-300">{conflict.location}</div>
                </div>
              ))}
            </div>
          }
        />
      ) : null}
    </div>
  );
}
