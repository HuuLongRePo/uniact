'use client';

import { useEffect, useState } from 'react';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import ActivityDialog from '@/components/ActivityDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MoreVertical, Edit, Trash2, Send, Copy } from 'lucide-react';

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  max_participants: number;
  status: 'draft' | 'pending' | 'rejected' | 'published' | 'cancelled' | 'completed';
  participant_count: number;
  attended_count: number;
  teacher_name?: string;
  teacher_full_name?: string;
  registration_deadline?: string;
  activity_type_id?: number;
  organization_level_id?: number;
}

type ActivityFilter = 'all' | 'draft' | 'pending' | 'rejected' | 'published' | 'completed';
type ConfirmActionType = 'submit' | 'cancel' | 'clone' | 'delete';

const FILTER_OPTIONS: Array<{ value: ActivityFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Nháp' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'rejected', label: 'Bị từ chối' },
  { value: 'published', label: 'Đã phát hành' },
  { value: 'completed', label: 'Hoàn thành' },
];

export default function TeacherActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
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
      setActivities(data.activities || []);
      setTotal(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / limit));
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

      toast.success('Đã gửi hoạt động để phê duyệt');
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
      if (!res.ok) throw new Error(data.error || 'Hủy thất bại');

      toast.success('Đã hủy hoạt động');
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
      if (!res.ok) throw new Error(data.error || 'Nhân bản thất bại');

      toast.success('Đã tạo bản sao hoạt động');
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
      if (!res.ok) throw new Error(data.error || 'Xóa thất bại');

      toast.success('Đã xóa hoạt động');
      await fetchActivities();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Không thể xóa hoạt động'));
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const handleEdit = (activityId: number) => {
    setEditingActivityId(activityId);
    setDialogOpen(true);
    setOpenMenuId(null);
  };

  const handleCreateNew = () => {
    setEditingActivityId(null);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchActivities();
  };

  const openConfirmAction = (
    type: ConfirmActionType,
    activity: Pick<Activity, 'id' | 'title'>
  ) => {
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
          title: 'Xác nhận gửi phê duyệt',
          message: `Bạn có chắc muốn gửi hoạt động "${confirmAction.title}" để phê duyệt không?`,
          confirmText: 'Gửi phê duyệt',
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

  const filteredActivities = activities.filter((activity) => {
    if (filter === 'all') return true;
    return activity.status === filter;
  });

  const getStatusBadge = (status: Activity['status']) => {
    const badges: Record<Activity['status'], { className: string; label: string }> = {
      draft: { className: 'bg-gray-100 text-gray-800', label: 'Nháp' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Chờ duyệt' },
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="activities-heading">
            Quản lý hoạt động
          </h1>
          <p className="text-gray-600">Danh sách hoạt động bạn tạo, gửi duyệt và theo dõi trạng thái</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          data-testid="btn-create-activity"
        >
          + Tạo hoạt động mới
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded transition ${
                filter === option.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <EmptyState
          title="Không tìm thấy dữ liệu"
          message="Hiện chưa có hoạt động nào trong danh sách này."
        />
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const canEditAndResubmit =
              activity.status === 'draft' || activity.status === 'rejected';
            const canCancelPublished =
              activity.status === 'published' &&
              (new Date(activity.date_time).getTime() - Date.now()) / (1000 * 60 * 60) > 0;

            return (
              <div
                key={activity.id}
                className="bg-white rounded-lg shadow p-6"
                data-testid={`activity-card-${activity.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <h3 className="text-xl font-semibold text-gray-900">{activity.title}</h3>
                      {getStatusBadge(activity.status)}
                    </div>
                    <p className="text-gray-600 mt-2 line-clamp-2">{activity.description}</p>
                    {activity.teacher_name && (
                      <p className="text-sm text-gray-500 mt-1">
                        👨‍🏫 Người tạo:{' '}
                        <span className="font-medium text-gray-700">{activity.teacher_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600">📅 Thời gian:</span>
                    <div className="font-medium">
                      {new Date(activity.date_time).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">📍 Địa điểm:</span>
                    <div className="font-medium">{activity.location}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">👥 Đăng ký:</span>
                    <div className="font-medium">
                      {activity.participant_count}/{activity.max_participants}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">✓ Điểm danh:</span>
                    <div className="font-medium text-green-600">{activity.attended_count || 0}</div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  <Link
                    href={`/teacher/activities/${activity.id}/participants`}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                  >
                    📊 Quản lý người tham gia
                  </Link>

                  <Link
                    href={`/activities/${activity.id}`}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
                  >
                    👁️ Xem chi tiết
                  </Link>

                  {canEditAndResubmit && (
                    <>
                      <button
                        onClick={() => handleEdit(activity.id)}
                        disabled={actionLoading.id === activity.id}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit className="w-4 h-4" />
                        Chỉnh sửa
                      </button>

                      <button
                        onClick={() => handleSubmitApproval(activity)}
                        disabled={actionLoading.type === 'submit' && actionLoading.id === activity.id}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        {actionLoading.type === 'submit' && actionLoading.id === activity.id ? (
                          <>
                            <LoadingSpinner size="xs" color="white" variant="inline" />
                            Đang gửi...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            {activity.status === 'rejected'
                              ? 'Chỉnh sửa và gửi lại'
                              : 'Gửi phê duyệt'}
                          </>
                        )}
                      </button>
                    </>
                  )}

                  {activity.status === 'pending' && (
                    <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                      ⏳ Đang chờ phê duyệt
                    </span>
                  )}

                  {activity.status === 'rejected' && (
                    <span className="px-4 py-2 bg-red-100 text-red-800 rounded text-sm font-medium">
                      ⚠️ Cần chỉnh sửa và gửi lại
                    </span>
                  )}

                  {canCancelPublished && (
                    <button
                      onClick={() => handleCancelActivity(activity)}
                      disabled={actionLoading.type === 'cancel' && actionLoading.id === activity.id}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      {actionLoading.type === 'cancel' && actionLoading.id === activity.id ? (
                        <>
                          <LoadingSpinner size="xs" color="white" variant="inline" />
                          Đang hủy...
                        </>
                      ) : (
                        '🚫 Hủy hoạt động'
                      )}
                    </button>
                  )}

                  <div className="relative ml-auto">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === activity.id ? null : activity.id)}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>

                    {openMenuId === activity.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                        <button
                          onClick={() => handleEdit(activity.id)}
                          disabled={actionLoading.id === activity.id && actionLoading.type !== null}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <Edit className="w-4 h-4" />
                          Chỉnh sửa
                        </button>

                        <button
                          onClick={() => handleClone(activity)}
                          disabled={actionLoading.type === 'clone' && actionLoading.id === activity.id}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          {actionLoading.type === 'clone' && actionLoading.id === activity.id ? (
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
                            disabled={actionLoading.type === 'delete' && actionLoading.id === activity.id}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm border-t disabled:opacity-50"
                          >
                            {actionLoading.type === 'delete' && actionLoading.id === activity.id ? (
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
      )}

      {filteredActivities.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4 flex justify-between items-center">
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
                className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                ← Trước
              </button>
              <span className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700">
                Trang {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Tiếp →
              </button>
            </div>
          )}
        </div>
      )}

      <ActivityDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingActivityId(null);
        }}
        onSuccess={handleDialogSuccess}
        activityId={editingActivityId}
      />

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

      {openMenuId !== null && <div className="fixed inset-0 z-0" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
}
