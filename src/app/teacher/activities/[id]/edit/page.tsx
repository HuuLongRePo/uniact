'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Lock, Save, Send, X } from 'lucide-react';
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

interface StudentOption {
  id: number;
  name: string;
  email?: string | null;
  class_id?: number | null;
  class_name?: string | null;
}

interface ParticipationPreviewStudent {
  id: number;
  name: string;
  email: string | null;
  participation_mode?: 'mandatory' | 'voluntary';
  resolved_mode?: 'mandatory' | 'voluntary';
  was_conflicted?: boolean;
}

interface ParticipationPreviewGroup {
  class_id: number;
  class_name: string;
  participation_mode?: 'mandatory' | 'voluntary';
  mandatory_count: number;
  voluntary_count: number;
  conflict_count: number;
  students: ParticipationPreviewStudent[];
}

interface ParticipationPreview {
  total_classes: number;
  mandatory_participants: number;
  voluntary_participants: number;
  conflict_count: number;
  groups: ParticipationPreviewGroup[];
  direct_students?: ParticipationPreviewStudent[];
}

interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  approval_status: 'draft' | 'requested' | 'approved' | 'rejected';
  rejected_reason?: string | null;
  max_participants: number | null;
  activity_type_id: number | null;
  organization_level_id: number | null;
  class_ids?: number[];
  mandatory_class_ids?: number[];
  voluntary_class_ids?: number[];
  classes?: Array<Class & { participation_mode?: 'mandatory' | 'voluntary' }>;
}

function extractActivity(payload: any): Activity {
  return payload?.activity || payload?.data?.activity || payload?.data || payload;
}

