'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  activity_type_id: number;
  organization_level_id: number;
  max_participants: number;
  status: string;
  created_by: number;
}

interface ActivityFormData {
  title: string;
  description: string;
  date_time: string;
  location: string;
  activity_type_id: number;
  organization_level_id: number;
  max_participants: number;
}

type ActivityFormField = keyof ActivityFormData;

export default function AdminEditActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    description: '',
    date_time: '',
    location: '',
    activity_type_id: 1,
    organization_level_id: 1,
    max_participants: 0,
  });
  const [changes, setChanges] = useState<Partial<ActivityFormData>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/activities/${activityId}`);
      const data = await response.json();
      const resolvedActivity = data.activity || data.data?.activity || null;
      if (response.ok && resolvedActivity) {
        setActivity(resolvedActivity);
        setFormData({
          title: resolvedActivity.title,
          description: resolvedActivity.description,
          date_time: resolvedActivity.date_time,
          location: resolvedActivity.location,
          activity_type_id: resolvedActivity.activity_type_id || 1,
          organization_level_id: resolvedActivity.organization_level_id || 1,
          max_participants: resolvedActivity.max_participants || 0,
        });
      } else {
        toast.error(data.error || 'Không thể tải hoạt động');
        router.push('/admin/activities');
      }
    } catch (e) {
      console.error('Fetch activity error:', e);
      toast.error('Lỗi khi tải hoạt động');
    } finally {
      setLoading(false);
    }
  }, [activityId, router]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      void fetchActivity();
    }
  }, [user, authLoading, router, fetchActivity]);

  const handleFieldChange = <K extends ActivityFormField>(field: K, value: ActivityFormData[K]) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Track changes
    const newChanges: Partial<ActivityFormData> = {};
    if (newFormData.title !== activity?.title) newChanges.title = newFormData.title;
    if (newFormData.description !== activity?.description) {
      newChanges.description = newFormData.description;
    }
    if (newFormData.date_time !== activity?.date_time) newChanges.date_time = newFormData.date_time;
    if (newFormData.location !== activity?.location) newChanges.location = newFormData.location;
    if (newFormData.activity_type_id !== activity?.activity_type_id) {
      newChanges.activity_type_id = newFormData.activity_type_id;
    }
    if (newFormData.organization_level_id !== activity?.organization_level_id) {
      newChanges.organization_level_id = newFormData.organization_level_id;
    }
    if (newFormData.max_participants !== activity?.max_participants) {
      newChanges.max_participants = newFormData.max_participants;
    }
    setChanges(newChanges);
  };

  const handleSave = () => {
    if (Object.keys(changes).length === 0) {
      toast('Không có thay đổi', { icon: 'ℹ️' });
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    setShowConfirmModal(false);
    try {
      const response = await fetch(`/api/admin/activities/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      const data = await response.json();
      const resolvedActivity = data.activity || data.data?.activity || null;
      if (response.ok) {
        toast.success(data.message || 'Cập nhật hoạt động thành công');
        if (resolvedActivity) {
          setActivity(resolvedActivity);
        }
        setChanges({});
        setTimeout(() => router.push(`/admin/activities/${activityId}`), 1000);
      } else {
        toast.error(data.error || 'Cập nhật thất bại');
      }
    } catch (e) {
      console.error('Save activity error:', e);
      toast.error('Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Không tìm thấy hoạt động
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chỉnh Sửa Hoạt Động</h1>
        <p className="text-gray-600">
          ID: {activity.id} | Trạng thái: <span className="font-semibold">{activity.status}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-lg font-semibold text-gray-800 mb-2">
                Tiêu Đề Hoạt Động
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-lg font-semibold text-gray-800 mb-2">Mô Tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            {/* Date & Time */}
            <div className="mb-6">
              <label className="block text-lg font-semibold text-gray-800 mb-2">Ngày & Giờ</label>
              <input
                type="datetime-local"
                value={formData.date_time}
                onChange={(e) => handleFieldChange('date_time', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Location */}
            <div className="mb-6">
              <label className="block text-lg font-semibold text-gray-800 mb-2">Địa Điểm</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleFieldChange('location', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-2">
                Số Người Tối Đa
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => handleFieldChange('max_participants', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Changes Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
            <h3 className="text-lg font-semibold mb-4">📝 Thay Đổi</h3>

            {Object.keys(changes).length === 0 ? (
              <p className="text-gray-500 text-sm">Chưa có thay đổi</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(changes).map(([key, value]) => (
                  <div key={key} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">
                      {key === 'title' && 'Tiêu Đề'}
                      {key === 'description' && 'Mô Tả'}
                      {key === 'date_time' && 'Ngày & Giờ'}
                      {key === 'location' && 'Địa Điểm'}
                      {key === 'max_participants' && 'Số Người Tối Đa'}
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">
                        <strong>Cũ:</strong>{' '}
                        {String(activity?.[key as keyof Activity] || '-').substring(0, 50)}
                      </p>
                      <p className="text-xs text-blue-600">
                        <strong>Mới:</strong> {String(value || '-').substring(0, 50)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 space-y-2">
              <button
                onClick={handleSave}
                disabled={Object.keys(changes).length === 0 || saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu Thay Đổi'}
              </button>
              <button
                onClick={() => router.back()}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 rounded-lg transition"
              >
                ← Quay Lại
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-xs text-yellow-700">
                Chỉ có thể sửa hoạt động trước khi nó bắt đầu.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 space-y-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <h2 className="text-2xl font-bold">Xác Nhận Thay Đổi</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700">
                <strong>Hoạt động:</strong> {formData.title}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Số thay đổi:</strong> {Object.keys(changes).length} trường
              </p>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(changes).map(([key, value]) => (
                <div key={key} className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="font-semibold text-gray-700">{key}:</span>
                  <span className="text-blue-600 ml-1">{String(value).substring(0, 40)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmSave}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {saving ? 'Đang lưu...' : 'Xác Nhận'}
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
                className="flex-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-700 font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
