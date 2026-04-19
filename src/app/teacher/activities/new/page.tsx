'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Upload,
  Loader2,
  X,
  CheckCircle2,
  FileText,
  FileImage,
  GripVertical,
  Save,
  Send,
  Eye,
  Calendar,
  MapPin,
  Users as UsersIcon,
  BookOpen,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

interface ActivityType {
  id: number;
  name: string;
}

interface OrganizationLevel {
  id: number;
  name: string;
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

export default function CreateActivityPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [mandatoryClassIds, setMandatoryClassIds] = useState<number[]>([]);
  const [voluntaryClassIds, setVoluntaryClassIds] = useState<number[]>([]);
  const [mandatoryStudentIds, setMandatoryStudentIds] = useState<number[]>([]);
  const [voluntaryStudentIds, setVoluntaryStudentIds] = useState<number[]>([]);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [appliesToAllStudents, setAppliesToAllStudents] = useState(false);
  const [activityTypeId, setActivityTypeId] = useState<number | ''>('');
  const [organizationLevelId, setOrganizationLevelId] = useState<number | ''>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [organizationLevels, setOrganizationLevels] = useState<OrganizationLevel[]>([]);
  const [success, setSuccess] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'draft' | 'submit'>('draft');
  const [currentTab, setCurrentTab] = useState<'basic' | 'details' | 'files'>('basic');
  const [showPreview, setShowPreview] = useState(false);
  const [participationPreview, setParticipationPreview] = useState<ParticipationPreview | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Activity Templates
  const templates = [
    {
      id: 1,
      name: 'Tổng vệ sinh',
      title: 'Tổng vệ sinh lớp',
      description: 'Hoạt động vệ sinh môi trường lớp học định kỳ',
    },
    {
      id: 2,
      name: 'Tham quan',
      title: 'Tham quan học tập',
      description: 'Chuyến tham quan thực tế ngoài trường',
    },
    {
      id: 3,
      name: 'Tình nguyện',
      title: 'Hoạt động tình nguyện',
      description: 'Hoạt động thiện nguyện vì cộng đồng',
    },
    {
      id: 4,
      name: 'Văn nghệ',
      title: 'Biểu diễn văn nghệ',
      description: 'Hoạt động văn nghệ, văn hóa, nghệ thuật',
    },
    {
      id: 5,
      name: 'Thể thao',
      title: 'Hoạt động thể thao',
      description: 'Thi đấu thể thao, rèn luyện sức khỏe',
    },
  ];

