'use client';

import { useEffect, useState } from 'react';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  MoreVertical,
  Edit,
  Trash2,
  Send,
  Copy,
  Eye,
  Users,
  CalendarDays,
  MapPin,
  Maximize2,
  UserCheck2,
  Ban,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { type ActivityDisplayStatus } from '@/lib/activity-workflow';
import { formatDate } from '@/lib/formatters';
import { parseVietnamDate } from '@/lib/timezone';

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  max_participants: number;
  status: 'draft' | 'pending' | 'rejected' | 'published' | 'cancelled' | 'completed';
  display_status: ActivityDisplayStatus;
  approval_status?: string;
  participant_count: number;
  attended_count: number;
  teacher_name?: string;
  teacher_full_name?: string;
  registration_deadline?: string;
  activity_type_id?: number;
  organization_level_id?: number;
}

interface ActiveQrSessionSummary {
  id: number;
  session_id: number;
  expires_at: string;
}

type ActivityFilter =
  | 'all'
  | 'draft'
  | 'pending'
  | 'rejected'
  | 'published'
  | 'completed'
  | 'cancelled';
type ConfirmActionType = 'submit' | 'cancel' | 'clone' | 'delete';

const FILTER_OPTIONS: Array<{ value: ActivityFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'pending', label: 'Đã gửi duyệt' },
  { value: 'rejected', label: 'Bị từ chối' },
  { value: 'published', label: 'Đã phát hành' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export default function TeacherActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const limit = 10;

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: ConfirmActionType;
    id: number;
    title: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<{
    type: 'submit' | 'cancel' | 'clone' | 'delete' | null;
    id: number | null;
  }>({ type: null, id: null });
  const [activeQrSessions, setActiveQrSessions] = useState<Record<number, ActiveQrSessionSummary>>(
    {}
  );

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const fetchActivities = useEffectEventCompat(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        teacher_id: 'me',
        page: page.toString(),
        limit: limit.toString(),
        ...(filter !== 'all' && { status: filter }),
      });

      const response = await fetch(`/api/activities?${params}`);
      if (!response.ok) {
        throw new Error('Không thể tải danh sách hoạt động');
      }

      const data = await response.json();
      const resolvedActivities = data.activities || data.data?.activities || [];
      const resolvedTotal = data.total ?? data.data?.total ?? 0;

      setActivities(resolvedActivities);
      setTotal(resolvedTotal);
      setTotalPages(Math.ceil(resolvedTotal / limit));
    } catch (error: unknown) {
      console.error('Error fetching activities:', error);
      toast.error(getErrorMessage(error, 'Không thể tải danh sách hoạt động'));
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    fetchActivities();
  }, [page, filter, fetchActivities]);

  useEffect(() => {
    if (activities.length === 0) {
      setActiveQrSessions({});
      return;
    }

    let cancelled = false;

    const fetchActiveQrSessions = async () => {
      const publishedActivities = activities.filter(
        (activity) => getDisplayStatus(activity) === 'published'
      );

      if (publishedActivities.length === 0) {
        if (!cancelled) {
          setActiveQrSessions({});
        }
        return;
      }

      const entries = await Promise.all(
        publishedActivities.map(async (activity) => {
          try {
            const res = await fetch(`/api/qr-sessions/active?activity_id=${activity.id}`);
            if (!res.ok) return null;

            const data = await res.json();
            const session = data?.data?.session || data?.session;
            if (!session?.session_id) return null;

            return [
              activity.id,
              {
                id: Number(session.id || session.session_id),
                session_id: Number(session.session_id),
                expires_at: String(session.expires_at || ''),
              },
            ] as const;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      setActiveQrSessions(
        Object.fromEntries(
          entries.filter((entry): entry is readonly [number, ActiveQrSessionSummary] =>
            Boolean(entry)
          )
        )
      );
    };

    void fetchActiveQrSessions();

    return () => {
      cancelled = true;
    };
  }, [activities]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const submitApproval = async (activityId: number) => {
    setActionLoading({ type: 'submit', id: activityId });
    try {
      const response = await fetch(`/api/activities/${activityId}/submit-approval`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Không thể gửi phê duyệt');
      }

      toast.success(data.message || 'Đã gửi duyệt hoạt động');
      await fetchActivities();
    } catch (error: unknown) {
      console.error('Error submitting approval:', error);
      toast.error(getErrorMessage(error, 'Không thể gửi phê duyệt'));
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const cancelActivity = async (activityId: number) => {
    setActionLoading({ type: 'cancel', id: activityId });
    try {
      const res = await fetch(`/api/activities/${activityId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Hủy thất bại');

      toast.success(data.message || 'Đã hủy hoạt động');
      await fetchActivities();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Không thể hủy hoạt động'));
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const cloneActivity = async (activityId: number) => {
    setActionLoading({ type: 'clone', id: activityId });
    try {
      const res = await fetch(`/api/activities/${activityId}/clone`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Nhân bản thất bại');

      toast.success(data.message || 'Đã tạo bản sao hoạt động');
      await fetchActivities();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Không thể nhân bản hoạt động'));
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const deleteActivity = async (activityId: number) => {
    setActionLoading({ type: 'delete', id: activityId });
    try {
      const res = await fetch(`/api/activities/${activityId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Xóa thất bại');

      toast.success(data.message || 'Đã xóa hoạt động');
      await fetchActivities();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Không thể xóa hoạt động'));
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const openConfirmAction = (type: ConfirmActionType, activity: Pick<Activity, 'id' | 'title'>) => {
    setConfirmAction({ type, id: activity.id, title: activity.title });
    setOpenMenuId(null);
  };

  const handleSubmitApproval = (activity: Pick<Activity, 'id' | 'title'>) => {
    openConfirmAction('submit', activity);
  };

  const handleCancelActivity = (activity: Pick<Activity, 'id' | 'title'>) => {
    openConfirmAction('cancel', activity);
  };

  const handleClone = (activity: Pick<Activity, 'id' | 'title'>) => {
    openConfirmAction('clone', activity);
  };

  const handleDelete = (activity: Pick<Activity, 'id' | 'title'>) => {
    openConfirmAction('delete', activity);
  };

  const confirmDialogConfig = (() => {
    if (!confirmAction) return null;

    switch (confirmAction.type) {
      case 'submit':
        return {
          title: 'Xác nhận gửi duyệt hoạt động',
          message: `Bạn có chắc muốn gửi duyệt hoạt động "${confirmAction.title}" không?`,
          confirmText: 'Gửi duyệt',
          variant: 'warning' as const,
        };
      case 'cancel':
        return {
          title: 'Xác nhận hủy hoạt động',
          message: `Bạn có chắc muốn hủy hoạt động "${confirmAction.title}" không? Sau khi hủy, hoạt động sẽ không còn mở cho người tham gia.`,
          confirmText: 'Hủy hoạt động',
          variant: 'danger' as const,
        };
      case 'clone':
        return {
          title: 'Xác nhận nhân bản hoạt động',
          message: `Bạn có muốn tạo bản sao từ hoạt động "${confirmAction.title}" không?`,
          confirmText: 'Tạo bản sao',
          variant: 'info' as const,
        };
      case 'delete':
        return {
          title: 'Xác nhận xóa hoạt động',
          message: `Bạn có chắc muốn xóa hoạt động "${confirmAction.title}" không? Hành động này không thể hoàn tác.`,
          confirmText: 'Xóa hoạt động',
          variant: 'danger' as const,
        };
      default:
        return null;
    }
  })();

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, id } = confirmAction;
    setConfirmAction(null);

    if (type === 'submit') {
      await submitApproval(id);
      return;
    }

    if (type === 'cancel') {
      await cancelActivity(id);
      return;
    }

    if (type === 'clone') {
      await cloneActivity(id);
      return;
    }

    await deleteActivity(id);
  };

  const now = Date.now();

  const getDisplayStatus = (activity: Activity) => activity.display_status || activity.status;
  const isPublished = (activity: Activity) => getDisplayStatus(activity) === 'published';
  const isCompletedOrCancelled = (activity: Activity) =>
    getDisplayStatus(activity) === 'completed' || getDisplayStatus(activity) === 'cancelled';
  const getActivityTimestamp = (activity: Activity) =>
    parseVietnamDate(activity.date_time)?.getTime() ?? Number.NaN;

  const sortedActivities = [...activities].sort((a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title, 'vi');
    }

    const timeA = getActivityTimestamp(a);
    const timeB = getActivityTimestamp(b);
    return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
  });

  const upcomingActivities = sortedActivities.filter((activity) => {
    const activityTime = getActivityTimestamp(activity);
    return isPublished(activity) && Number.isFinite(activityTime) && activityTime > now;
  });

  const archivedActivities = sortedActivities.filter((activity) => {
    const activityTime = getActivityTimestamp(activity);
    const isPastPublished =
      isPublished(activity) && Number.isFinite(activityTime) && activityTime <= now;
    return isPastPublished || isCompletedOrCancelled(activity);
  });

  const remainingActivities = sortedActivities.filter((activity) => {
    const activityTime = getActivityTimestamp(activity);
    const isUpcomingPublished =
      isPublished(activity) && Number.isFinite(activityTime) && activityTime > now;
    const isArchived =
      (isPublished(activity) && Number.isFinite(activityTime) && activityTime <= now) ||
      isCompletedOrCancelled(activity);

    return !isUpcomingPublished && !isArchived;
  });

  const getStatusBadge = (status: Activity['status']) => {
    const badges: Record<Activity['status'], { className: string; label: string }> = {
      draft: { className: 'bg-gray-100 text-gray-800', label: 'Nháp' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Đã gửi duyệt' },
      rejected: { className: 'bg-red-100 text-red-800', label: 'Bị từ chối' },
      published: { className: 'bg-green-100 text-green-800', label: 'Đã phát hành' },
      cancelled: { className: 'bg-red-100 text-red-800', label: 'Đã hủy' },
      completed: { className: 'bg-blue-100 text-blue-800', label: 'Hoàn thành' },
    };

    const badge = badges[status];
    return (
      <span
        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return <ActivitySkeleton count={5} />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface rounded-[1.75rem] p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1
              className="text-2xl font-bold text-gray-900 sm:text-3xl"
              data-testid="activities-heading"
            >
              Quản lý hoạt động
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              Danh sách hoạt động do giảng viên phụ trách, theo dõi theo từng giai đoạn xử lý và mở
              điểm danh đúng thời điểm.
            </p>
          </div>
          <Link
            href="/teacher/activities/new"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
            data-testid="btn-create-activity"
          >
            <Plus className="h-4 w-4" />
            Tạo hoạt động mới
          </Link>
        </div>

        <div className="content-card mb-6 space-y-4 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filter === option.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="teacher-activity-sort"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Sắp xếp:
            </label>
            <select
              id="teacher-activity-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'newest' | 'oldest' | 'title')}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="title">Theo tên A-Z</option>
            </select>
          </div>
        </div>

        {sortedActivities.length === 0 ? (
          <EmptyState
            title="Không tìm thấy dữ liệu"
            message="Hiện chưa có hoạt động nào trong danh sách này."
          />
        ) : (
          <div className="space-y-6">
            <div className="content-card rounded-2xl p-4 text-sm text-gray-600">
              Hiển thị {sortedActivities.length} hoạt động, gồm {upcomingActivities.length} sắp diễn
              ra, {archivedActivities.length} đã qua hoặc đã khép lại và{' '}
              {remainingActivities.length} hoạt động còn đang cần theo dõi xử lý.
            </div>
            {upcomingActivities.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-amber-900">Sắp diễn ra</h2>
                    <p className="text-sm text-amber-700">
                      Ưu tiên theo dõi các hoạt động đã phát hành và sắp đến giờ bắt đầu.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-amber-800">
                    {upcomingActivities.length} hoạt động
                  </span>
                </div>
                <div className="space-y-3">
                  {upcomingActivities.map((activity) => {
                    const activeQrSession = activeQrSessions[activity.id];
                    return (
                      <div
                        key={`upcoming-${activity.id}`}
                        className="content-card rounded-2xl border-amber-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-base font-semibold text-gray-900">
                              {activity.title}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">{activity.location}</div>
                            <div className="mt-1 text-sm text-gray-500">
                              {formatDate(activity.date_time)}
                            </div>
                          </div>
                          {getStatusBadge(getDisplayStatus(activity))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Link
                            href={`/activities/${activity.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                          >
                            <Eye className="h-4 w-4" />
                            Xem chi tiết
                          </Link>
                          {activeQrSession && (
                            <>
                              <Link
                                href={`/teacher/qr?activity_id=${activity.id}&session_id=${activeQrSession.session_id}`}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                              >
                                <UserCheck2 className="h-4 w-4" />
                                Điểm danh
                              </Link>
                              <Link
                                href={`/teacher/qr?activity_id=${activity.id}&session_id=${activeQrSession.session_id}&projector=1`}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <Maximize2 className="h-4 w-4" />
                                Chiếu QR toàn màn hình
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {archivedActivities.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Đã qua hoặc đã khép lại
                    </h2>
                    <p className="text-sm text-slate-700">
                      Gom các hoạt động đã hết thời gian diễn ra, đã hoàn thành hoặc đã hủy để danh
                      sách chính đỡ lẫn với việc đang xử lý.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-800">
                    {archivedActivities.length} hoạt động
                  </span>
                </div>
                <div className="space-y-3">
                  {archivedActivities.map((activity) => {
                    const activityTime = getActivityTimestamp(activity);
                    const isStalePublished =
                      isPublished(activity) && Number.isFinite(activityTime) && activityTime <= now;

                    return (
                      <div
                        key={`archived-${activity.id}`}
                        className="content-card rounded-2xl border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-base font-semibold text-gray-900">
                              {activity.title}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">{activity.location}</div>
                            <div className="mt-1 text-sm text-gray-500">
                              {formatDate(activity.date_time)}
                            </div>
                            <div className="mt-2 text-xs font-medium text-slate-600">
                              {isStalePublished
                                ? 'Đã quá thời điểm diễn ra, cần xác nhận hoàn thành hoặc cập nhật trạng thái.'
                                : getDisplayStatus(activity) === 'completed'
                                  ? 'Hoạt động đã được khép lại ở trạng thái hoàn thành.'
                                  : 'Hoạt động đã được khép lại ở trạng thái hủy.'}
                            </div>
                          </div>
                          {getStatusBadge(getDisplayStatus(activity))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {remainingActivities.map((activity) => {
                const canEditAndResubmit =
                  getDisplayStatus(activity) === 'draft' ||
                  getDisplayStatus(activity) === 'rejected';
                const canCancelPublished =
                  getDisplayStatus(activity) === 'published' &&
                  (getActivityTimestamp(activity) - Date.now()) / (1000 * 60 * 60) > 0;
                const activeQrSession = activeQrSessions[activity.id];

                return (
                  <div
                    key={activity.id}
                    className="content-card rounded-2xl p-5 shadow-sm sm:p-6"
                    data-testid={`activity-card-${activity.id}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <h3 className="text-xl font-semibold text-gray-900">{activity.title}</h3>
                          {getStatusBadge(getDisplayStatus(activity))}
                        </div>
                        <p className="text-gray-600 mt-2 line-clamp-2">{activity.description}</p>
                        {activity.teacher_name && (
                          <p className="mt-1 text-sm text-gray-500">
                            Người tạo:{' '}
                            <span className="font-medium text-gray-700">
                              {activity.teacher_name}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <CalendarDays className="h-4 w-4" />
                          Thời gian:
                        </span>
                        <div className="font-medium text-gray-800">
                          {formatDate(activity.date_time)}
                        </div>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          Địa điểm:
                        </span>
                        <div className="font-medium text-gray-800">{activity.location}</div>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" />
                          Đăng ký:
                        </span>
                        <div className="font-medium text-gray-800">
                          {activity.participant_count}/{activity.max_participants}
                        </div>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <UserCheck2 className="h-4 w-4" />
                          Điểm danh:
                        </span>
                        <div className="font-medium text-green-600">
                          {activity.attended_count || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                      <Link
                        href={`/teacher/activities/${activity.id}/participants`}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Users className="h-4 w-4" />
                        Quản lý người tham gia
                      </Link>

                      <Link
                        href={`/activities/${activity.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-300"
                      >
                        <Eye className="h-4 w-4" />
                        Xem chi tiết
                      </Link>

                      {activeQrSession && (
                        <>
                          <Link
                            href={`/teacher/qr?activity_id=${activity.id}&session_id=${activeQrSession.session_id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            <UserCheck2 className="h-4 w-4" />
                            Điểm danh
                          </Link>
                          <Link
                            href={`/teacher/qr?activity_id=${activity.id}&session_id=${activeQrSession.session_id}&projector=1`}
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Maximize2 className="h-4 w-4" />
                            Chiếu QR toàn màn hình
                          </Link>
                        </>
                      )}

                      {canEditAndResubmit && (
                        <>
                          <Link
                            href={`/teacher/activities/${activity.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                          >
                            <Edit className="w-4 h-4" />
                            Chỉnh sửa
                          </Link>

                          <button
                            onClick={() => handleSubmitApproval(activity)}
                            disabled={
                              actionLoading.type === 'submit' && actionLoading.id === activity.id
                            }
                            className="inline-flex items-center gap-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading.type === 'submit' && actionLoading.id === activity.id ? (
                              <>
                                <LoadingSpinner size="xs" color="white" variant="inline" />
                                Đang gửi...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                {getDisplayStatus(activity) === 'rejected'
                                  ? 'Chỉnh sửa và gửi lại'
                                  : 'Gửi duyệt'}
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {getDisplayStatus(activity) === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
                          Đã gửi duyệt, đang chờ xử lý
                        </span>
                      )}

                      {getDisplayStatus(activity) === 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-800">
                          Cần chỉnh sửa và gửi lại
                        </span>
                      )}

                      {canCancelPublished && (
                        <button
                          onClick={() => handleCancelActivity(activity)}
                          disabled={
                            actionLoading.type === 'cancel' && actionLoading.id === activity.id
                          }
                          className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {actionLoading.type === 'cancel' && actionLoading.id === activity.id ? (
                            <>
                              <LoadingSpinner size="xs" color="white" variant="inline" />
                              Đang hủy...
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4" />
                              Hủy hoạt động
                            </>
                          )}
                        </button>
                      )}

                      <div className="relative ml-auto">
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === activity.id ? null : activity.id)
                          }
                          className="rounded-full p-2 transition hover:bg-gray-100"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>

                        {openMenuId === activity.id && (
                          <div className="absolute right-0 z-10 mt-2 w-48 rounded-xl border bg-white shadow-lg">
                            <Link
                              href={`/teacher/activities/${activity.id}/edit`}
                              onClick={() => setOpenMenuId(null)}
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4" />
                              Chỉnh sửa
                            </Link>

                            <button
                              onClick={() => handleClone(activity)}
                              disabled={
                                actionLoading.type === 'clone' && actionLoading.id === activity.id
                              }
                              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                              {actionLoading.type === 'clone' &&
                              actionLoading.id === activity.id ? (
                                <>
                                  <LoadingSpinner size="xs" color="gray" variant="inline" />
                                  Đang nhân bản...
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Nhân bản
                                </>
                              )}
                            </button>

                            {canEditAndResubmit && (
                              <button
                                onClick={() => handleDelete(activity)}
                                disabled={
                                  actionLoading.type === 'delete' &&
                                  actionLoading.id === activity.id
                                }
                                className="flex w-full items-center gap-2 border-t px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {actionLoading.type === 'delete' &&
                                actionLoading.id === activity.id ? (
                                  <>
                                    <LoadingSpinner size="xs" color="gray" variant="inline" />
                                    Đang xóa...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4" />
                                    Xóa
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {sortedActivities.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-700">
              Hiển thị <span className="font-medium">{(page - 1) * limit + 1}</span>-
              <span className="font-medium">{Math.min(page * limit, total)}</span> trong tổng số{' '}
              <span className="font-medium">{total}</span> hoạt động
            </p>

            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </button>
                <span className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700">
                  Trang {page}/{totalPages}
                </span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tiếp
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {confirmDialogConfig && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          title={confirmDialogConfig.title}
          message={confirmDialogConfig.message}
          confirmText={confirmDialogConfig.confirmText}
          cancelText="Quay lại"
          variant={confirmDialogConfig.variant}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}

      {openMenuId !== null && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenMenuId(null)} />
      )}
    </div>
  );
}
