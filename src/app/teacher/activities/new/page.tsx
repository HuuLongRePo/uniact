'use client';

import { useState, useEffect, useRef } from 'react';
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

interface ActivityType {
  id: number;
  name: string;
}

interface OrganizationLevel {
  id: number;
  name: string;
}

export default function CreateActivityPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
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
      fetch('/api/classes?mine=1').then((res) => res.json()),
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

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions).map((opt) => Number(opt.value));
    setSelectedClasses(values);
  };

  const handleSubmit = async (e: React.FormEvent, mode: 'draft' | 'submit') => {
    e.preventDefault();
    if (!title.trim() || !date || selectedClasses.length === 0) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    let uploadedFiles = [];
    try {
      if (files.length > 0) {
        setUploading(true);
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        const res = await fetch('/api/activities/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Upload thất bại');
        const data = await res.json();
        uploadedFiles = data.files || [];
        setUploading(false);
      }
      // Submit activity
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          date_time: time ? `${date}T${time}` : `${date}T00:00`,
          location,
          max_participants: maxParticipants ? Number(maxParticipants) : null,
          class_ids: selectedClasses,
          activity_type_id: activityTypeId ? Number(activityTypeId) : null,
          organization_level_id: organizationLevelId ? Number(organizationLevelId) : null,
          files: uploadedFiles,
          status: 'draft',
        }),
      });
      if (!res.ok) throw new Error('Tạo hoạt động thất bại');
      setSuccess(true);
      toast.success(mode === 'draft' ? 'Lưu nháp thành công!' : 'Gửi duyệt thành công!');
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setLocation('');
      setMaxParticipants('');
      setSelectedClasses([]);
      setActivityTypeId('');
      setOrganizationLevelId('');
      setFiles([]);
      setTimeout(() => {
        window.location.href = '/teacher/activities';
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra');
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
                {showPreview ? 'Ẩn xem trước' : 'Xem trước'}
              </button>
            </div>
          </div>

          {/* Tabs */}
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
              Thông tin cơ bản
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
              Chi tiết & phân loại
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
              Tài liệu đính kèm
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <label className="block font-medium mb-1">Giờ</label>
                        <input
                          type="time"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          Địa điểm
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          disabled={submitting}
                          placeholder="Phòng 101"
                        />
                      </div>
                    </div>

                    {/* Classes Selection */}
                    <div>
                      <label className="block font-medium mb-1">
                        <UsersIcon className="w-4 h-4 inline mr-1" />
                        Chọn lớp <span className="text-red-500">*</span>
                      </label>
                      <select
                        multiple
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200 h-32"
                        value={selectedClasses.map(String)}
                        onChange={handleClassSelect}
                        required
                        disabled={submitting}
                      >
                        {classes.map((cls: any) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
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
                          placeholder="Không giới hạn"
                        />
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

                {/* Action Buttons */}
                <div className="pt-6 flex gap-3 border-t border-gray-200">
                  <button
                    type="submit"
                    onClick={() => setSubmitMode('draft')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold disabled:opacity-60 transition-all shadow-md"
                    disabled={submitting || uploading}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {submitting ? 'Đang xử lý...' : 'Lưu nháp'}
                  </button>
                  <button
                    type="submit"
                    onClick={() => setSubmitMode('submit')}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold disabled:opacity-60 transition-all shadow-lg"
                    disabled={submitting || uploading}
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {submitting ? 'Đang xử lý...' : 'Gửi duyệt'}
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
