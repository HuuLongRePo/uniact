import { ActivityWithTeacher } from '@/types/database';
import { formatDate, formatTime, getStatusBadgeColor, getStatusText } from '@/lib/utils';

interface ActivityCardProps {
  activity: ActivityWithTeacher;
  showActions?: boolean;
}

export default function ActivityCard({ activity, showActions = false }: ActivityCardProps) {
  const availableSlots =
    activity.available_slots ?? activity.max_participants - (activity.participant_count || 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{activity.title}</h3>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(activity.status)}`}
        >
          {getStatusText(activity.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center">
          <span className="font-medium">🗓️ Thời gian:</span>
          <span className="ml-2">{formatDate(activity.date_time)}</span>
        </div>

        <div className="flex items-center">
          <span className="font-medium">📍 Địa điểm:</span>
          <span className="ml-2">{activity.location}</span>
        </div>

        <div className="flex items-center">
          <span className="font-medium">👨‍🏫 Giảng viên:</span>
          <span className="ml-2">{activity.teacher_name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-medium">👥 Số lượng:</span>
            <span className="ml-2">
              {activity.participant_count || 0}/{activity.max_participants}
              {availableSlots > 0 && (
                <span className="text-green-600 ml-1">({availableSlots} chỗ trống)</span>
              )}
            </span>
          </div>
        </div>

        {activity.description && (
          <div>
            <span className="font-medium">📝 Mô tả:</span>
            <p className="mt-1 text-gray-700 line-clamp-2">{activity.description}</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex space-x-2">
          <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
            Tham gia
          </button>
          <button className="bg-gray-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-600 transition-colors">
            Chi tiết
          </button>
        </div>
      )}
    </div>
  );
}
