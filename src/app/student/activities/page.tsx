'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ActivitySkeleton from '@/components/ActivitySkeleton';
import EmptyState from '@/components/EmptyState';
import ConfirmationModal from '@/components/ConfirmationModal';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';
import StudentActivityCard from '@/components/activity/StudentActivityCard';
import type { StudentActivitySummary as ActivitySummary } from '@/components/activity/student-activity-types';

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
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
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
      void fetchActivities();
      void fetchActivityTypes();
    }
  }, [user, authLoading, router, page, limit]);

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
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const response = await fetch(resolveClientFetchUrl(`/api/activities?${params}`));
      const data = await response.json();
      if (response.ok) {
        setActivities(data.activities || []);
        setTotal(Number(data.total || 0));
      } else {
        setActivities([]);
        setTotal(0);
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
      const response = await fetch(
        resolveClientFetchUrl(`/api/activities/${activityId}/register`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force_register: forceRegister }),
        }
      );
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
      const response = await fetch(
        resolveClientFetchUrl(`/api/activities/${activityId}/register`),
        {
          method: 'DELETE',
        }
      );
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

  useEffect(() => {
    setPage(1);
  }, [filter, visibilityTab]);

  const filteredActivities = useMemo(() => {
    const now = new Date();
    return [...activities]
      .filter((activity) => {
        const appliesToStudent = activity.applies_to_student !== false;
        if (visibilityTab === 'applicable' && !appliesToStudent) return false;
        if (visibilityTab === 'not_applicable' && appliesToStudent) return false;
        if (filter === 'upcoming' && new Date(activity.date_time) <= now) return false;
        if (selectedType !== 'all' && activity.activity_type !== selectedType) return false;
        if (selectedStatus === 'registered' && !activity.is_registered) return false;
        if (selectedStatus === 'available' && activity.is_registered) return false;

        if (searchQuery.trim()) {
          const query = searchQuery.trim().toLowerCase();
          const matchesSearch =
            activity.title.toLowerCase().includes(query) ||
            activity.description.toLowerCase().includes(query) ||
            activity.location.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  }, [activities, visibilityTab, filter, selectedType, selectedStatus, searchQuery]);

  if (authLoading || loading) {
    return <ActivitySkeleton count={5} />;
  }

  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 data-testid="activities-heading" className="text-3xl font-bold">
          📅 Khám phá hoạt động
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`rounded px-4 py-2 ${filter === 'upcoming' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Sắp diễn ra
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`rounded px-4 py-2 ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
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

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">🔍 Tìm kiếm</label>
            <input
              data-testid="search-input"
              type="text"
              placeholder="Tìm theo tên, mô tả hoặc địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">📋 Loại hoạt động</label>
            <select
              data-testid="filter-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
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
            <label className="mb-2 block text-sm font-medium">✅ Trạng thái</label>
            <select
              data-testid="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
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
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredActivities.map((activity) => (
              <StudentActivityCard
                key={activity.id}
                activity={activity}
                registering={registering}
                onView={(id) => router.push(`/student/activities/${id}`)}
                onRegister={(id) => handleRegister(id)}
                onCancel={(selectedActivity) => setCancelModalActivity(selectedActivity)}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-lg bg-white p-4 shadow">
            <p className="text-sm text-gray-700">
              Hiển thị <span className="font-medium">{(page - 1) * limit + 1}</span>-
              <span className="font-medium">{Math.min(page * limit, total)}</span> trong tổng số{' '}
              <span className="font-medium">{total}</span> hoạt động
            </p>
            {total > limit && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Trước
                </button>
                <span className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700">
                  Trang {page}/{Math.max(1, Math.ceil(total / limit))}
                </span>
                <button
                  onClick={() =>
                    setPage((prev) => Math.min(Math.max(1, Math.ceil(total / limit)), prev + 1))
                  }
                  disabled={page >= Math.max(1, Math.ceil(total / limit))}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tiếp →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={!!cancelModalActivity}
        onClose={() => setCancelModalActivity(null)}
        onConfirm={() => {
          if (cancelModalActivity) {
            void handleCancelRegistration(cancelModalActivity.id);
            setCancelModalActivity(null);
          }
        }}
        title="Xác nhận hủy đăng ký"
        message="Bạn có chắc chắn muốn hủy đăng ký hoạt động này?"
        confirmText="Hủy đăng ký"
        cancelText="Không, giữ lại"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        icon={
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        }
        details={
          cancelModalActivity && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Hoạt động:</span>
                <span className="text-right font-semibold text-gray-900">
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
                <span className="text-right font-medium text-gray-900">
                  {cancelModalActivity.location}
                </span>
              </div>
            </div>
          )
        }
      />

      {registerConflict && (
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
          details={
            <div className="space-y-2 text-sm">
              {registerConflict.conflicts.map((conflict) => (
                <div key={conflict.id} className="rounded border border-amber-200 bg-amber-50 p-3">
                  <div className="font-medium text-gray-900">{conflict.title}</div>
                  <div className="text-gray-600">{formatDate(conflict.date_time)}</div>
                  <div className="text-gray-600">{conflict.location}</div>
                </div>
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}
