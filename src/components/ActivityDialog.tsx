'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Loader2, Eye, Save, Send, GripVertical } from 'lucide-react';
import { toast } from '@/lib/toast';
import LoadingSpinner, { FullScreenLoader } from './LoadingSpinner';
import {
  ActivityTemplateSelector,
  ACTIVITY_TEMPLATES,
} from '@/app/activities/new/ActivityTemplateSelector';

interface ActivityFormData {
  title: string;
  description: string;
  date_time: string;
  end_time: string;
  location: string;
  max_participants: number;
  registration_deadline: string;
  base_points: number;
  activity_type_id: number | null;
  organization_level_id: number | null;
  class_ids: number[];
}

interface ActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activityId?: number | null;
  initialData?: Partial<ActivityFormData>;
}

const PARTICIPANT_OPTIONS = [
  { value: 30, label: '30 người' },
  { value: 50, label: '50 người' },
  { value: 100, label: '100 người' },
  { value: 150, label: '150 người' },
  { value: 200, label: '200 người' },
  { value: 300, label: '300 người' },
  { value: 500, label: '500 người' },
  { value: 1000, label: '1000 người' },
  { value: -1, label: 'Tùy chỉnh...' },
];

export default function ActivityDialog({
  isOpen,
  onClose,
  onSuccess,
  activityId = null,
  initialData = {},
}: ActivityDialogProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    description: '',
    date_time: '',
    end_time: '',
    location: '',
    max_participants: 30,
    registration_deadline: '',
    base_points: 0,
    activity_type_id: null,
    organization_level_id: null,
    class_ids: [],
    ...initialData,
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [orgLevels, setOrgLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [customParticipants, setCustomParticipants] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number>(30);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitMode, setSubmitMode] = useState<'draft' | 'submit'>('draft');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conflict detection states
  const [locationConflicts, setLocationConflicts] = useState<any[]>([]);
  const [scheduleWarnings, setScheduleWarnings] = useState<any[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activityId) {
      fetchActivityData();
    } else if (isOpen) {
      // Reset when opening for create
      setSelectedOption(30);
      setCustomParticipants(null);
    }
  }, [isOpen, activityId]);

  useEffect(() => {
    // Sync selectedOption với formData.max_participants
    const matchingOption = PARTICIPANT_OPTIONS.find(
      (opt) => opt.value === formData.max_participants
    );
    if (matchingOption && matchingOption.value !== -1) {
      setSelectedOption(matchingOption.value);
      setCustomParticipants(null);
    } else {
      setSelectedOption(-1);
      setCustomParticipants(formData.max_participants);
    }
  }, [formData.max_participants]);

  const fetchData = async () => {
    try {
      setFetching(true);
      const [classesRes, typesRes, levelsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/activity-types'),
        fetch('/api/organization-levels'),
      ]);

      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || []);
      }
      if (typesRes.ok) {
        const data = await typesRes.json();
        setActivityTypes(data.activityTypes || data.activity_types || data.types || []);
      }
      if (levelsRes.ok) {
        const data = await levelsRes.json();
        setOrgLevels(data.organization_levels || data.levels || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setFetching(false);
    }
  };

  const fetchActivityData = async () => {
    try {
      const res = await fetch(`/api/activities/${activityId}`);
      if (!res.ok) throw new Error('Không thể tải hoạt động');

      const data = await res.json();
      const activity = data.activity;

      setFormData({
        title: activity.title || '',
        description: activity.description || '',
        date_time: activity.date_time
          ? new Date(activity.date_time).toISOString().slice(0, 16)
          : '',
        end_time: activity.end_time ? new Date(activity.end_time).toISOString().slice(0, 16) : '',
        location: activity.location || '',
        max_participants: activity.max_participants || 30,
        registration_deadline: activity.registration_deadline
          ? new Date(activity.registration_deadline).toISOString().slice(0, 16)
          : '',
        base_points: activity.base_points || 0,
        activity_type_id: activity.activity_type_id || null,
        organization_level_id: activity.organization_level_id || null,
        class_ids: activity.class_ids || [],
      });
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast.error('Không thể tải thông tin hoạt động');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : 0) : value,
    }));
  };

  const handleParticipantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setSelectedOption(value);

    if (value === -1) {
      // Custom option selected - keep current value but show input
      setCustomParticipants(formData.max_participants || 50);
    } else {
      // Preset option selected
      setCustomParticipants(null);
      setFormData((prev) => ({
        ...prev,
        max_participants: value,
      }));
    }
  };

  const handleCustomParticipantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setCustomParticipants(value);
    setFormData((prev) => ({
      ...prev,
      max_participants: value,
    }));
  };

  const handleClassToggle = (classId: number) => {
    setFormData((prev) => ({
      ...prev,
      class_ids: prev.class_ids.includes(classId)
        ? prev.class_ids.filter((id) => id !== classId)
        : [...prev.class_ids, classId],
    }));
  };

  // Template handlers
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = ACTIVITY_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        description: template.defaultDescription,
        max_participants: template.maxParticipants,
      }));

      // Auto-select matching activity type
      const matchingType = activityTypes.find((type) => type.name === template.activityTypeName);
      if (matchingType) {
        setFormData((prev) => ({ ...prev, activity_type_id: matchingType.id }));
      }

      // Auto-select matching organization level
      const matchingLevel = orgLevels.find(
        (level) => level.name === template.organizationLevelName
      );
      if (matchingLevel) {
        setFormData((prev) => ({ ...prev, organization_level_id: matchingLevel.id }));
      }

      toast.success(`Đã áp dụng mẫu: ${template.name}`);
    }
  };

  const handleTemplateClear = () => {
    setSelectedTemplate(null);
    setFormData((prev) => ({
      ...prev,
      description: '',
      max_participants: 30,
      activity_type_id: null,
      organization_level_id: null,
    }));
    toast.success('Đã xóa mẫu');
  };

  // File upload handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 5) {
      toast.error('Tối đa 5 file');
      return;
    }
    // Filter duplicates
    const unique = [...files, ...selectedFiles]
      .filter((f, i, arr) => arr.findIndex((x) => x.name === f.name && x.size === f.size) === i)
      .slice(0, 5);
    setFiles(unique);
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag & drop file reorder
  const handleDragStart = (idx: number) => setDraggedIdx(idx);

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const updated = [...files];
    const [removed] = updated.splice(draggedIdx, 1);
    updated.splice(idx, 0, removed);
    setFiles(updated);
    setDraggedIdx(idx);
  };

  const handleDragEnd = () => setDraggedIdx(null);

  const uploadFiles = async (activityId: number): Promise<boolean> => {
    if (files.length === 0) return true;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch(`/api/activities/${activityId}/files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload thất bại');
      }

      return true;
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Không thể tải file lên');
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Check conflicts when location or date_time changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.location && formData.date_time) {
        await checkConflicts();
      } else {
        setLocationConflicts([]);
        setScheduleWarnings([]);
      }
    }, 800); // Debounce 800ms

    return () => clearTimeout(timer);
  }, [formData.location, formData.date_time]);

  const checkConflicts = async () => {
    try {
      setCheckingConflicts(true);
      const response = await fetch('/api/activities/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: formData.location,
          date_time: formData.date_time,
          duration: 120,
          exclude_activity_id: activityId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLocationConflicts(data.data?.location_conflicts || []);
        setScheduleWarnings(data.data?.schedule_warnings || []);
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, mode: 'draft' | 'submit' = submitMode) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tên hoạt động');
      return;
    }
    if (!formData.date_time) {
      toast.error('Vui lòng chọn thời gian');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Vui lòng nhập địa điểm');
      return;
    }

    // Validate registration deadline
    if (formData.registration_deadline) {
      const deadline = new Date(formData.registration_deadline);
      const activityDate = new Date(formData.date_time);
      const hoursDiff = (activityDate.getTime() - deadline.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        toast.error('Deadline đăng ký phải ít nhất 24 giờ trước thời gian hoạt động');
        return;
      }
    }

    setLoading(true);
    try {
      const url = activityId ? `/api/activities/${activityId}` : '/api/activities';
      const method = activityId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        status: 'draft',
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      const createdActivityId = activityId || data.activity?.id;
      if (!createdActivityId) {
        throw new Error('Không xác định được hoạt động vừa lưu');
      }

      if (files.length > 0) {
        const uploaded = await uploadFiles(createdActivityId);
        if (!uploaded) {
          throw new Error('Không thể tải file lên');
        }
      }

      if (mode === 'submit') {
        const submitResponse = await fetch(`/api/activities/${createdActivityId}/submit-approval`, {
          method: 'POST',
        });
        const submitData = await submitResponse.json();

        if (!submitResponse.ok) {
          throw new Error(
            submitData.error ||
              (activityId
                ? 'Hoạt động đã được cập nhật nhưng gửi phê duyệt thất bại'
                : 'Hoạt động đã được lưu nháp nhưng gửi phê duyệt thất bại')
          );
        }
      }

      const message = activityId
        ? 'Đã cập nhật hoạt động'
        : mode === 'draft'
          ? 'Đã lưu nháp hoạt động'
          : 'Đã tạo hoạt động và gửi phê duyệt';

      toast.success(message);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving activity:', error);
      toast.error(error.message || 'Không thể lưu hoạt động');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      date_time: '',
      end_time: '',
      location: '',
      max_participants: 30,
      registration_deadline: '',
      base_points: 0,
      activity_type_id: null,
      organization_level_id: null,
      class_ids: [],
    });
    setSelectedTemplate(null);
    setFiles([]);
    setSubmitMode('draft');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Dialog */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              {activityId ? '✏️ Chỉnh sửa hoạt động' : '➕ Tạo hoạt động mới'}
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={(e) => handleSubmit(e, submitMode)} className="p-6 space-y-6">
            {fetching ? (
              <LoadingSpinner
                variant="centered"
                size="lg"
                color="green"
                message="Đang tải dữ liệu..."
              />
            ) : (
              <>
                {/* Activity Template Selector */}
                {!activityId && (
                  <ActivityTemplateSelector
                    selectedTemplate={selectedTemplate}
                    onSelect={handleTemplateSelect}
                    onClear={handleTemplateClear}
                  />
                )}

                {/* Thông tin cơ bản */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">📝 Thông tin cơ bản</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên hoạt động <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Nhập tên hoạt động"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Mô tả chi tiết về hoạt động"
                    />
                  </div>
                </div>

                {/* Thời gian và địa điểm */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">
                    📅 Thời gian và địa điểm
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian bắt đầu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="date_time"
                        required
                        value={formData.date_time}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Thời gian kết thúc
                      </label>
                      <input
                        type="datetime-local"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Để trống nếu trong ngày</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deadline đăng ký
                      </label>
                      <input
                        type="datetime-local"
                        name="registration_deadline"
                        value={formData.registration_deadline}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Ít nhất 24h trước hoạt động</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Điểm cơ bản
                      </label>
                      <input
                        type="number"
                        name="base_points"
                        min="0"
                        step="1"
                        value={formData.base_points}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="10"
                      />
                      <p className="text-xs text-gray-500 mt-1">Điểm cho mỗi sinh viên tham gia</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa điểm <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      required
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Phòng 201 - Tòa A"
                    />

                    {/* Conflict warnings */}
                    {checkingConflicts && (
                      <p className="text-xs text-gray-500 mt-1">🔍 Đang kiểm tra xung đột...</p>
                    )}

                    {locationConflicts.length > 0 && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm font-semibold text-red-800 flex items-center gap-1">
                          ⚠️ Phát hiện xung đột địa điểm!
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-red-700">
                          {locationConflicts.map((conflict: any, index: number) => (
                            <li key={index}>
                              • <strong>{conflict.title}</strong> ({conflict.teacher_name})
                              <br />
                              &nbsp;&nbsp;{new Date(conflict.date_time).toLocaleString(
                                'vi-VN'
                              )} - {conflict.location}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs mt-2 text-orange-600">
                          💡 Vui lòng chọn địa điểm khác hoặc đổi thời gian.
                        </p>
                      </div>
                    )}

                    {scheduleWarnings.length > 0 && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm font-semibold text-yellow-800 flex items-center gap-1">
                          ⏰ Lịch trình gần nhau
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-yellow-700">
                          {scheduleWarnings.map((warning: any, index: number) => (
                            <li key={index}>
                              • <strong>{warning.title}</strong>
                              <br />
                              &nbsp;&nbsp;{new Date(warning.date_time).toLocaleString('vi-VN')} (
                              {warning.time_diff_minutes} phút)
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs mt-2 text-yellow-600">
                          ℹ️ Bạn có hoạt động khác gần thời điểm này. Đảm bảo lịch không xung đột.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thông tin thêm */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">⚙️ Cài đặt</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Số lượng tối đa
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={selectedOption}
                          onChange={handleParticipantChange}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          {PARTICIPANT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {selectedOption === -1 && (
                          <input
                            type="number"
                            min="1"
                            value={customParticipants || ''}
                            onChange={handleCustomParticipantChange}
                            placeholder="Nhập số lượng"
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedOption === -1
                          ? `Tùy chỉnh: ${customParticipants || 0} người`
                          : `Tối đa ${formData.max_participants} người tham gia`}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loại hoạt động
                      </label>
                      <select
                        name="activity_type_id"
                        value={formData.activity_type_id || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Chọn loại</option>
                        {activityTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cấp tổ chức
                    </label>
                    <select
                      name="organization_level_id"
                      value={formData.organization_level_id || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Chọn cấp</option>
                      {orgLevels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lớp học */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">👥 Lớp học tham gia</h3>

                  {classes.length === 0 ? (
                    <p className="text-sm text-gray-500">Không có lớp học nào</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {classes.map((cls) => (
                        <label
                          key={cls.id}
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.class_ids.includes(cls.id)}
                            onChange={() => handleClassToggle(cls.id)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <span className="text-gray-700">{cls.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {formData.class_ids.length > 0
                      ? `Đã chọn ${formData.class_ids.length} lớp`
                      : 'Chưa chọn lớp nào (hoạt động mở cho tất cả)'}
                  </p>
                </div>

                {/* File uploads - only for new activities */}
                {!activityId && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">
                      📎 Tài liệu đính kèm
                    </h3>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={files.length >= 5}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        Chọn file (tối đa 5)
                      </button>

                      {files.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {files.map((file, index) => (
                            <li
                              key={index}
                              draggable
                              onDragStart={() => handleDragStart(index)}
                              onDragOver={(e) => handleDragOver(index, e)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center justify-between p-2 bg-gray-50 rounded border cursor-move hover:bg-gray-100 transition ${
                                draggedIdx === index ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span className="text-sm truncate">{file.name}</span>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  ({(file.size / 1024).toFixed(0)} KB)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFileRemove(index)}
                                className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {uploading && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-blue-600 p-3 bg-blue-50 rounded-lg">
                          <Loader2 className="animate-spin w-5 h-5" />
                          <span className="font-medium">Đang tải file lên...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                  >
                    Hủy
                  </button>

                  {!activityId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        setSubmitMode('draft');
                        handleSubmit(e as any, 'draft');
                      }}
                      disabled={loading || uploading}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading && submitMode === 'draft' ? (
                        <>
                          <Loader2 className="animate-spin w-4 h-4" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Lưu nháp
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      setSubmitMode('submit');
                      handleSubmit(e as any, 'submit');
                    }}
                    disabled={loading || uploading}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading && submitMode === 'submit' ? (
                      <>
                        <Loader2 className="animate-spin w-4 h-4" />
                        {activityId ? 'Đang lưu...' : 'Đang gửi...'}
                      </>
                    ) : (
                      <>
                        {activityId ? (
                          <>
                            <Save className="w-4 h-4" />
                            Lưu thay đổi
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Gửi duyệt
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Fullscreen loader khi đang submit */}
          {loading && (
            <FullScreenLoader
              message={activityId ? 'Đang cập nhật hoạt động...' : 'Đang tạo hoạt động...'}
            />
          )}
        </div>
      </div>
    </div>
  );
}
