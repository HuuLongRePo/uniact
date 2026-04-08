'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Send, AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface ActivityType {
  id: number;
  name: string;
}

interface OrganizationLevel {
  id: number;
  name: string;
}

interface Class {
  id: number;
  name: string;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  max_participants: number | null;
  activity_type_id: number | null;
  organization_level_id: number | null;
  classes: Class[];
}

interface UploadedFile {
  id: number;
  name: string;
  size: number;
}

export default function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'draft' | 'submit'>('draft');
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [activityTypeId, setActivityTypeId] = useState<number | ''>('');
  const [organizationLevelId, setOrganizationLevelId] = useState<number | ''>('');
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);

  // Options
  const [classes, setClasses] = useState<Class[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [organizationLevels, setOrganizationLevels] = useState<OrganizationLevel[]>([]);

  useEffect(() => {
    fetchAllData();
  }, [id]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [actRes, classesRes, typesRes, levelsRes] = await Promise.all([
        fetch(`/api/activities/${id}`),
        fetch('/api/classes?mine=1'),
        fetch('/api/activity-types'),
        fetch('/api/organization-levels'),
      ]);

      if (!actRes.ok) throw new Error('Không thể tải hoạt động');

      const actData = await actRes.json();
      const activity = actData.activity || actData;

      // Check if editable
      if (activity.status !== 'draft' && activity.status !== 'rejected') {
        toast.error('Chỉ có thể chỉnh sửa hoạt động nháp hoặc bị từ chối');
        router.push('/teacher/activities');
        return;
      }

      setActivity(activity);
      setTitle(activity.title);
      setDescription(activity.description);

      const [dateOnly, timeOnly] = activity.date_time.split('T');
      setDate(dateOnly);
      setTime(timeOnly?.substring(0, 5) || '00:00');

      setLocation(activity.location);
      setMaxParticipants(activity.max_participants || '');
      setActivityTypeId(activity.activity_type_id || '');
      setOrganizationLevelId(activity.organization_level_id || '');
      setSelectedClasses(activity.classes.map((c: Class) => c.id));

      if (classesRes.ok) {
        const classData = await classesRes.json();
        setClasses(classData.classes || []);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setActivityTypes(typesData.activity_types || []);
      }

      if (levelsRes.ok) {
        const levelsData = await levelsRes.json();
        setOrganizationLevels(levelsData.organization_levels || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu');
      router.push('/teacher/activities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, mode: 'draft' | 'submit') => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên hoạt động');
      return;
    }
    if (!description.trim()) {
      toast.error('Vui lòng nhập mô tả');
      return;
    }
    if (!date) {
      toast.error('Vui lòng chọn ngày');
      return;
    }
    if (selectedClasses.length === 0) {
      toast.error('Vui lòng chọn ít nhất một lớp');
      return;
    }

    try {
      setSubmitting(true);
      const dateTime = time ? `${date}T${time}` : `${date}T00:00`;

      const response = await fetch(`/api/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          date_time: dateTime,
          location,
          max_participants: maxParticipants ? parseInt(String(maxParticipants)) : null,
          activity_type_id: activityTypeId ? parseInt(String(activityTypeId)) : null,
          organization_level_id: organizationLevelId ? parseInt(String(organizationLevelId)) : null,
          class_ids: selectedClasses,
          status: mode === 'draft' ? 'draft' : 'pending_approval',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Không thể cập nhật hoạt động');
      }

      toast.success(mode === 'draft' ? 'Lưu nháp thành công' : 'Gửi duyệt thành công');
      router.push('/teacher/activities');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Không thể cập nhật hoạt động');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <p className="text-gray-600">Không tìm thấy hoạt động</p>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = activity.status === 'rejected';
  const isDraft = activity.status === 'draft';
  const canEdit = isDraft || isRejected;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/teacher/activities')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>
          {!canEdit && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <Lock className="w-5 h-5" />
              <span className="font-medium">Không thể chỉnh sửa hoạt động này</span>
            </div>
          )}
        </div>

        {/* Status Info */}
        {isRejected && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-900">Hoạt động bị từ chối</p>
              <p className="text-sm text-orange-700 mt-1">
                Vui lòng xem lý do từ chối và cập nhật hoạt động để gửi lại duyệt.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, submitMode)} className="space-y-6">
          {/* Title & Description */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Thông tin hoạt động</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên hoạt động *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tên hoạt động"
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả chi tiết"
                rows={4}
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Date, Time, Location */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Thời gian và địa điểm</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ngày *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giờ (tùy chọn)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa điểm (tùy chọn)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Nhập địa điểm"
                  disabled={!canEdit}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Type, Level, Capacity */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Loại và dung lượng</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại hoạt động (tùy chọn)
                </label>
                <select
                  value={activityTypeId}
                  onChange={(e) =>
                    setActivityTypeId(e.target.value ? parseInt(e.target.value) : '')
                  }
                  disabled={!canEdit}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chọn loại --</option>
                  {activityTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cấp tổ chức (tùy chọn)
                </label>
                <select
                  value={organizationLevelId}
                  onChange={(e) =>
                    setOrganizationLevelId(e.target.value ? parseInt(e.target.value) : '')
                  }
                  disabled={!canEdit}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">-- Chọn cấp --</option>
                  {organizationLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số lượng tối đa (tùy chọn)
                </label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(e.target.value ? parseInt(e.target.value) : '')
                  }
                  placeholder="Số lượng"
                  disabled={!canEdit}
                  min="0"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Lớp học *</h2>
            <div className="space-y-2">
              {classes.length === 0 ? (
                <p className="text-gray-600">Không có lớp nào</p>
              ) : (
                classes.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClasses([...selectedClasses, c.id]);
                        } else {
                          setSelectedClasses(selectedClasses.filter((id) => id !== c.id));
                        }
                      }}
                      disabled={!canEdit}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700">{c.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          {canEdit && (
            <div className="flex gap-3">
              <button
                type="submit"
                onClick={() => setSubmitMode('draft')}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Lưu nháp
              </button>
              <button
                type="submit"
                onClick={() => setSubmitMode('submit')}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Gửi duyệt
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
