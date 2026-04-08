'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Calendar, MapPin, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import RejectReasonDialog from './RejectReasonDialog';

interface Activity {
  id: number;
  title: string;
  description: string | null;
  activity_type_name: string;
  organization_level_name: string;
  date_time: string;
  end_time: string;
  location: string | null;
  creator_name: string;
  created_at: string;
  status: string;
}

export default function PendingActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [approveTargetId, setApproveTargetId] = useState<number | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchActivities();
    }
  }, [user, authLoading, router]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/activities/pending');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setActivities(data.activities || []);
    } catch (error) {
      toast.error('Không thể tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  const quickApprove = async (activityId: number) => {
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', notes: '' }),
      });

      if (!res.ok) throw new Error('Approval failed');

      toast.success('Đã phê duyệt');
      fetchActivities();
    } catch (error) {
      toast.error('Phê duyệt thất bại');
    }
  };

  if (authLoading) return <LoadingSpinner />;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">⏳ Hoạt động chờ phê duyệt</h1>
          <p className="text-gray-600 mt-2">Danh sách các hoạt động đang chờ admin phê duyệt</p>
        </div>

        {loading && activities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="text-gray-600">Đang tải...</div>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Không có hoạt động chờ duyệt
            </h3>
            <p className="text-gray-600">Tất cả hoạt động đã được xử lý</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading && activities.length > 0 && (
              <div className="p-3 bg-gray-50 border-b text-sm text-gray-600">
                Đang cập nhật danh sách...
              </div>
            )}
            <div className="p-4 bg-yellow-50 border-b border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Có {activities.length} hoạt động cần phê duyệt</span>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {activities.map((activity) => (
                <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{activity.title}</h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          Chờ duyệt
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(activity.date_time).toLocaleDateString('vi-VN')} -{' '}
                            {new Date(activity.end_time).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{activity.location || 'Chưa xác định'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>Tạo bởi: {activity.creator_name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{activity.activity_type_name}</span>
                          {' | '}
                          <span>{activity.organization_level_name}</span>
                        </div>
                      </div>

                      {activity.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/admin/activities/${activity.id}`)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        Xem chi tiết
                      </button>
                      <button
                        onClick={() => setApproveTargetId(activity.id)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Duyệt
                      </button>
                      <button
                        onClick={() => setRejectTargetId(activity.id)}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Từ chối
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ConfirmDialog
          isOpen={approveTargetId !== null}
          title="Xác nhận phê duyệt"
          message="Bạn có chắc chắn muốn phê duyệt hoạt động này?"
          confirmText="Phê duyệt"
          cancelText="Hủy"
          variant="warning"
          onCancel={() => setApproveTargetId(null)}
          onConfirm={async () => {
            if (approveTargetId === null) return;
            const id = approveTargetId;
            setApproveTargetId(null);
            await quickApprove(id);
          }}
        />

        <RejectReasonDialog
          isOpen={rejectTargetId !== null}
          onCancel={() => setRejectTargetId(null)}
          onConfirm={async (reason) => {
            if (rejectTargetId === null) return;
            const id = rejectTargetId;
            setRejectTargetId(null);
            try {
              const res = await fetch(`/api/admin/activities/${id}/approval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', notes: reason }),
              });

              if (!res.ok) throw new Error('Rejection failed');
              toast.success('Đã từ chối');
              fetchActivities();
            } catch (error) {
              toast.error('Từ chối thất bại');
            }
          }}
        />
      </div>
    </div>
  );
}
