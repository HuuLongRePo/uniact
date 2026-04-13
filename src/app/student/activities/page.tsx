'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import ConfirmationModal from '@/components/ConfirmationModal';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';

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
  registration_status?: string | null;
  participation_source?: string | null;
  is_mandatory?: boolean;
  can_cancel?: boolean;
  applies_to_student?: boolean;
  applicability_scope?: string | null;
  applicability_reason?: string | null;
  activity_type: string | null;
  organization_level: string | null;
}

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

export default function StudentActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');
  const [registering, setRegistering] = useState<number | null>(null);
  const [cancelModalActivity, setCancelModalActivity] = useState<ActivitySummary | null>(null);
  const [registerConflict, setRegisterConflict] = useState<RegistrationConflictState | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [visibilityTab, setVisibilityTab] = useState<'applicable' | 'not_applicable'>('applicable');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchActivities();
      fetchActivityTypes();
    }
  }, [user, authLoading]);

  const fetchActivityTypes = async () => {
    try {
      const response = await fetch(resolveClientFetchUrl('/api/activity-types'));
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
      const response = await fetch(resolveClientFetchUrl('/api/activities'));
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

  const handleRegister = async (activityId: number, forceRegister: boolean = false) => {
    setRegistering(activityId);

    try {
      const selectedActivity = activities.find((activity) => activity.id === activityId);
      const response = await fetch(resolveClientFetchUrl(`/api/activities/${activityId}/register`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force_register: forceRegister }),
      });
      const data = await response.json();

      if (response.ok) {
        setRegisterConflict(null);
        toast.success('Đăng ký thành công!');
        await fetchActivities();
      } else if (
        data?.code === 'CONFLICT' &&
        data?.details?.can_override === true &&
        Array.isArray(data?.details?.conflicts)
      ) {
        setRegisterConflict({
          activityId,
          activityTitle: selectedActivity?.title || 'Hoạt động bạn chọn',
          conflicts: data.details.conflicts,
        });
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
      const response = await fetch(resolveClientFetchUrl(`/api/activities/${activityId}/register`), {
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
      const appliesToStudent = activity.applies_to_student !== false;

      if (visibilityTab === 'applicable' && !appliesToStudent) {
        return false;
      }

      if (visibilityTab === 'not_applicable' && appliesToStudent) {
        return false;
      }

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
          📅 Khám phá hoạt động
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

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setVisibilityTab('applicable')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            visibilityTab === 'applicable' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Áp dụng với tôi
        </button>
        <button
          type="button"
          onClick={() => setVisibilityTab('not_applicable')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            visibilityTab === 'not_applicable'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Không thuộc phạm vi của bạn
        </button>
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
            const isFull =
              activity.max_participants !== null &&
              activity.participant_count >= activity.max_participants;
            const appliesToStudent = activity.applies_to_student !== false;
            const isMandatory = activity.is_mandatory === true;
            const canCancel = activity.can_cancel === true;
            const applicabilityReason =
              activity.applicability_reason ||
              (appliesToStudent
                ? 'Hoạt động này đang áp dụng cho bạn.'
                : 'Bạn không thể đăng ký vì hoạt động này không áp dụng cho bạn.');

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
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      appliesToStudent
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {appliesToStudent ? 'Áp dụng với bạn' : 'Không áp dụng cho bạn'}
                  </span>
                  {isMandatory && (
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                      Bắt buộc tham gia
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
                <div
                  className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                    appliesToStudent
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {applicabilityReason}
                </div>

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
                    <div
                      className={`border px-4 py-2 rounded text-center ${
                        isMandatory
                          ? 'bg-orange-50 border-orange-200 text-orange-800'
                          : 'bg-green-50 border-green-200 text-green-700'
                      }`}
                    >
                      {isMandatory ? 'Bắt buộc tham gia' : '✅ Đã đăng ký'}
                    </div>
                    {isMandatory ? (
                      <p className="text-xs text-gray-500 text-center">
                        Bạn đã được xếp vào danh sách tham gia bắt buộc nên không thể tự hủy đăng ký
                      </p>
                    ) : canCancel ? (
                      <button
                        onClick={() => setCancelModalActivity(activity)}
                        disabled={registering === activity.id}
                        className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
                      >
                        {registering === activity.id ? 'Đang hủy...' : 'Hủy đăng ký'}
                      </button>
                    ) : (
                      <p className="text-xs text-gray-500 text-center">
                        Không thể hủy trong vòng 24 giờ trước hoạt động
                      </p>
                    )}
                  </div>
                ) : appliesToStudent ? (
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
                ) : (
                  <div className="rounded bg-gray-100 px-4 py-2 text-center text-gray-600">
                    Không thể đăng ký vì hoạt động này không áp dụng cho bạn
                  </div>
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

      <ConfirmationModal
        isOpen={!!registerConflict}
        onClose={() => setRegisterConflict(null)}
        onConfirm={() => {
          if (registerConflict) {
            handleRegister(registerConflict.activityId, true);
          }
        }}
        title="Xung đột giờ bắt đầu"
        message="Bạn đang có hoạt động khác trùng giờ bắt đầu. Nếu vẫn tiếp tục, hệ thống sẽ gửi đăng ký với xác nhận override."
        confirmText="Vẫn đăng ký"
        cancelText="Xem lại"
        confirmButtonClass="bg-amber-600 hover:bg-amber-700"
        icon={
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
        }
        details={
          registerConflict && (
            <div className="space-y-3 text-sm">
              <div className="font-semibold text-gray-900">
                Hoạt động đang đăng ký: {registerConflict.activityTitle}
              </div>
              <div className="text-gray-600">Các hoạt động đang trùng giờ bắt đầu:</div>
              <div className="space-y-2">
                {registerConflict.conflicts.map((conflict) => (
                  <div key={conflict.id} className="rounded border border-amber-200 bg-amber-50 p-3">
                    <div className="font-medium text-gray-900">{conflict.title}</div>
                    <div className="text-gray-600">
                      {new Date(conflict.date_time).toLocaleString('vi-VN')}
                    </div>
                    <div className="text-gray-600">{conflict.location}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
      />
    </div>
  );
}