  const applyTemplate = (templateId: number) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setTitle(template.title);
      setDescription(template.description);
      toast.success(`Đã áp dụng mẫu: ${template.name}`);
    }
  };

  // Fetch class list, activity types, organization levels on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/classes').then((res) => res.json()),
      fetch('/api/activity-types').then((res) => res.json()),
      fetch('/api/organization-levels').then((res) => res.json()),
    ])
      .then(([classData, typeData, levelData]) => {
        setClasses(classData.classes || []);
        setActivityTypes(typeData.types || []);
        setOrganizationLevels(levelData.levels || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Không thể tải dữ liệu');
      });
  }, []);

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
    } catch (error: any) {
      toast.error(error?.message || 'Không thể tải danh sách học viên');
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (!showPreview) return;

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
          throw new Error(data?.error || 'Không thể tải bản xem trước danh sách tham gia');
        }

        if (!active) return;
        setParticipationPreview(data?.preview || null);
      } catch (error: any) {
        if (!active) return;
        setParticipationPreview(null);
        setPreviewError(error?.message || 'Không thể tải bản xem trước danh sách tham gia');
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
    showPreview,
    selectedClasses,
    mandatoryClassIds,
    voluntaryClassIds,
    mandatoryStudentIds,
    voluntaryStudentIds,
    appliesToAllStudents,
  ]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    // Only allow up to 5 files, filter duplicates
    const unique = [...files, ...newFiles]
      .filter((f, i, arr) => arr.findIndex((x) => x.name === f.name && x.size === f.size) === i)
      .slice(0, 5);
    setFiles(unique);
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((files) => files.filter((_, i) => i !== idx));
  };

  const handleMandatoryClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
    setMandatoryClassIds(values);
    setVoluntaryClassIds((current) => current.filter((classId) => !values.includes(classId)));
  };

  const handleVoluntaryClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions)
      .map((opt) => Number(opt.value))
      .filter((classId) => !mandatoryClassIds.includes(classId));
    setVoluntaryClassIds(values);
  };

  const handleMandatoryStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
    setMandatoryStudentIds(values);
    setVoluntaryStudentIds((current) => current.filter((studentId) => !values.includes(studentId)));
  };

  const handleVoluntaryStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions)
      .map((opt) => Number(opt.value))
      .filter((studentId) => !mandatoryStudentIds.includes(studentId));
    setVoluntaryStudentIds(values);
  };

  const handleSubmit = async (e: React.FormEvent, mode: 'draft' | 'submit') => {
    e.preventDefault();
    if (!title.trim() || !date || !location.trim() || (!appliesToAllStudents && selectedClasses.length === 0)) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    try {
      const createPayload = {
        title: title.trim(),
        description,
        date_time: time ? `${date}T${time}` : `${date}T00:00`,
        ...(endTime ? { end_time: `${date}T${endTime}` } : {}),
        location: location.trim(),
        max_participants: maxParticipants ? Number(maxParticipants) : 30,
        class_ids: appliesToAllStudents ? [] : selectedClasses,
        mandatory_class_ids: appliesToAllStudents ? [] : mandatoryClassIds,
        voluntary_class_ids: appliesToAllStudents ? [] : voluntaryClassIds,
        mandatory_student_ids: appliesToAllStudents ? [] : mandatoryStudentIds,
        voluntary_student_ids: appliesToAllStudents ? [] : voluntaryStudentIds,
        applies_to_all_students: appliesToAllStudents,
        ...(activityTypeId ? { activity_type_id: Number(activityTypeId) } : {}),
        ...(organizationLevelId ? { organization_level_id: Number(organizationLevelId) } : {}),
      };

      const createRes = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
      });

      const createData = await createRes.json().catch(() => null);
      if (!createRes.ok) {
        throw new Error(createData?.error || 'Tạo hoạt động thất bại');
      }

      const createdActivityId =
        createData?.activity?.id ?? createData?.data?.activity?.id ?? createData?.id;

      if (!createdActivityId) {
        throw new Error('Không xác định được hoạt động vừa tạo');
      }

      if (files.length > 0) {
        setUploading(true);
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));

        const uploadRes = await fetch(`/api/activities/${createdActivityId}/files`, {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => null);

        if (!uploadRes.ok) {
          throw new Error(uploadData?.error || 'Hoạt động đã được tạo nhưng tải file lên thất bại');
        }
      }

      if (mode === 'submit') {
        const submitRes = await fetch(`/api/activities/${createdActivityId}/submit-approval`, {
          method: 'POST',
        });
        const submitData = await submitRes.json().catch(() => null);

        if (!submitRes.ok) {
          throw new Error(submitData?.error || 'Hoạt động đã được tạo nhưng gửi duyệt thất bại');
        }
      }

      setSuccess(true);
      toast.success(mode === 'draft' ? 'Lưu nháp thành công!' : 'Gửi duyệt thành công!');
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setLocation('');
      setTime('');
      setEndTime('');
      setMaxParticipants('');
      setMandatoryClassIds([]);
      setVoluntaryClassIds([]);
      setActivityTypeId('');
      setOrganizationLevelId('');
      setFiles([]);
      setTimeout(() => {
        window.location.href = '/teacher/activities';
      }, 1500);
      return;
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
      return;
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-2">
              <Plus className="w-7 h-7 text-blue-600" />
              Tạo hoạt động mới
            </h1>
            <p className="mt-2 text-gray-600">
              Điền thông tin chi tiết, chọn lớp và đính kèm tài liệu nếu cần.
            </p>

            {/* Template Selector */}
            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Sử dụng mẫu nhanh:</label>
              <select
                onChange={(e) => e.target.value && applyTemplate(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200"
                defaultValue=""
              >
                <option value="">-- Chọn mẫu --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Ẩn xem trước danh sách tham gia' : 'Xem trước danh sách tham gia'}
              </button>
            </div>
          </div>

          {/* Wizard steps */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setCurrentTab('basic')}
              className={`flex-1 px-6 py-3 font-medium transition-all ${
                currentTab === 'basic'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-2" />
              Bước 1: Thông tin
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('details')}
              className={`flex-1 px-6 py-3 font-medium transition-all ${
                currentTab === 'details'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Award className="w-4 h-4 inline mr-2" />
              Bước 2: Phạm vi và phân loại
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('files')}
              className={`flex-1 px-6 py-3 font-medium transition-all ${
                currentTab === 'files'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Bước 3: Tài liệu và gửi
            </button>
          </div>

          <div className="flex gap-6 p-6">
            {/* Form Content */}
            <div className={showPreview ? 'flex-1' : 'w-full'}>
              <form onSubmit={(e) => handleSubmit(e, submitMode)} className="space-y-5">
                {currentTab === 'basic' && (
                  <>
                    {/* Title */}
                    <div>
                      <label className="block font-medium mb-1">
                        Tiêu đề <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        disabled={submitting}
                        placeholder="Ví dụ: Tổng vệ sinh lớp"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block font-medium mb-1">Mô tả</label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        disabled={submitting}
                        placeholder="Mô tả chi tiết về hoạt động..."
                      />
                    </div>

                    {/* Date, Time, Location */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block font-medium mb-1">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Ngày diễn ra <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Giờ bắt đầu</label>
                        <div className="relative">
                          <input
                            type="time"
                            className="w-full rounded-lg border px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-200"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            disabled={submitting}
                          />
                          {time ? (
                            <button
                              type="button"
                              onClick={() => setTime('')}
                              disabled={submitting}
                              aria-label="Xóa giờ bắt đầu"
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <label className="block font-medium mb-1">Giờ kết thúc</label>
                        <div className="relative">
                          <input
                            type="time"
                            className="w-full rounded-lg border px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-200"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            disabled={submitting}
                          />
                          {endTime ? (
                            <button
                              type="button"
                              onClick={() => setEndTime('')}
                              disabled={submitting}
                              aria-label="Xóa giờ kết thúc"
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <label className="block font-medium mb-1">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Địa điểm <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                          disabled={submitting}
                          placeholder="Phòng 101"
                        />
                      </div>
                    </div>

                    {/* Classes Selection */}
                    <div>
                      <label className="block font-medium mb-1">
                        <UsersIcon className="w-4 h-4 inline mr-1" />
                        Phạm vi lớp áp dụng <span className="text-red-500">*</span>
                      </label>
                      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <label className="mb-3 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                          <input
                            type="checkbox"
                            checked={appliesToAllStudents}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAppliesToAllStudents(checked);
                              if (checked) {
                                setMandatoryClassIds([]);
                                setVoluntaryClassIds([]);
                                setMandatoryStudentIds([]);
                                setVoluntaryStudentIds([]);
                                setShowPreview(false);
                              }
                            }}
                            disabled={submitting}
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
                            : 'Nếu không chọn lớp nào, bạn chưa thể lưu hoạt động.'}
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
                          <li>
                            <strong>Bắt buộc:</strong> sinh viên trong lớp sẽ được áp dụng bắt buộc,
                            không cần tự đăng ký.
                          </li>
                          <li>
                            <strong>Tự nguyện:</strong> sinh viên trong lớp được phép tự đăng ký.
                          </li>
                          <li>
                            Nếu một lớp xuất hiện ở cả hai nhóm, hệ thống sẽ ưu tiên{' '}
                            <strong>bắt buộc</strong>.
                          </li>
                        </ul>
                      </div>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-orange-700">
                            Lớp bắt buộc
                          </label>
                          <select
                            multiple
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200 h-32"
                            value={mandatoryClassIds.map(String)}
                            onChange={handleMandatoryClassSelect}
                            required={!appliesToAllStudents && selectedClasses.length === 0}
                            disabled={submitting || appliesToAllStudents}
                          >
                            {classes.map((cls: any) => (
                              <option key={cls.id} value={cls.id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Các lớp này sẽ được gán diện bắt buộc tham gia.
                          </p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-sky-700">
                            Lớp tự nguyện
                          </label>
                          <select
                            multiple
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200 h-32"
                            value={voluntaryClassIds.map(String)}
                            onChange={handleVoluntaryClassSelect}
                            disabled={submitting || appliesToAllStudents}
                          >
                            {classes.map((cls: any) => (
                              <option
                                key={`voluntary-${cls.id}`}
                                value={cls.id}
                                disabled={mandatoryClassIds.includes(cls.id)}
                              >
                                {cls.name}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Các lớp này có thể tự đăng ký nếu muốn tham gia.
                          </p>
                        </div>
                      </div>
                      {!appliesToAllStudents && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
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
                                          className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800 hover:bg-orange-200"
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
                                    disabled={submitting}
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
                                          className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-800 hover:bg-sky-200"
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
                                    disabled={submitting}
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
                      {!appliesToAllStudents && showPreview && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <div className="mb-2 text-sm font-semibold text-blue-900">
                            Xem trước danh sách tham gia hiện tại
                          </div>
                          {selectedClasses.length === 0 && mandatoryStudentIds.length === 0 && voluntaryStudentIds.length === 0 ? (
                            <p className="text-sm text-gray-600">
                              Chọn ít nhất một lớp hoặc học viên trực tiếp để xem danh sách dự kiến.
                            </p>
                          ) : previewLoading ? (
                            <div className="flex items-center gap-2 text-sm text-blue-700">
                              <Loader2 className="h-4 w-4 animate-spin" />
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
                                <div className="rounded-lg bg-white p-3">
                                  <div className="text-gray-500">Tự nguyện</div>
                                  <div className="text-lg font-bold text-sky-700">
                                    {participationPreview.voluntary_participants}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-white p-3">
                                  <div className="text-gray-500">Xung đột phạm vi</div>
                                  <div className="text-lg font-bold text-amber-700">
                                    {participationPreview.conflict_count}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-600">
                                Nếu một lớp hoặc học viên xuất hiện ở cả hai danh sách, hệ thống sẽ ưu tiên bắt
                                buộc hơn tự nguyện.
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
                                        <div
                                          key={student.id}
                                          className="flex justify-between gap-3"
                                        >
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
                      <div className="text-xs text-gray-500 mt-1">
                        💡 Giữ Ctrl (Windows) hoặc Cmd (Mac) để chọn nhiều lớp
                      </div>
                    </div>
                  </>
                )}

                {currentTab === 'details' && (
                  <>
                    {/* Activity Type, Organization Level, Max Participants */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-medium mb-1">
                          <Award className="w-4 h-4 inline mr-1" />
                          Loại hoạt động
                        </label>
                        <select
                          value={activityTypeId}
                          onChange={(e) =>
                            setActivityTypeId(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                          disabled={submitting}
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
                        <label className="block font-medium mb-1">Cấp tổ chức</label>
                        <select
                          value={organizationLevelId}
                          onChange={(e) =>
                            setOrganizationLevelId(
                              e.target.value === '' ? '' : Number(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                          disabled={submitting}
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
                        <label className="block font-medium mb-1">
                          <UsersIcon className="w-4 h-4 inline mr-1" />
                          Số lượng tối đa
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                          value={maxParticipants}
                          onChange={(e) =>
                            setMaxParticipants(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          disabled={submitting}
                          placeholder="Để trống sẽ dùng 30"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Để trống nếu muốn dùng giá trị mặc định 30 người.
                        </div>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Mẹo:</strong> Chọn loại hoạt động và cấp tổ chức phù hợp để hệ
                        thống tự động tính điểm theo công thức.
                      </p>
                    </div>
                  </>
                )}

                {currentTab === 'files' && (
                  <>
                    {/* Files */}
                    <div>
                      <label className="block font-medium mb-1">Tài liệu đính kèm</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          disabled={submitting || uploading}
                        />
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-dashed border-blue-300 rounded-lg text-blue-700 font-medium w-full justify-center transition-all"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={submitting || uploading || files.length >= 5}
                        >
                          <Upload className="w-5 h-5" /> Chọn file để tải lên (tối đa 5 file)
                        </button>
                        {files.length > 0 && (
                          <ul className="mt-2 space-y-2">
                            {files.map((file, idx) => {
                              const isImage = /image\/(jpeg|png|gif)/.test(file.type);
                              const isPdf =
                                file.type === 'application/pdf' || file.name.endsWith('.pdf');
                              const isDoc =
                                file.type.includes('word') || file.name.match(/\.(docx?)$/i);
                              return (
                                <li
                                  key={file.name + file.size}
                                  className={`flex items-center gap-3 bg-white border-2 rounded-lg px-4 py-3 transition-all ${draggedIdx === idx ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-200'}`}
                                  draggable
                                  onDragStart={() => handleDragStart(idx)}
                                  onDragOver={(e) => handleDragOver(idx, e)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <span className="cursor-move text-gray-400 hover:text-gray-600">
                                    <GripVertical className="w-5 h-5" />
                                  </span>
                                  {isImage ? (
                                    <span className="w-10 h-10 flex items-center justify-center bg-white border rounded-lg overflow-hidden">
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={file.name}
                                        className="object-cover w-full h-full"
                                      />
                                    </span>
                                  ) : isPdf ? (
                                    <span className="w-10 h-10 flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg">
                                      <FileText className="w-6 h-6 text-red-500" />
                                    </span>
                                  ) : isDoc ? (
                                    <span className="w-10 h-10 flex items-center justify-center bg-blue-50 border-2 border-blue-200 rounded-lg">
                                      <FileText className="w-6 h-6 text-blue-500" />
                                    </span>
                                  ) : (
                                    <span className="w-10 h-10 flex items-center justify-center bg-gray-100 border-2 border-gray-200 rounded-lg">
                                      <FileText className="w-6 h-6 text-gray-400" />
                                    </span>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="block truncate text-sm font-medium">
                                      {file.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    onClick={() => handleRemoveFile(idx)}
                                    disabled={submitting || uploading}
                                    title="Xóa file"
                                  >
                                    <X className="w-5 h-5 text-red-500" />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {uploading && (
                          <div className="flex items-center gap-2 text-blue-600 mt-2 p-3 bg-blue-50 rounded-lg">
                            <Loader2 className="animate-spin w-5 h-5" />
                            <span>Đang tải file lên...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 shadow-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTab((current) =>
                        current === 'files' ? 'details' : current === 'details' ? 'basic' : 'basic'
                      )
                    }
                    disabled={currentTab === 'basic'}
                    className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Quay lại bước trước
                  </button>
                  <div className="text-sm text-gray-600">
                    {currentTab === 'basic'
                      ? 'Bước 1/3, hoàn thiện thông tin chính của hoạt động.'
                      : currentTab === 'details'
                        ? 'Bước 2/3, chọn phạm vi lớp, học viên và phân loại.'
                        : 'Bước 3/3, kiểm tra tài liệu và gửi hoạt động.'}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentTab((current) =>
                        current === 'basic' ? 'details' : current === 'details' ? 'files' : 'files'
                      )
                    }
                    disabled={currentTab === 'files'}
                    className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Sang bước tiếp theo
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 border-t border-gray-200 bg-white pt-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      setSubmitMode('draft');
                      handleSubmit(e as any, 'draft');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold disabled:opacity-60 transition-all shadow-md"
                    disabled={submitting || uploading || currentTab !== 'files'}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {submitting ? 'Đang xử lý...' : currentTab !== 'files' ? 'Đến bước 3 để lưu nháp' : 'Lưu nháp'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      setSubmitMode('submit');
                      handleSubmit(e as any, 'submit');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold disabled:opacity-60 transition-all shadow-lg"
                    disabled={submitting || uploading || currentTab !== 'files'}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {submitting ? 'Đang xử lý...' : currentTab !== 'files' ? 'Đến bước 3 để gửi duyệt' : 'Gửi duyệt'}
                  </button>
                </div>
                {success && (
                  <div className="mt-3 p-4 text-green-600 bg-green-50 rounded-lg border-2 border-green-200 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Thành công! Chuyển hướng...</span>
                  </div>
                )}
              </form>
            </div>

            {/* Live Preview */}
            {showPreview && (
              <div className="w-80 border-l border-gray-200 pl-6">
                <h3 className="font-bold text-lg mb-4 text-gray-700 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Xem trước
                </h3>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
                  <h4 className="font-bold text-xl text-gray-800 mb-2">
                    {title || 'Tiêu đề hoạt động'}
                  </h4>
                  {description && (
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{description}</p>
                  )}
                  <div className="space-y-2 text-sm">
                    {date && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>
                          {new Date(date).toLocaleDateString('vi-VN')}
                          {time && ` lúc ${time}`}
                        </span>
                      </div>
                    )}
                    {location && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4 text-green-500" />
                        <span>{location}</span>
                      </div>
                    )}
                    {maxParticipants && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <UsersIcon className="w-4 h-4 text-purple-500" />
                        <span>Tối đa: {maxParticipants} người</span>
                      </div>
                    )}
                    {selectedClasses.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="font-medium text-gray-700 mb-1">Áp dụng cho:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedClasses.map((classId) => {
                            const cls = classes.find((c) => c.id === classId);
                            return cls ? (
                              <span
                                key={classId}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                              >
                                {cls.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {files.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="font-medium text-gray-700 mb-1">
                          <FileText className="w-4 h-4 inline mr-1" />
                          {files.length} tài liệu đính kèm
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
