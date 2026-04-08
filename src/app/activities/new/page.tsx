'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useSubmit } from '@/lib/use-submit-hook';
import {
  BookOpen,
  Dumbbell,
  Palette,
  Lightbulb,
  Heart,
  Calendar,
  MapPin,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// Activity templates
const ACTIVITY_TEMPLATES = [
  {
    id: 'academic',
    name: 'Học thuật',
    icon: BookOpen,
    color: 'blue',
    description: 'Hoạt động học tập, seminar, workshop',
    example: 'Workshop lập trình Python, Hội thảo khoa học',
    defaultDescription: 'Tham gia hoạt động học thuật này để phát triển kỹ năng chuyên môn.',
    maxParticipants: 40,
  },
  {
    id: 'sports',
    name: 'Thể thao',
    icon: Dumbbell,
    color: 'red',
    description: 'Các hoạt động thể thao, trò chơi tập thể',
    example: 'Bóng đá, Cầu lông, Marathon trường',
    defaultDescription: 'Cùng tham gia hoạt động thể thao để rèn luyện sức khỏe.',
    maxParticipants: 50,
  },
  {
    id: 'arts',
    name: 'Văn nghệ',
    icon: Palette,
    color: 'purple',
    description: 'Hoạt động nghệ thuật, văn hóa, biểu diễn',
    example: 'Hòa tấu âm nhạc, Vẽ tranh, Hát karaoke',
    defaultDescription: 'Khám phá và phát huy tài năng nghệ thuật của bạn.',
    maxParticipants: 60,
  },
  {
    id: 'skills',
    name: 'Kỹ năng',
    icon: Lightbulb,
    color: 'amber',
    description: 'Huấn luyện kỹ năng sống, giao tiếp',
    example: 'Kỹ năng giao tiếp, Lãnh đạo nhóm, Giải quyết xung đột',
    defaultDescription: 'Phát triển kỹ năng cần thiết cho sự thành công.',
    maxParticipants: 35,
  },
  {
    id: 'volunteer',
    name: 'Thiện nguyện',
    icon: Heart,
    color: 'green',
    description: 'Hoạt động cộng đồng, tình nguyện',
    example: 'Dọn vệ sinh môi trường, Hỗ trợ trẻ em',
    defaultDescription: 'Cùng nhau tạo nên những thay đổi tích cực cho cộng đồng.',
    maxParticipants: 45,
  },
];

// Common location suggestions
const LOCATION_SUGGESTIONS = [
  'Phòng 201 - Tòa A',
  'Phòng 301 - Tòa B',
  'Hội trường lớn',
  'Sân trường',
  'Thư viện',
  'Phòng thí nghiệm',
  'Sân vận động',
  'Câu lạc bộ',
  'Phòng đa năng',
  'Khu vườn trường',
];

interface ClassOption {
  id: number;
  name: string;
  grade: string;
}

export default function NewActivityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClearDraftDialogOpen, setIsClearDraftDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'classes' | 'files' | 'preview'>(
    'basic'
  );
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date_time: '',
    location: '',
    max_participants: 30,
    class_ids: [] as number[],
    attachments: [] as string[],
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [error, setError] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && user.role === 'teacher') {
      fetchClasses();
      // Load draft from localStorage
      const savedDraft = localStorage.getItem('activity_draft');
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setFormData(draft);
          setAutoSaveStatus('saved');
        } catch (e) {
          console.error('Failed to load draft:', e);
        }
      }
    } else {
      router.push('/activities');
    }
  }, [user, loading, router]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!user) return;

    const saveTimer = setTimeout(() => {
      if (formData.title || formData.description) {
        setAutoSaveStatus('saving');
        localStorage.setItem('activity_draft', JSON.stringify(formData));
        setTimeout(() => setAutoSaveStatus('saved'), 500);
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer);
  }, [formData, user]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách lớp:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }));
  };

  const handleClassChange = (classId: number, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      class_ids: checked
        ? [...prev.class_ids, classId]
        : prev.class_ids.filter((id) => id !== classId),
    }));
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = ACTIVITY_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setFormData((prev) => ({
      ...prev,
      description: template.defaultDescription,
      max_participants: template.maxParticipants,
    }));
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    setFormData((prev) => ({
      ...prev,
      description: '',
      max_participants: 30,
    }));
  };

  const { handleSubmit: submitActivity, state } = useSubmit(
    async () => {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Clear draft on successful submission
        localStorage.removeItem('activity_draft');
        router.push('/activities');
        return data;
      } else {
        throw new Error(data.error || 'Tạo hoạt động thất bại');
      }
    },
    {
      debounceMs: 500,
      cooldownMs: 1000,
      onError: (err) => setError(err.message),
    }
  );

  const handleClearDraft = () => {
    localStorage.removeItem('activity_draft');
    setFormData({
      title: '',
      description: '',
      date_time: '',
      location: '',
      max_participants: 30,
      class_ids: [],
      attachments: [],
    });
    setSelectedTemplate(null);
    setAutoSaveStatus('saved');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    await submitActivity();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'teacher') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tạo hoạt động mới</h1>
              <p className="mt-2 text-gray-600">Thêm hoạt động ngoại khóa mới vào hệ thống</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-save indicator */}
              <div className="text-sm">
                {autoSaveStatus === 'saving' && (
                  <span className="text-amber-600">💾 Đang lưu...</span>
                )}
                {autoSaveStatus === 'saved' && (formData.title || formData.description) && (
                  <span className="text-green-600">✓ Đã lưu tự động</span>
                )}
              </div>
              {(formData.title || formData.description) && (
                <button
                  type="button"
                  onClick={() => setIsClearDraftDialogOpen(true)}
                  className="text-sm text-red-600 hover:text-red-700 underline"
                >
                  Xóa nháp
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Chọn loại hoạt động</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {ACTIVITY_TEMPLATES.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate === template.id;
              const colorClasses = {
                blue: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
                red: 'border-red-200 bg-red-50 hover:bg-red-100',
                purple: 'border-purple-200 bg-purple-50 hover:bg-purple-100',
                amber: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
                green: 'border-green-200 bg-green-50 hover:bg-green-100',
              };

              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? `border-${template.color}-500 ${colorClasses[template.color as keyof typeof colorClasses]} ring-2 ring-${template.color}-300`
                      : `border-gray-200 hover:border-gray-300 ${colorClasses[template.color as keyof typeof colorClasses]}`
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 mb-2 ${
                      isSelected ? 'text-' + template.color + '-600' : 'text-gray-600'
                    }`}
                  />
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Template Info */}
        {selectedTemplate && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-blue-900">
                  Mẫu: {ACTIVITY_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
                </h3>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Ví dụ:</strong>{' '}
                  {ACTIVITY_TEMPLATES.find((t) => t.id === selectedTemplate)?.example}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Số lượng dự kiến:</strong>{' '}
                  {ACTIVITY_TEMPLATES.find((t) => t.id === selectedTemplate)?.maxParticipants} người
                </p>
              </div>
              <button
                onClick={handleClearTemplate}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Xóa
              </button>
            </div>
          </div>
        )}

        {/* Form and Preview Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {/* Tab Navigation */}
              <div className="mb-6 border-b border-gray-200">
                <div className="flex space-x-1 overflow-x-auto">
                  {[
                    { id: 'basic', label: '📝 Cơ bản', required: true },
                    { id: 'details', label: '⏰ Chi tiết', required: true },
                    { id: 'classes', label: '👥 Lớp học', required: false },
                    { id: 'files', label: '📎 Tệp đính kèm', required: false },
                    { id: 'preview', label: '👁️ Xem trước', required: false },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setActiveTab(tab.id as 'basic' | 'details' | 'classes' | 'files' | 'preview')
                      }
                      className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-green-600 text-green-600'
                          : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                      {tab.required && <span className="text-red-500 ml-1">*</span>}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* TAB 1: Cơ bản */}
                {activeTab === 'basic' && (
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Tên hoạt động *
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Ví dụ: Workshop Vẽ tranh, CLB Debate..."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Đặt tên ngắn gọn, dễ nhớ để học viên dễ tìm kiếm
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="description"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Mô tả hoạt động *
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={4}
                        required
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Mô tả chi tiết về hoạt động..."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Mô tả mục tiêu, nội dung chính, và những gì học viên sẽ nhận được (
                        {formData.description.length}/500 ký tự)
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: Chi tiết */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="date_time"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Thời gian *
                        </label>
                        <input
                          type="datetime-local"
                          id="date_time"
                          name="date_time"
                          required
                          value={formData.date_time}
                          onChange={handleChange}
                          min={new Date().toISOString().slice(0, 16)}
                          max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                            .toISOString()
                            .slice(0, 16)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Chọn thời gian bắt đầu hoạt động
                        </p>
                      </div>

                      <div className="relative">
                        <label
                          htmlFor="location"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Địa điểm *
                        </label>
                        <input
                          type="text"
                          id="location"
                          name="location"
                          required
                          value={formData.location}
                          onChange={handleChange}
                          onFocus={() => setShowLocationSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Ví dụ: Phòng 201, Sân trường..."
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Nhập địa điểm hoặc chọn từ gợi ý
                        </p>

                        {/* Location Suggestions Dropdown */}
                        {showLocationSuggestions && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {LOCATION_SUGGESTIONS.filter((loc) =>
                              loc.toLowerCase().includes(formData.location.toLowerCase())
                            ).map((location, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, location }));
                                  setShowLocationSuggestions(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b last:border-b-0"
                              >
                                {location}
                              </button>
                            ))}
                            {LOCATION_SUGGESTIONS.filter((loc) =>
                              loc.toLowerCase().includes(formData.location.toLowerCase())
                            ).length === 0 && (
                              <div className="px-4 py-2 text-sm text-gray-500">
                                Không có gợi ý phù hợp
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="max_participants"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Số lượng tối đa
                      </label>
                      <input
                        type="number"
                        id="max_participants"
                        name="max_participants"
                        min="1"
                        max="100"
                        value={formData.max_participants}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Giới hạn số học viên có thể tham gia (1-100 người)
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 3: Lớp học */}
                {activeTab === 'classes' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Lớp được tham gia (để trống nếu cho tất cả)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Chọn các lớp có thể đăng ký, hoặc bỏ trống để mở cho tất cả các lớp
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                      {classes.map((classItem) => (
                        <label
                          key={classItem.id}
                          className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.class_ids.includes(classItem.id)}
                            onChange={(e) => handleClassChange(classItem.id, e.target.checked)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700 font-medium">
                            {classItem.name}
                          </span>
                          <span className="text-xs text-gray-500">{classItem.grade}</span>
                        </label>
                      ))}
                      {classes.length === 0 && (
                        <p className="text-sm text-gray-500 py-4 text-center">
                          Không có lớp học nào
                        </p>
                      )}
                    </div>
                    {formData.class_ids.length === 0 && (
                      <p className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                        ✓ Hoạt động mở cho tất cả các lớp
                      </p>
                    )}
                  </div>
                )}

                {/* TAB 4: Tệp đính kèm */}
                {activeTab === 'files' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Tệp đính kèm (không bắt buộc)
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Thêm tài liệu, hình ảnh, hoặc file giới thiệu về hoạt động
                      </p>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                        <div className="text-sm text-gray-600">
                          <label className="cursor-pointer text-green-600 hover:text-green-700 font-medium">
                            Nhấn để chọn file
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                const fileNames = files.map((f) => f.name);
                                setFormData((prev) => ({
                                  ...prev,
                                  attachments: [...prev.attachments, ...fileNames],
                                }));
                              }}
                            />
                          </label>
                          <span className="text-gray-500"> hoặc kéo thả file vào đây</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Hỗ trợ: PDF, Word, JPG, PNG (Tối đa 10MB/file)
                        </p>
                      </div>
                    </div>

                    {/* File list */}
                    {formData.attachments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">
                          File đã chọn ({formData.attachments.length})
                        </h4>
                        <div className="space-y-2">
                          {formData.attachments.map((fileName, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                            >
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700">{fileName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    attachments: prev.attachments.filter((_, i) => i !== index),
                                  }));
                                }}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Xóa
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: Xem trước */}
                {activeTab === 'preview' && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">
                          {formData.title || '(Tên hoạt động)'}
                        </h4>
                        {selectedTemplate && (
                          <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {ACTIVITY_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {formData.description || '(Mô tả hoạt động sẽ hiển thị ở đây)'}
                      </p>

                      <div className="border-t pt-4 space-y-3">
                        {formData.date_time && (
                          <div className="flex items-start">
                            <Calendar className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {new Date(formData.date_time).toLocaleDateString('vi-VN', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </div>
                              <div className="text-gray-600">
                                {new Date(formData.date_time).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {formData.location && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                            <span className="text-sm text-gray-700">{formData.location}</span>
                          </div>
                        )}

                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            Tối đa {formData.max_participants} người
                          </span>
                        </div>

                        {formData.class_ids.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium text-gray-500 mb-2">
                              Lớp được tham gia ({formData.class_ids.length})
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {formData.class_ids.slice(0, 3).map((classId) => {
                                const classItem = classes.find((c) => c.id === classId);
                                return classItem ? (
                                  <span
                                    key={classId}
                                    className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded"
                                  >
                                    {classItem.name}
                                  </span>
                                ) : null;
                              })}
                              {formData.class_ids.length > 3 && (
                                <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                                  +{formData.class_ids.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <div className="text-sm text-gray-600">
                    {!formData.title ||
                    !formData.description ||
                    !formData.date_time ||
                    !formData.location ? (
                      <span className="text-amber-600">⚠ Vui lòng điền đầy đủ thông tin</span>
                    ) : (
                      <span className="text-green-600 font-medium">
                        ✓ Tất cả thông tin bắt buộc đã được điền
                      </span>
                    )}
                  </div>
                  <div className="space-x-4">
                    <button
                      type="button"
                      onClick={() => router.push('/activities')}
                      className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={
                        !formData.title ||
                        !formData.description ||
                        !formData.date_time ||
                        !formData.location ||
                        state.isDisabled
                      }
                      className={`bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${state.buttonClass}`}
                    >
                      {state.buttonText}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Xem trước
              </h3>

              {/* Validation Status */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center text-sm">
                  {formData.title ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-300 mr-2" />
                  )}
                  <span className={formData.title ? 'text-gray-700' : 'text-gray-400'}>
                    Tên hoạt động
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  {formData.description ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-300 mr-2" />
                  )}
                  <span className={formData.description ? 'text-gray-700' : 'text-gray-400'}>
                    Mô tả hoạt động
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  {formData.date_time ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-300 mr-2" />
                  )}
                  <span className={formData.date_time ? 'text-gray-700' : 'text-gray-400'}>
                    Thời gian
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  {formData.location ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-300 mr-2" />
                  )}
                  <span className={formData.location ? 'text-gray-700' : 'text-gray-400'}>
                    Địa điểm
                  </span>
                </div>
              </div>

              {/* Preview Content */}
              <div className="space-y-4">
                {/* Title Preview */}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {formData.title || 'Tên hoạt động...'}
                  </h4>
                  {selectedTemplate && (
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {ACTIVITY_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
                    </span>
                  )}
                </div>

                {/* Description Preview */}
                {formData.description && (
                  <div>
                    <p className="text-sm text-gray-600 line-clamp-3">{formData.description}</p>
                  </div>
                )}

                <div className="border-t pt-4 space-y-3">
                  {/* Date/Time Preview */}
                  {formData.date_time && (
                    <div className="flex items-start">
                      <Calendar className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {new Date(formData.date_time).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-gray-600">
                          {new Date(formData.date_time).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location Preview */}
                  {formData.location && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-700">{formData.location}</span>
                    </div>
                  )}

                  {/* Participants Preview */}
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      Tối đa {formData.max_participants} người
                    </span>
                  </div>

                  {/* Class Selection Preview */}
                  {formData.class_ids.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        Lớp được tham gia ({formData.class_ids.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {formData.class_ids.slice(0, 3).map((classId) => {
                          const classItem = classes.find((c) => c.id === classId);
                          return classItem ? (
                            <span
                              key={classId}
                              className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {classItem.name}
                            </span>
                          ) : null;
                        })}
                        {formData.class_ids.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            +{formData.class_ids.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {formData.class_ids.length === 0 && (
                    <div className="text-xs text-gray-500 mt-3">Mở cho tất cả các lớp</div>
                  )}
                </div>

                {/* Completion Progress */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span>Hoàn thành</span>
                    <span>
                      {
                        [
                          formData.title,
                          formData.description,
                          formData.date_time,
                          formData.location,
                        ].filter(Boolean).length
                      }{' '}
                      / 4
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          ([
                            formData.title,
                            formData.description,
                            formData.date_time,
                            formData.location,
                          ].filter(Boolean).length /
                            4) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isClearDraftDialogOpen}
        title="Xóa bản nháp"
        message="Bạn có chắc chắn muốn xóa bản nháp hoạt động đã lưu không?"
        confirmText="Xóa bản nháp"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setIsClearDraftDialogOpen(false)}
        onConfirm={async () => {
          handleClearDraft();
          setIsClearDraftDialogOpen(false);
        }}
      />
    </div>
  );
}