function canEditActivity(activity: Activity): boolean {
  return activity.status === 'draft' && ['draft', 'rejected'].includes(activity.approval_status);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [activityTypeId, setActivityTypeId] = useState<number | ''>('');
  const [organizationLevelId, setOrganizationLevelId] = useState<number | ''>('');
  const [mandatoryClassIds, setMandatoryClassIds] = useState<number[]>([]);
  const [voluntaryClassIds, setVoluntaryClassIds] = useState<number[]>([]);
  const [mandatoryStudentIds, setMandatoryStudentIds] = useState<number[]>([]);
  const [voluntaryStudentIds, setVoluntaryStudentIds] = useState<number[]>([]);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [appliesToAllStudents, setAppliesToAllStudents] = useState(false);

  const [classes, setClasses] = useState<Class[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [organizationLevels, setOrganizationLevels] = useState<OrganizationLevel[]>([]);
  const [showParticipationPreview, setShowParticipationPreview] = useState(false);
  const [participationPreview, setParticipationPreview] = useState<ParticipationPreview | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'basic' | 'scope' | 'submit'>('basic');
  const selectedClasses = useMemo(
    () => Array.from(new Set([...mandatoryClassIds, ...voluntaryClassIds])),
    [mandatoryClassIds, voluntaryClassIds]
  );
  const filteredStudentOptions = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();
    if (!keyword) return studentOptions;

    return studentOptions.filter((student) => {
      const haystack = [student.name, student.email, student.class_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [studentOptions, studentSearch]);
  const mandatorySelectedStudents = useMemo(
    () => studentOptions.filter((student) => mandatoryStudentIds.includes(student.id)),
    [studentOptions, mandatoryStudentIds]
  );
  const voluntarySelectedStudents = useMemo(
    () => studentOptions.filter((student) => voluntaryStudentIds.includes(student.id)),
    [studentOptions, voluntaryStudentIds]
  );

  const handleMandatoryStudentSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map((option) => parseInt(option.value, 10));
    setMandatoryStudentIds(values);
    setVoluntaryStudentIds((current) => current.filter((studentId) => !values.includes(studentId)));
  };

  const handleVoluntaryStudentSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions)
      .map((option) => parseInt(option.value, 10))
      .filter((studentId) => !mandatoryStudentIds.includes(studentId));
    setVoluntaryStudentIds(values);
  };

  useEffect(() => {
    void fetchAllData();
  }, [id]);

  const ensureStudentOptionsLoaded = async () => {
    if (studentsLoaded || studentsLoading) return;

    try {
      setStudentsLoading(true);
      const response = await fetch('/api/teacher/students');
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Không thể tải danh sách học viên');
      }

      setStudentOptions(data?.students || data?.data?.students || []);
      setStudentsLoaded(true);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách học viên'));
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (!showParticipationPreview) return;

    if (appliesToAllStudents || selectedClasses.length === 0) {
      setParticipationPreview(null);
      setPreviewError(null);
      return;
    }

    let active = true;

    const loadPreview = async () => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);

        const response = await fetch('/api/activities/participation-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class_ids: selectedClasses,
            mandatory_class_ids: mandatoryClassIds,
            voluntary_class_ids: voluntaryClassIds,
            mandatory_student_ids: mandatoryStudentIds,
            voluntary_student_ids: voluntaryStudentIds,
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || 'Không thể tải danh sách xem trước tham gia');
        }

        if (!active) return;
        setParticipationPreview(data?.preview || null);
      } catch (error) {
        if (!active) return;
        setParticipationPreview(null);
        setPreviewError(getErrorMessage(error, 'Không thể tải danh sách xem trước tham gia'));
      } finally {
        if (active) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      active = false;
    };
  }, [
    showParticipationPreview,
    selectedClasses,
    mandatoryClassIds,
    voluntaryClassIds,
    mandatoryStudentIds,
    voluntaryStudentIds,
    appliesToAllStudents,
  ]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [activityRes, classesRes, typesRes, levelsRes] = await Promise.all([
        fetch(`/api/activities/${id}`),
        fetch('/api/classes'),
        fetch('/api/activity-types'),
        fetch('/api/organization-levels'),
      ]);

      if (!activityRes.ok) {
        throw new Error('Không thể tải hoạt động');
      }

      const nextActivity = extractActivity(await activityRes.json());
      if (!canEditActivity(nextActivity)) {
        toast.error('Chỉ có thể chỉnh sửa hoạt động nháp hoặc bị từ chối');
        router.push('/teacher/activities');
        return;
      }

      setActivity(nextActivity);
      setTitle(nextActivity.title || '');
      setDescription(nextActivity.description || '');

      const [dateOnly, timeOnly = '00:00'] = String(nextActivity.date_time || '').split('T');
      setDate(dateOnly || '');
      setTime(timeOnly.slice(0, 5) || '00:00');
      setEndTime(
        typeof (nextActivity as any).end_time === 'string'
          ? String((nextActivity as any).end_time).split('T')[1]?.slice(0, 5) || ''
          : ''
      );

      setLocation(nextActivity.location || '');
      setMaxParticipants(nextActivity.max_participants || '');
      setActivityTypeId(nextActivity.activity_type_id || '');
      setOrganizationLevelId(nextActivity.organization_level_id || '');
      const fetchedMandatoryClassIds =
        nextActivity.mandatory_class_ids ||
        nextActivity.classes
          ?.filter((item) => (item.participation_mode || 'mandatory') === 'mandatory')
          .map((item) => item.id) ||
        nextActivity.class_ids ||
        [];
      const fetchedVoluntaryClassIds =
        nextActivity.voluntary_class_ids ||
        nextActivity.classes
          ?.filter((item) => (item.participation_mode || 'mandatory') === 'voluntary')
          .map((item) => item.id) ||
        [];
      setMandatoryClassIds(fetchedMandatoryClassIds);
      setVoluntaryClassIds(fetchedVoluntaryClassIds);
      setAppliesToAllStudents(
        Boolean((nextActivity as any).applies_to_all_students) ||
          (fetchedMandatoryClassIds.length === 0 && fetchedVoluntaryClassIds.length === 0)
      );

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setActivityTypes(
          typesData.activity_types || typesData.activityTypes || typesData.types || []
        );
      }

      if (levelsRes.ok) {
        const levelsData = await levelsRes.json();
        setOrganizationLevels(
          levelsData.organization_levels || levelsData.organizationLevels || levelsData.levels || []
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu');
      router.push('/teacher/activities');
    } finally {
      setLoading(false);
    }
  };

  const submitActivity = async (mode: 'draft' | 'submit') => {
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

    if (!location.trim()) {
      toast.error('Vui lòng nhập địa điểm');
      return;
    }

    if (!appliesToAllStudents && selectedClasses.length === 0) {
      toast.error('Vui lòng chọn ít nhất một lớp hoặc bật mở đăng ký cho tất cả học viên');
      return;
    }

    try {
      setSubmitting(true);

      const updatePayload = {
        title: title.trim(),
        description: description.trim(),
        date_time: time ? `${date}T${time}` : `${date}T00:00`,
        end_time: endTime ? `${date}T${endTime}` : null,
        location: location.trim(),
        max_participants: maxParticipants ? parseInt(String(maxParticipants), 10) : 30,
        class_ids: appliesToAllStudents ? [] : selectedClasses,
        mandatory_class_ids: appliesToAllStudents ? [] : mandatoryClassIds,
        voluntary_class_ids: appliesToAllStudents ? [] : voluntaryClassIds,
        mandatory_student_ids: appliesToAllStudents ? [] : mandatoryStudentIds,
        voluntary_student_ids: appliesToAllStudents ? [] : voluntaryStudentIds,
        applies_to_all_students: appliesToAllStudents,
        ...(activityTypeId ? { activity_type_id: Number(activityTypeId) } : {}),
        ...(organizationLevelId ? { organization_level_id: Number(organizationLevelId) } : {}),
      };

      const updateRes = await fetch(`/api/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      const updateData = await updateRes.json().catch(() => null);

      if (!updateRes.ok) {
        throw new Error(updateData?.message || updateData?.error || 'Khong the cap nhat hoat dong');
      }

      if (mode === 'submit') {
        const submitRes = await fetch(`/api/activities/${id}/submit-approval`, {
          method: 'POST',
        });
        const submitData = await submitRes.json().catch(() => null);

        if (!submitRes.ok) {
          throw new Error(
            submitData?.message ||
              submitData?.error ||
              'Hoạt động đã cập nhật nhưng gửi duyệt thất bại'
          );
        }
      }

      toast.success(mode === 'draft' ? 'Lưu nháp thành công' : 'Đã gửi duyệt hoạt động');
      router.push('/teacher/activities');
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Không thể cập nhật hoạt động'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitActivity('draft');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="mt-4 text-gray-600">Dang tai...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow">
            <p className="text-gray-600">Không tìm thấy hoạt động</p>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = activity.approval_status === 'rejected';
  const canEdit = canEditActivity(activity);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/teacher/activities')}
            className="flex items-center gap-2 text-gray-600 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Quay lại
          </button>

          {!canEdit && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700">
              <Lock className="h-5 w-5" />
              <span className="font-medium">Không thể chỉnh sửa hoạt động này</span>
            </div>
          )}
        </div>

        {isRejected && (
          <div className="mb-6 flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
            <div>
              <p className="font-medium text-orange-900">Hoạt động bị từ chối</p>
              <p className="mt-1 text-sm text-orange-700">
                Vui lòng cập nhật hoạt động và gửi lại để duyệt.
              </p>
              {activity.rejected_reason && (
                <p className="mt-2 text-sm text-orange-800">Lý do: {activity.rejected_reason}</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="sticky top-4 z-10 rounded-lg border border-gray-200 bg-white p-3 shadow">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                { key: 'basic', label: 'Bước 1: Thông tin' },
                { key: 'scope', label: 'Bước 2: Phạm vi và phân loại' },
                { key: 'submit', label: 'Bước 3: Kiểm tra và gửi' },
              ].map((step) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setCurrentStep(step.key as 'basic' | 'scope' | 'submit')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${currentStep === step.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {step.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                onClick={() =>
                  setCurrentStep((current) =>
                    current === 'submit' ? 'scope' : current === 'scope' ? 'basic' : 'basic'
                  )
                }
                disabled={currentStep === 'basic'}
                className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Quay lại bước trước
              </button>
              <div className="text-gray-600">
                {currentStep === 'basic'
                  ? 'Cập nhật thông tin chính của hoạt động.'
                  : currentStep === 'scope'
                    ? 'Điều chỉnh phạm vi lớp, học viên và phân loại.'
                    : 'Kiểm tra lại thay đổi rồi lưu nháp hoặc gửi duyệt.'}
              </div>
              <button
                type="button"
                onClick={() =>
                  setCurrentStep((current) =>
                    current === 'basic' ? 'scope' : current === 'scope' ? 'submit' : 'submit'
                  )
                }
                disabled={currentStep === 'submit'}
                className="rounded-lg border px-4 py-2 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                Sang bước tiếp theo
              </button>
            </div>
          </div>
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Thông tin hoạt động</h2>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tên hoạt động *
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Nhập tên hoạt động"
                required
                disabled={!canEdit}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Mô tả *</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Nhập mô tả chi tiết"
                rows={4}
                required
                disabled={!canEdit}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Thời gian và địa điểm</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Ngày *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Giờ bắt đầu</label>
                <div className="relative">
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {time ? (
                    <button
                      type="button"
                      onClick={() => setTime('')}
                      disabled={!canEdit}
                      aria-label="Xóa giờ bắt đầu"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Giờ kết thúc</label>
                <div className="relative">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-lg border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {endTime ? (
                    <button
                      type="button"
                      onClick={() => setEndTime('')}
                      disabled={!canEdit}
                      aria-label="Xóa giờ kết thúc"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Địa điểm *</label>
                <input
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Nhập địa điểm"
                  required
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <h2 className="text-lg font-bold text-gray-900">Loại và dung lượng</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Loại hoạt động
                </label>
                <select
                  value={activityTypeId}
                  onChange={(event) =>
                    setActivityTypeId(event.target.value ? parseInt(event.target.value, 10) : '')
                  }
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                <label className="mb-2 block text-sm font-medium text-gray-700">Cấp tổ chức</label>
                <select
                  value={organizationLevelId}
                  onChange={(event) =>
                    setOrganizationLevelId(
                      event.target.value ? parseInt(event.target.value, 10) : ''
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Số lượng tối đa
                </label>
                <input
                  type="number"
                  value={maxParticipants}
                  onChange={(event) =>
                    setMaxParticipants(event.target.value ? parseInt(event.target.value, 10) : '')
                  }
                  placeholder="Số lượng"
                  disabled={!canEdit}
                  min="0"
                  className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">Để trống sẽ dùng mặc định 30.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900">Phạm vi lớp áp dụng *</h2>
              <button
                type="button"
                onClick={() => setShowParticipationPreview((current) => !current)}
                disabled={!canEdit}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showParticipationPreview
                  ? 'Ẩn xem trước danh sách tham gia'
                  : 'Xem trước danh sách tham gia'}
              </button>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <label className="mb-3 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                <input
                  type="checkbox"
                  checked={appliesToAllStudents}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setAppliesToAllStudents(checked);
                    if (checked) {
                      setMandatoryClassIds([]);
                      setVoluntaryClassIds([]);
                      setMandatoryStudentIds([]);
                      setVoluntaryStudentIds([]);
                      setShowParticipationPreview(false);
                    }
                  }}
                  disabled={!canEdit}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">Mở đăng ký cho tất cả học viên</span>
                  <span className="block text-xs text-emerald-800">
                    Khi bật, hoạt động sẽ không giới hạn theo lớp và sinh viên đủ điều kiện có thể nhìn thấy để đăng ký.
                  </span>
                </span>
              </label>
              <p className="font-medium">
                {appliesToAllStudents
                  ? 'Hoạt động này đang mở cho tất cả học viên, không cần chọn lớp áp dụng.'
                  : 'Hãy chọn rõ lớp bắt buộc và lớp tự nguyện cho hoạt động này.'}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
                <li>
                  <strong>Bắt buộc:</strong> sinh viên trong lớp sẽ được áp dụng bắt buộc, không cần
                  tự đăng ký.
                </li>
                <li>
                  <strong>Tự nguyện:</strong> sinh viên trong lớp được phép tự đăng ký.
                </li>
                <li>
                  Nếu một lớp xuất hiện ở cả hai nhóm, hệ thống sẽ ưu tiên <strong>bắt buộc</strong>
                  .
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-orange-700">
                  Lớp bắt buộc
                </label>
                <select
                  multiple
                  className="h-32 w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  value={mandatoryClassIds.map(String)}
                  onChange={(event) => {
                    const values = Array.from(event.target.selectedOptions).map((option) =>
                      parseInt(option.value, 10)
                    );
                    setMandatoryClassIds(values);
                    setVoluntaryClassIds((current) =>
                      current.filter((classId) => !values.includes(classId))
                    );
                  }}
                  disabled={!canEdit || appliesToAllStudents}
                >
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Các lớp này sẽ được gán diện bắt buộc tham gia.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-sky-700">Lớp tự nguyện</label>
                <select
                  multiple
                  className="h-32 w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  value={voluntaryClassIds.map(String)}
                  onChange={(event) => {
                    const values = Array.from(event.target.selectedOptions)
                      .map((option) => parseInt(option.value, 10))
                      .filter((classId) => !mandatoryClassIds.includes(classId));
                    setVoluntaryClassIds(values);
                  }}
                  disabled={!canEdit || appliesToAllStudents}
                >
                  {classes.map((item) => (
                    <option
                      key={`voluntary-${item.id}`}
                      value={item.id}
                      disabled={mandatoryClassIds.includes(item.id)}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Các lớp này có thể tự đăng ký nếu muốn tham gia.
                </p>
              </div>
            </div>
            {!appliesToAllStudents && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Chọn học viên trực tiếp</p>
                    <p className="text-xs text-blue-800">
                      Tải danh sách học viên theo yêu cầu để bổ sung học viên ngoài phạm vi lớp mà không cần reload trang.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void ensureStudentOptionsLoaded()}
                    disabled={studentsLoading}
                    className="rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                  >
                    {studentsLoading
                      ? 'Đang tải...'
                      : studentsLoaded
                        ? 'Làm mới danh sách học viên'
                        : 'Tải danh sách học viên'}
                  </button>
                </div>
                {studentsLoaded ? (
                  <>
                    <p className="mt-2 text-xs text-blue-800">
                      Đã nạp {studentOptions.length} học viên. Đang chọn {mandatoryStudentIds.length} bắt buộc và {voluntaryStudentIds.length} tự nguyện.
                    </p>
                    <div className="mt-3">
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Lọc theo tên, email hoặc lớp"
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200"
                        disabled={!canEdit}
                      />
                      <p className="mt-1 text-xs text-blue-800">
                        Hiển thị {filteredStudentOptions.length}/{studentOptions.length} học viên phù hợp.
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        {mandatorySelectedStudents.length > 0 ? (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {mandatorySelectedStudents.map((student) => (
                              <button
                                key={`mandatory-chip-${student.id}`}
                                type="button"
                                onClick={() => setMandatoryStudentIds((current) => current.filter((id) => id !== student.id))}
                                disabled={!canEdit}
                                className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800 hover:bg-orange-200 disabled:opacity-60"
                              >
                                {student.name} ×
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <label className="mb-1 block text-sm font-medium text-orange-700">
                          Học viên bắt buộc
                        </label>
                        <select
                          multiple
                          className="h-32 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-200"
                          value={mandatoryStudentIds.map(String)}
                          onChange={handleMandatoryStudentSelect}
                          disabled={!canEdit}
                        >
                          {filteredStudentOptions.map((student) => (
                            <option key={`mandatory-student-${student.id}`} value={student.id}>
                              {student.name}
                              {student.class_name ? ` - ${student.class_name}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        {voluntarySelectedStudents.length > 0 ? (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {voluntarySelectedStudents.map((student) => (
                              <button
                                key={`voluntary-chip-${student.id}`}
                                type="button"
                                onClick={() => setVoluntaryStudentIds((current) => current.filter((id) => id !== student.id))}
                                disabled={!canEdit}
                                className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-800 hover:bg-sky-200 disabled:opacity-60"
                              >
                                {student.name} ×
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <label className="mb-1 block text-sm font-medium text-sky-700">
                          Học viên tự nguyện
                        </label>
                        <select
                          multiple
                          className="h-32 w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-200"
                          value={voluntaryStudentIds.map(String)}
                          onChange={handleVoluntaryStudentSelect}
                          disabled={!canEdit}
                        >
                          {filteredStudentOptions.map((student) => (
                            <option
                              key={`voluntary-student-${student.id}`}
                              value={student.id}
                              disabled={mandatoryStudentIds.includes(student.id)}
                            >
                              {student.name}
                              {student.class_name ? ` - ${student.class_name}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {!appliesToAllStudents && showParticipationPreview && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 text-sm font-semibold text-blue-900">
                  Xem trước danh sách tham gia hiện tại
                </div>
                {selectedClasses.length === 0 && mandatoryStudentIds.length === 0 && voluntaryStudentIds.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    Chọn ít nhất một lớp hoặc học viên trực tiếp để xem danh sách dự kiến theo phạm vi bắt buộc hoặc tự nguyện.
                  </p>
                ) : previewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                    Đang tải danh sách xem trước...
                  </div>
                ) : previewError ? (
                  <p className="text-sm text-red-600">{previewError}</p>
                ) : participationPreview ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-white p-3">
                        <div className="text-gray-500">Số lớp</div>
                        <div className="text-lg font-bold text-gray-900">
                          {participationPreview.total_classes}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <div className="text-gray-500">Bắt buộc</div>
                        <div className="text-lg font-bold text-orange-700">
                          {participationPreview.mandatory_participants}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Danh sách hiện được nhóm theo lớp và học viên chọn trực tiếp. Nếu một lớp hoặc học viên xuất hiện ở cả hai nhóm, hệ thống sẽ ưu tiên bắt buộc hơn tự nguyện.
                    </div>
                    {participationPreview.direct_students && participationPreview.direct_students.length > 0 ? (
                      <details className="rounded-lg border border-emerald-200 bg-white p-3">
                        <summary className="cursor-pointer list-none font-medium text-gray-800">
                          Học viên chọn trực tiếp • {participationPreview.direct_students.length} học viên
                        </summary>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          {participationPreview.direct_students.map((student) => (
                            <div key={`direct-${student.id}`} className="flex justify-between gap-3">
                              <div>
                                <span>{student.name}</span>
                                <span className="ml-2 text-xs font-medium text-emerald-700">
                                  {student.resolved_mode === 'mandatory' ? 'Bắt buộc' : 'Tự nguyện'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {student.email || `ID ${student.id}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : null}
                    <div className="space-y-2">
                      {participationPreview.groups.map((group) => (
                        <details
                          key={group.class_id}
                          className="rounded-lg border border-blue-200 bg-white p-3"
                        >
                          <summary className="cursor-pointer list-none font-medium text-gray-800">
                            {group.class_name} • {group.mandatory_count} học viên bắt buộc
                          </summary>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            {group.students.map((student) => (
                              <div key={student.id} className="flex justify-between gap-3">
                                <span>{student.name}</span>
                                <span className="text-xs text-gray-500">
                                  {student.email || `ID ${student.id}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {canEdit && (
            <div className="sticky bottom-0 z-10 flex gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow">
              <button
                type="button"
                onClick={() => void submitActivity('draft')}
                disabled={submitting || currentStep !== 'submit'}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-200 px-6 py-3 font-bold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {currentStep !== 'submit' ? 'Đến bước 3 để lưu nháp' : 'Lưu nháp'}
              </button>
              <button
                type="button"
                onClick={() => void submitActivity('submit')}
                disabled={submitting || currentStep !== 'submit'}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
                {currentStep !== 'submit' ? 'Đến bước 3 để gửi duyệt' : 'Gửi duyệt'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
