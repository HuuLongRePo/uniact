'use client';

import { Activity } from './types';

interface ApprovalListProps {
  activities: Activity[];
  loading: boolean;
  selectedActivities: number[];
  onSelectActivity: (id: number) => void;
  onSelectAll: (selected: boolean) => void;
  onApprove: (activity: Activity) => void;
  onReject: (activity: Activity) => void;
}

export default function ApprovalList({
  activities,
  loading,
  selectedActivities,
  onSelectActivity,
  onSelectAll,
  onApprove,
  onReject,
}: ApprovalListProps) {
  if (loading) return <div className="text-center py-8">Đang tải...</div>;
  if (activities.length === 0)
    return <div className="text-center py-8 text-gray-500">Không có hoạt động chờ phê duyệt</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={selectedActivities.length === activities.length && activities.length > 0}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-600">Chọn Tất Cả</span>
      </div>

      {activities.map((activity) => (
        <div key={activity.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex gap-3">
            <input
              type="checkbox"
              checked={selectedActivities.includes(activity.id)}
              onChange={() => onSelectActivity(activity.id)}
              className="w-4 h-4 mt-1"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{activity.title}</h3>
              <p className="text-sm text-gray-600">{activity.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                <div>📍 {activity.location}</div>
                <div>📅 {new Date(activity.date_time).toLocaleDateString('vi-VN')}</div>
                <div>👤 {activity.teacher_name || activity.creator_name || 'N/A'}</div>
                <div>👥 Tối đa {activity.max_participants} người</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onApprove(activity)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ✓ Phê Duyệt
              </button>
              <button
                onClick={() => onReject(activity)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                ✕ Từ Chối
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
