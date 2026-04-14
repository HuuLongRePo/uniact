'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface Registration {
  id: number;
  activity_id: number;
  attendance_status: string;
  achievement_level?: string;
  feedback?: string;
  registered_at: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  activity_status: string;
  teacher_name: string;
  participant_count: number;
  max_participants: number;
}

interface Registrations {
  upcoming: Registration[];
  completed: Registration[];
  cancelled: Registration[];
}

export default function MyActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<Registrations>({
    upcoming: [],
    completed: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'title'>('date_desc');
  const [upcomingReminders, setUpcomingReminders] = useState<number[]>([]); // Activities happening soon
  const [cancelTarget, setCancelTarget] = useState<Registration | null>(null);
  const [cancelingActivityId, setCancelingActivityId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchRegistrations();
    }
  }, [user, authLoading, router]);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/activities/my-registrations');
      const data = await response.json();

      if (response.ok) {
        setRegistrations(data.registrations);

        // Check for upcoming activities (within 24 hours)
        const now = new Date();
        const upcoming24h = data.registrations.upcoming.filter((reg: Registration) => {
          const activityTime = new Date(reg.date_time);
          const hoursUntil = (activityTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursUntil > 0 && hoursUntil <= 24;
        });

        setUpcomingReminders(upcoming24h.map((r: Registration) => r.activity_id));

        // Show toast for very soon activities (within 2 hours)
        const verySoon = upcoming24h.filter((reg: Registration) => {
          const activityTime = new Date(reg.date_time);
          const hoursUntil = (activityTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          return hoursUntil <= 2;
        });

        if (verySoon.length > 0) {
          verySoon.forEach((reg: Registration) => {
            const activityTime = new Date(reg.date_time);
            const minutesUntil = Math.round((activityTime.getTime() - now.getTime()) / (1000 * 60));
            toast(`⏰ Hoạt động "${reg.title}" sẽ diễn ra sau ${minutesUntil} phút!`, {
              duration: 8000,
              icon: '🔔',
            });
          });
        }
      }
    } catch (error) {
      console.error('Fetch registrations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (activityId: number) => {
    setCancelingActivityId(activityId);
    try {
      const response = await fetch(`/api/activities/${activityId}/register`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Hủy đăng ký thành công!');
        fetchRegistrations();
      } else {
        toast.error(data.error || 'Hủy đăng ký thất bại');
      }
    } catch (error) {
      console.error('Cancel registration error:', error);
      toast.error('Lỗi khi hủy đăng ký');
    } finally {
      setCancelingActivityId(null);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  const currentList = useMemo(() => {
    const list = [...registrations[tab]];

    const filtered = list.filter((reg) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.trim().toLowerCase();
      return (
        reg.title.toLowerCase().includes(query) ||
        reg.description.toLowerCase().includes(query) ||
        reg.location.toLowerCase().includes(query)
      );
    });

    filtered.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'vi');
      const timeA = new Date(a.date_time).getTime();
      const timeB = new Date(b.date_time).getTime();
      return sortBy === 'date_asc' ? timeA - timeB : timeB - timeA;
    });

    return filtered;
  }, [registrations, tab, searchQuery, sortBy]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 data-testid="my-activities-heading" className="text-3xl font-bold mb-6">
        📋 Hoạt Động Của Tôi
      </h1>

      {/* Upcoming Reminders Alert */}
      {upcomingReminders.length > 0 && tab === 'upcoming' && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🔔</div>
            <div className="flex-1">
              <h3 className="font-bold text-orange-900">
                Nhắc nhở: {upcomingReminders.length} hoạt động sắp diễn ra trong 24 giờ tới!
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Hãy chuẩn bị và đến đúng giờ. Kiểm tra thông tin chi tiết bên dưới.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-6 py-3 font-semibold relative ${
            tab === 'upcoming'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Sắp diễn ra ({registrations.upcoming.length})
          {upcomingReminders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {upcomingReminders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`px-6 py-3 font-semibold ${
            tab === 'completed'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Đã hoàn thành ({registrations.completed.length})
        </button>
        <button
          onClick={() => setTab('cancelled')}
          className={`px-6 py-3 font-semibold ${
            tab === 'cancelled'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Đã hủy ({registrations.cancelled.length})
        </button>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">🔍 Tìm kiếm</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm theo tên, mô tả hoặc địa điểm..."
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">↕️ Sắp xếp</label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'date_desc' | 'date_asc' | 'title')}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="date_desc">Mới nhất</option>
              <option value="date_asc">Cũ nhất</option>
              <option value="title">Theo tên A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {currentList.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">Chưa có hoạt động nào phù hợp</p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((reg) => {
            const activityDate = new Date(reg.date_time);
            const canCancel =
              tab === 'upcoming' && (activityDate.getTime() - Date.now()) / (1000 * 60 * 60) >= 24;
            const isSoon = upcomingReminders.includes(reg.activity_id);
            const hoursUntil = (activityDate.getTime() - Date.now()) / (1000 * 60 * 60);

            return (
              <div
                key={reg.id}
                className={`bg-white rounded-lg shadow-md p-6 border ${
                  tab === 'cancelled' ? 'opacity-60' : ''
                } ${isSoon ? 'border-orange-500 border-2' : ''}`}
              >
                {isSoon && (
                  <div className="bg-orange-100 border border-orange-300 text-orange-800 px-3 py-2 rounded mb-4 flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    <span className="font-medium">
                      Sắp diễn ra trong {Math.round(hoursUntil)} giờ nữa!
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{reg.title}</h3>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <span>👨‍🏫</span>
                        <span>{reg.teacher_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📅</span>
                        <span>{activityDate.toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span>{reg.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>👥</span>
                        <span>
                          {reg.participant_count}/{reg.max_participants} người
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    {/* Status badge */}
                    {tab === 'upcoming' && (
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                        ✅ Đã đăng ký
                      </span>
                    )}
                    {tab === 'completed' && reg.attendance_status === 'attended' && (
                      <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
                        ✓ Đã điểm danh
                      </span>
                    )}
                    {tab === 'completed' && reg.attendance_status === 'absent' && (
                      <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded text-sm">
                        ✗ Vắng mặt
                      </span>
                    )}
                    {tab === 'cancelled' && (
                      <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm">
                        🚫 Đã hủy
                      </span>
                    )}

                    {/* Achievement level */}
                    {reg.achievement_level && (
                      <div className="text-sm">
                        {reg.achievement_level === 'excellent' && '🏆 Xuất sắc'}
                        {reg.achievement_level === 'good' && '⭐ Tốt'}
                        {reg.achievement_level === 'participated' && '👍 Tham gia'}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{reg.description}</p>

                {/* Feedback */}
                {reg.feedback && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4">
                    <p className="text-sm font-semibold text-gray-700">💬 Nhận xét:</p>
                    <p className="text-sm text-gray-600">{reg.feedback}</p>
                  </div>
                )}

                {/* Actions */}
                {canCancel && (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setCancelTarget(reg)}
                      disabled={cancelingActivityId === reg.activity_id}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cancelingActivityId === reg.activity_id ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="xs" color="white" variant="inline" />
                          Đang hủy...
                        </span>
                      ) : (
                        'Hủy đăng ký'
                      )}
                    </button>
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-4">
                  Đăng ký lúc: {new Date(reg.registered_at).toLocaleString('vi-VN')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={cancelTarget !== null}
        title="Xác nhận hủy đăng ký"
        message={
          cancelTarget
            ? `Bạn có chắc muốn hủy đăng ký hoạt động "${cancelTarget.title}" không? Bạn sẽ mất suất tham gia hiện tại.`
            : ''
        }
        confirmText="Hủy đăng ký"
        cancelText="Quay lại"
        variant="danger"
        onCancel={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return;
          const activityId = cancelTarget.activity_id;
          setCancelTarget(null);
          await handleCancelRegistration(activityId);
        }}
      />
    </div>
  );
}
