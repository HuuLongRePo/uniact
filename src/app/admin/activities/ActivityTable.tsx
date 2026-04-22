'use client';

import Link from 'next/link';
import { CheckCircle, Eye, Edit, Trash2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Activity } from './types';

interface ActivityTableProps {
  activities: Activity[];
  loading: boolean;
  onDelete: (activity: Activity) => void;
}

export default function ActivityTable({ activities, loading, onDelete }: ActivityTableProps) {
  const now = Date.now();

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-800' },
      pending: { label: 'Đã gửi duyệt', className: 'bg-yellow-100 text-yellow-800' },
      published: { label: 'Đã công bố', className: 'bg-green-100 text-green-800' },
      completed: { label: 'Hoàn thành', className: 'bg-blue-100 text-blue-800' },
      rejected: { label: 'Bị từ chối', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-800' },
    };

    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badge.className}`}>{badge.label}</span>
    );
  };

  const getApprovalBadge = (approval: string) => {
    const badges: Record<string, { label: string; className: string; icon: LucideIcon | null }> = {
      draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-800', icon: null },
      requested: { label: 'Đã gửi duyệt', className: 'bg-yellow-100 text-yellow-800', icon: null },
      approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Bị từ chối', className: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const badge = badges[approval] || badges.draft;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${badge.className}`}
      >
        {Icon && <Icon className="w-3 h-3" />}
        {badge.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {loading && activities.length > 0 && (
        <div className="px-6 py-3 text-sm text-gray-600 border-b bg-gray-50">
          Đang cập nhật danh sách...
        </div>
      )}

      {loading && activities.length === 0 ? (
        <div className="text-center py-12 text-gray-600">Đang tải...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không tìm thấy hoạt động nào</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hoạt động
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giảng viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại / Cấp độ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tham gia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity) => {
                const activityTime = new Date(activity.date_time).getTime();
                const isArchived =
                  (activity.status === 'published' &&
                    Number.isFinite(activityTime) &&
                    activityTime <= now) ||
                  activity.status === 'completed' ||
                  activity.status === 'cancelled';

                return (
                  <tr
                    key={activity.id}
                    className={`hover:bg-gray-50 ${isArchived ? 'bg-slate-50/60' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{activity.title}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {activity.description}
                        </div>
                        {isArchived ? (
                          <div className="mt-1 text-xs font-medium text-slate-600">
                            {activity.status === 'published'
                              ? 'Đã qua hoặc đã khép lại, cần rà lại việc hoàn thành thực tế.'
                              : activity.status === 'completed'
                                ? 'Đã khép lại ở trạng thái hoàn thành.'
                                : 'Đã khép lại ở trạng thái hủy.'}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{activity.teacher_name}</td>
                    <td className="px-6 py-4 text-sm">
                      <div>{activity.activity_type}</div>
                      <div className="text-gray-500">{activity.organization_level}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(activity.date_time).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">
                        {activity.participant_count}/{activity.max_participants}
                      </div>
                      <div className="text-gray-500">{activity.points} điểm</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {getStatusBadge(activity.status)}
                        {getApprovalBadge(activity.approval_status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/activities/${activity.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/activities/${activity.id}/edit`}
                          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => onDelete(activity)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
