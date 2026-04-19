'use client';

import { Activity } from './types';

interface ActivityStatsProps {
  activities: Activity[];
}

export default function ActivityStats({ activities }: ActivityStatsProps) {
  const now = Date.now();
  const archivedCount = activities.filter((activity) => {
    const activityTime = new Date(activity.date_time).getTime();
    const isPastPublished =
      activity.status === 'published' && Number.isFinite(activityTime) && activityTime <= now;
    return isPastPublished || activity.status === 'completed' || activity.status === 'cancelled';
  }).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="text-2xl font-bold text-gray-900">{activities.length}</div>
        <div className="text-sm text-gray-600">Tổng số</div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="text-2xl font-bold text-yellow-600">
          {activities.filter((a) => a.status === 'pending').length}
        </div>
        <div className="text-sm text-gray-600">Chờ duyệt</div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="text-2xl font-bold text-green-600">
          {activities.filter((a) => a.status === 'published').length}
        </div>
        <div className="text-sm text-gray-600">Đã công bố</div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="text-2xl font-bold text-blue-600">
          {activities.filter((a) => a.status === 'completed').length}
        </div>
        <div className="text-sm text-gray-600">Hoàn thành</div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="text-2xl font-bold text-slate-600">{archivedCount}</div>
        <div className="text-sm text-gray-600">Đã khép lại</div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="text-2xl font-bold text-red-600">
          {activities.filter((a) => a.approval_status === 'rejected').length}
        </div>
        <div className="text-sm text-gray-600">Từ chối</div>
      </div>
    </div>
  );
}
