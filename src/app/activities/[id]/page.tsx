'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import AttachmentUploader from '@/components/AttachmentUploader';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  status: string;
  approval_status: string;
  activity_type: string;
  organization_level: string;
  teacher_name: string;
  max_participants: number;
  registered_count: number;
}

export default function ActivityDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const activityId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && activityId) fetchActivity();
  }, [user, authLoading, router, activityId]);

  const fetchActivity = async () => {
    if (!activityId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/activities/${activityId}`);
      const data = await res.json();
      if (res.ok) {
        setActivity(data.activity ?? data);
      } else {
        toast.error('Không thể tải thông tin hoạt động');
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!activity) {
    return <div className="p-6">Không tìm thấy hoạt động</div>;
  }

  const canManage = user?.role === 'admin' || user?.role === 'teacher';
  const isPast = new Date(activity.date_time) < new Date();

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline">
        ← Quay lại
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{activity.title}</h1>
            <div className="flex gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  activity.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : activity.status === 'draft'
                      ? 'bg-gray-100 text-gray-800'
                      : activity.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                }`}
              >
                {activity.status === 'published'
                  ? 'Đã công bố'
                  : activity.status === 'draft'
                    ? 'Nháp'
                    : activity.status === 'cancelled'
                      ? 'Đã hủy'
                      : 'Hoàn thành'}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  activity.approval_status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : activity.approval_status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {activity.approval_status === 'approved'
                  ? '✓ Đã phê duyệt'
                  : activity.approval_status === 'rejected'
                    ? '✗ Từ chối'
                    : activity.approval_status === 'requested'
                      ? '⏳ Chờ duyệt'
                      : '📝 Nháp'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-600">📅 Thời gian</div>
            <div className="font-medium">
              {new Date(activity.date_time).toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">📍 Địa điểm</div>
            <div className="font-medium">{activity.location}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">🏷️ Loại hoạt động</div>
            <div className="font-medium">{activity.activity_type}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">📊 Cấp độ tổ chức</div>
            <div className="font-medium">{activity.organization_level}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">👤 Giảng viên phụ trách</div>
            <div className="font-medium">{activity.teacher_name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">👥 Đăng ký / Tối đa</div>
            <div className="font-medium">
              {activity.registered_count} / {activity.max_participants}
            </div>
          </div>
        </div>

        {activity.description && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-1">📝 Mô tả</div>
            <div className="whitespace-pre-wrap text-gray-800">{activity.description}</div>
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="mb-6">
        <AttachmentUploader activityId={Number(activityId)} canUpload={canManage} />
      </div>

      {/* Action buttons for teacher/admin */}
      {canManage && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">⚙️ Quản lý</h3>
          <div className="flex gap-3 flex-wrap">
            <Link
              href={`/teacher/activities/${activityId}/participants`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              👥 Danh sách tham gia
            </Link>
            <Link
              href={`/teacher/attendance/${activityId}`}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              ✓ Điểm danh
            </Link>
            {!isPast && (
              <Link
                href={`/teacher/activities/${activityId}/edit`}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                ✏️ Chỉnh sửa
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
