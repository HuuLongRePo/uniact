'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface PollTemplate {
  id: number;
  name: string;
  category: string;
  poll_type: string;
  default_options: string[];
  description: string;
  created_at: string;
}

interface PollSettings {
  id: number;
  default_duration_minutes: number;
  allow_multiple_answers: boolean;
  show_results_before_closing: boolean;
  allow_anonymous_responses: boolean;
  default_visibility: 'class' | 'student' | 'all';
  templates: PollTemplate[];
}

export default function PollSettingsPage() {
  const [settings, setSettings] = useState<PollSettings>({
    id: 1,
    default_duration_minutes: 60,
    allow_multiple_answers: false,
    show_results_before_closing: true,
    allow_anonymous_responses: false,
    default_visibility: 'class',
    templates: [],
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'general',
    poll_type: 'single_choice',
    description: '',
    defaultOptions: ['', '', ''],
  });

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [templateToDelete, setTemplateToDelete] = useState<PollTemplate | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/polls/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Không thể tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/teacher/polls/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_duration_minutes: settings.default_duration_minutes,
          allow_multiple_answers: settings.allow_multiple_answers,
          show_results_before_closing: settings.show_results_before_closing,
          allow_anonymous_responses: settings.allow_anonymous_responses,
          default_visibility: settings.default_visibility,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      toast.success('Lưu cấu hình thành công');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error('Vui lòng nhập tên mẫu');
      return;
    }

    const validOptions = newTemplate.defaultOptions.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      toast.error('Vui lòng nhập ít nhất 2 tùy chọn');
      return;
    }

    try {
      const response = await fetch('/api/teacher/polls/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplate.name,
          category: newTemplate.category,
          poll_type: newTemplate.poll_type,
          description: newTemplate.description,
          default_options: validOptions,
        }),
      });

      if (!response.ok) throw new Error('Failed to create template');
      const data = await response.json();

      setSettings({
        ...settings,
        templates: [...settings.templates, data],
      });

      setNewTemplate({
        name: '',
        category: 'general',
        poll_type: 'single_choice',
        description: '',
        defaultOptions: ['', '', ''],
      });
      setShowTemplateForm(false);
      toast.success('Tạo mẫu thành công');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Không thể tạo mẫu');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      const response = await fetch(`/api/teacher/polls/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      setSettings({
        ...settings,
        templates: settings.templates.filter((t) => t.id !== id),
      });
      toast.success('Xóa mẫu thành công');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Không thể xóa mẫu');
    }
  };

  const handleCopyTemplate = (template: PollTemplate) => {
    const templateText = `${template.name}\n${template.description}\nTùy chọn:\n${template.default_options.join('\n')}`;
    navigator.clipboard.writeText(templateText);
    toast.success('Đã sao chép mẫu');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Save Button */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Cấu hình bình chọn
              </h1>
              <p className="text-gray-600 mt-2">Quản lý mẫu và cài đặt mặc định cho bình chọn</p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Cài đặt chung</h2>

          <div className="space-y-6">
            {/* Duration Setting */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Thời gian mặc định (phút)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={settings.default_duration_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_duration_minutes: parseInt(e.target.value) || 60,
                  })
                }
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-600 mt-1">Thời gian mặc định cho bình chọn mới</p>
            </div>

            {/* Visibility Setting */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Phạm vi hiển thị mặc định
              </label>
              <select
                value={settings.default_visibility}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_visibility: e.target.value as 'class' | 'student' | 'all',
                  })
                }
                className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="class">Lớp học</option>
                <option value="student">Từng học viên</option>
                <option value="all">Toàn bộ</option>
              </select>
              <p className="text-sm text-gray-600 mt-1">Ai có thể thấy kết quả bình chọn</p>
            </div>

            {/* Multiple Answers */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="multiple_answers"
                checked={settings.allow_multiple_answers}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allow_multiple_answers: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="multiple_answers" className="ml-3 text-gray-900 cursor-pointer">
                Cho phép chọn nhiều câu trả lời
              </label>
              <p className="text-sm text-gray-600 ml-3">Học viên có thể chọn nhiều tùy chọn</p>
            </div>

            {/* Show Results Before Closing */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="show_results_before"
                checked={settings.show_results_before_closing}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    show_results_before_closing: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="show_results_before" className="ml-3 text-gray-900 cursor-pointer">
                Hiển thị kết quả trước khi đóng
              </label>
              <p className="text-sm text-gray-600 ml-3">
                Học viên có thể xem kết quả trong khi bình chọn đang diễn ra
              </p>
            </div>

            {/* Anonymous Responses */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="anonymous"
                checked={settings.allow_anonymous_responses}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allow_anonymous_responses: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="anonymous" className="ml-3 text-gray-900 cursor-pointer">
                Cho phép phản hồi ẩn danh
              </label>
              <p className="text-sm text-gray-600 ml-3">
                Không hiển thị tên học viên trong kết quả
              </p>
            </div>
          </div>
        </div>

        {/* Templates Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Mẫu bình chọn</h2>
            <button
              onClick={() => setShowTemplateForm(!showTemplateForm)}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              {showTemplateForm ? 'Hủy' : 'Thêm mẫu'}
            </button>
          </div>

          {/* New Template Form */}
          {showTemplateForm && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Tên mẫu *</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="ví dụ: Đánh giá bài học"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Danh mục</label>
                    <select
                      value={newTemplate.category}
                      onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">Chung</option>
                      <option value="feedback">Phản hồi</option>
                      <option value="assessment">Đánh giá</option>
                      <option value="engagement">Tương tác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Loại bình chọn
                    </label>
                    <select
                      value={newTemplate.poll_type}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, poll_type: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single_choice">Lựa chọn duy nhất</option>
                      <option value="multiple_choice">Nhiều lựa chọn</option>
                      <option value="rating">Đánh giá</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Mô tả</label>
                  <textarea
                    value={newTemplate.description}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, description: e.target.value })
                    }
                    placeholder="Mô tả mẫu..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Tùy chọn mặc định
                  </label>
                  <div className="space-y-2">
                    {newTemplate.defaultOptions.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...newTemplate.defaultOptions];
                          updated[idx] = e.target.value;
                          setNewTemplate({ ...newTemplate, defaultOptions: updated });
                        }}
                        placeholder={`Tùy chọn ${idx + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddTemplate}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Tạo mẫu
                </button>
              </div>
            </div>
          )}

          {/* Templates List */}
          {settings.templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Chưa có mẫu nào. Tạo mẫu mới để bắt đầu!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                          {template.category}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {template.poll_type === 'single_choice' && 'Chọn duy nhất'}
                          {template.poll_type === 'multiple_choice' && 'Nhiều lựa chọn'}
                          {template.poll_type === 'rating' && 'Đánh giá'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Tùy chọn: {template.default_options.join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyTemplate(template)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded transition"
                        title="Sao chép"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTemplateToDelete(template)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={templateToDelete !== null}
          title="Xóa mẫu bình chọn"
          message={
            templateToDelete ? `Bạn có chắc chắn muốn xóa mẫu "${templateToDelete.name}"?` : ''
          }
          confirmText="Xóa mẫu"
          cancelText="Hủy"
          variant="danger"
          onCancel={() => setTemplateToDelete(null)}
          onConfirm={async () => {
            if (!templateToDelete) return;
            await handleDeleteTemplate(templateToDelete.id);
            setTemplateToDelete(null);
          }}
        />
      </div>
    </div>
  );
}
