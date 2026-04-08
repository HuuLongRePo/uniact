'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import ConfirmationModal from '@/components/ConfirmationModal';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ActivitySummary {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  teacher_name: string;
  participant_count: number;
  max_participants: number | null;
  status: string;
  is_registered: boolean;
  activity_type: string | null;
  organization_level: string | null;
}

interface ActivityTypeOption {
  id: number;
  name: string;
  base_points?: number;
}

export default function StudentActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');
  const [registering, setRegistering] = useState<number | null>(null);
  const [cancelModalActivity, setCancelModalActivity] = useState<ActivitySummary | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchActivities();
      fetchActivityTypes();
    }
  }, [user, authLoading, router]);

  const fetchActivityTypes = async () => {
    try {
      const response = await fetch('/api/activity-types');
      const data = await response.json();

      if (response.ok) {
        setActivityTypes(data.activityTypes || data.types || []);
      }
    } catch (error) {
      console.error('Error fetching activity types:', error);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/activities');
      const data = await response.json();

      if (response.ok) {
        setActivities(data.activities || []);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Fetch activities error:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (activityId: number) => {
    setRegistering(activityId);

    try {
      const response = await fetch(`/api/activities/${activityId}/register`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Đăng ký thành công!');
        await fetchActivities();
      } else {
        toast.error(data.error || 'Đăng ký thất bại');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Lỗi khi đăng ký');
    } finally {
      setRegistering(null);
    }
  };

  const handleCancelRegistration = async (activityId: number) => {
    setRegistering(activityId);

    try {
      const response = await fetch(`/api/activities/${activityId}/register`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Hủy đăng ký thành công!');
        await fetchActivities();
      } else {
        toast.error(data.error || 'Hủy đăng ký thất bại');
      }
    } catch (error) {
      console.error('Cancel registration error:', error);
      toast.error('Lỗi khi hủy đăng ký');
    } finally {
      setRegistering(null);
    }
  };

  if (authLoading || loading) {
    return <ActivitySkeleton count={5} />;
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  const now = new Date();
  const filteredActivities = [...activities]
    .filter((activity) => {
      if (filter === 'upcoming' && new Date(activity.date_time) <= now) {
        return false;
      }

      if (selectedType !== 'all' && activity.activity_type !== selectedType) {
        return false;
      }

      if (selectedStatus === 'registered' && !activity.is_registered) {
        return false;
      }

      if (selectedStatus === 'available' && activity.is_registered) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          activity.title.toLowerCase().includes(query) ||
          activity.description.toLowerCase().includes(query) ||
          activity.location.toLowerCase().includes(query);

        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 data-testid="activities-heading" className="text-3xl font-bold">
          📅 Hoạt động có thể đăng ký
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded ${filter === 'upcoming' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Sắp diễn ra
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Tất cả
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">🔍 Tìm kiếm</label>
            <input
              data-testid="search-input"
              type="text"
              placeholder="Tìm theo tên, mô tả hoặc địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">📋 Loại hoạt động</label>
            <select
              data-testid="filter-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">Tất cả loại</option>
              {activityTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name} ({type.base_points ?? 0} điểm)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">✅ Trạng thái</label>
            <select
              data-testid="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">Tất cả</option>
              <option value="registered">Đã đăng ký</option>
              <option value="available">Chưa đăng ký</option>
            </select>
          </div>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <EmptyState
          title="Không tìm thấy dữ liệu"
          message="Hiện chưa có hoạt động nào phù hợp với bộ lọc hiện tại."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredActivities.map((activity) => {
            const activityDate = new Date(activity.date_time);
            const canCancel = (activityDate.getTime() - Date.now()) / (1000 * 60 * 60) >= 24;
            const isFull =
              activity.max_participants !== null &&
              activity.participant_count >= activity.max_participants;

            return (
              <div
                key={activity.id}
                data-testid={`activity-card-${activity.id}`}
                className="bg-white rounded-lg shadow-md p-6 border relative"
              >
                {activity.is_registered && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                      ✓ Đã đăng ký
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold mb-2 pr-24">{activity.title}</h3>

                <div className="flex gap-2 mb-3">
                  {activity.activity_type && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {activity.activity_type}
                    </span>
                  )}
                  {activity.organization_level && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      {activity.organization_level}
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 mb-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span>👨‍🏫</span>
                    <span>{activity.teacher_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{new Date(activity.date_time).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{activity.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span className={isFull ? 'text-red-500 font-bold' : ''}>
                      {activity.participant_count}/{activity.max_participants ?? 'Không giới hạn'} người
                      {isFull && ' (Đầy)'}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-3">{activity.description}</p>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => router.push(`/student/activities/${activity.id}`)}
                    className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded font-medium transition"
                  >
                    📖 Chi tiết
                  </button>
                </div>

                {activity.is_registered ? (
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-center">
                      ✅ Đã đăng ký
                    </div>
                    {canCancel && (
                      <button
                        onClick={() => setCancelModalActivity(activity)}
                        disabled={registering === activity.id}
                        className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                      >
                        {registering === activity.id ? 'Đang hủy...' : 'Hủy đăng ký'}
                      </button>
                    )}
                    {!canCancel && (
                      <p className="text-xs text-gray-500 text-center">
                        Không thể hủy trong vòng 24 giờ trước hoạt động
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleRegister(activity.id)}
                    disabled={registering === activity.id || isFull}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                  >
                    {registering === activity.id
                      ? 'Đang đăng ký...'
                      : isFull
                        ? 'Hết chỗ'
                        : 'Đăng ký ngay'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!cancelModalActivity}
        onClose={() => setCancelModalActivity(null)}
        onConfirm={() => {
          if (cancelModalActivity) {
            handleCancelRegistration(cancelModalActivity.id);
            setCancelModalActivity(null);
          }
        }}
        title="Xác nhận hủy đăng ký"
        message="Bạn có chắc chắn muốn hủy đăng ký hoạt động này?"
        confirmText="Hủy đăng ký"
        cancelText="Không, giữ lại"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        icon={
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        }
        details={
          cancelModalActivity && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Hoạt động:</span>
                <span className="font-semibold text-gray-900 text-right">
                  {cancelModalActivity.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Thời gian:</span>
                <span className="font-medium text-gray-900">
                  {formatDate(cancelModalActivity.date_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Địa điểm:</span>
                <span className="font-medium text-gray-900 text-right">
                  {cancelModalActivity.location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Giảng viên:</span>
                <span className="font-medium text-gray-900">
                  {cancelModalActivity.teacher_name}
                </span>
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
