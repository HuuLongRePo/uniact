'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Copy,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

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

interface TemplateDraft {
  name: string;
  category: string;
  pollType: string;
  description: string;
  options: string[];
}

const EMPTY_TEMPLATE: TemplateDraft = {
  name: '',
  category: 'general',
  pollType: 'single_choice',
  description: '',
  options: ['', '', ''],
};

function getResponseSettings(payload: any): PollSettings | null {
  return payload?.data?.settings ?? payload?.settings ?? null;
}

function getErrorMessage(payload: any, fallback: string) {
  return String(payload?.error || payload?.message || fallback);
}

function normalizeSettings(settings: PollSettings | null): PollSettings {
  return {
    id: Number(settings?.id || 1),
    default_duration_minutes: Math.max(1, Number(settings?.default_duration_minutes || 60)),
    allow_multiple_answers: Boolean(settings?.allow_multiple_answers),
    show_results_before_closing: settings?.show_results_before_closing !== false,
    allow_anonymous_responses: Boolean(settings?.allow_anonymous_responses),
    default_visibility:
      settings?.default_visibility === 'student' || settings?.default_visibility === 'all'
        ? settings.default_visibility
        : 'class',
    templates: Array.isArray(settings?.templates) ? settings.templates : [],
  };
}

function pollTypeLabel(type: string) {
  switch (type) {
    case 'multiple_choice':
      return 'Multiple choice';
    case 'rating':
      return 'Rating';
    default:
      return 'Một lựa chọn';
  }
}

export default function TeacherPollSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [settings, setSettings] = useState<PollSettings>(normalizeSettings(null));
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(EMPTY_TEMPLATE);
  const [templatePendingDelete, setTemplatePendingDelete] = useState<PollTemplate | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
      router.replace('/login');
      return;
    }

    if (user) {
      void fetchSettings();
    }
  }, [authLoading, router, user]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/polls/settings');
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Không thể tải cấu hình khảo sát'));
      }

      setSettings(normalizeSettings(getResponseSettings(payload)));
    } catch (error) {
      console.error('Teacher poll settings fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải cấu hình khảo sát');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
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
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Không thể lưu cấu hình khảo sát'));
      }

      setSettings(normalizeSettings(getResponseSettings(payload)));
      toast.success(String(payload?.message || 'Đã lưu cấu hình khảo sát'));
    } catch (error) {
      console.error('Teacher poll settings save error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể lưu cấu hình khảo sát');
    } finally {
      setSaving(false);
    }
  }

  function updateTemplateOption(index: number, value: string) {
    setTemplateDraft((current) => {
      const next = [...current.options];
      next[index] = value;
      return { ...current, options: next };
    });
  }

  function addTemplateOption() {
    setTemplateDraft((current) => ({
      ...current,
      options: [...current.options, ''],
    }));
  }

  function removeTemplateOption(index: number) {
    setTemplateDraft((current) => {
      if (current.options.length <= 2) return current;
      return {
        ...current,
        options: current.options.filter((_, optionIndex) => optionIndex !== index),
      };
    });
  }

  function resetTemplateDraft() {
    setTemplateDraft(EMPTY_TEMPLATE);
  }

  async function handleCreateTemplate() {
    const cleanName = templateDraft.name.trim();
    const cleanDescription = templateDraft.description.trim();
    const cleanOptions = templateDraft.options.map((option) => option.trim()).filter(Boolean);

    if (!cleanName) {
      toast.error('Cần nhập tên mẫu khảo sát');
      return;
    }

    if (cleanOptions.length < 2) {
      toast.error('Cần ít nhất 2 tùy chọn mặc định');
      return;
    }

    try {
      setCreatingTemplate(true);
      const response = await fetch('/api/teacher/polls/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          category: templateDraft.category,
          poll_type: templateDraft.pollType,
          description: cleanDescription,
          default_options: cleanOptions,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Không thể tạo mẫu khảo sát'));
      }

      const template = payload?.data?.template ?? payload?.template ?? null;
      if (template) {
        setSettings((current) => ({
          ...current,
          templates: [template, ...current.templates],
        }));
      }

      resetTemplateDraft();
      setShowTemplateForm(false);
      toast.success(String(payload?.message || 'Đã tạo mẫu khảo sát'));
    } catch (error) {
      console.error('Teacher poll template create error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tạo mẫu khảo sát');
    } finally {
      setCreatingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!templatePendingDelete) return;

    try {
      const response = await fetch(`/api/teacher/polls/templates/${templatePendingDelete.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Không thể xóa mẫu khảo sát'));
      }

      setSettings((current) => ({
        ...current,
        templates: current.templates.filter((item) => item.id !== templatePendingDelete.id),
      }));
      setTemplatePendingDelete(null);
      toast.success(String(payload?.message || 'Đã xóa mẫu khảo sát'));
    } catch (error) {
      console.error('Teacher poll template delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xóa mẫu khảo sát');
    }
  }

  async function handleCopyTemplate(template: PollTemplate) {
    const text = [
      template.name,
      template.description,
      '',
      'Tùy chọn mặc định:',
      ...template.default_options.map((option, index) => `${index + 1}. ${option}`),
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Đã sao chép nội dung mẫu khảo sát');
    } catch (error) {
      console.error('Teacher poll template copy error:', error);
      toast.error('Không thể sao chép nội dung mẫu khảo sát');
    }
  }

  if (authLoading || loading) {
    return <LoadingSpinner message="Đang tải cấu hình khảo sát..." />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <Settings2 className="h-3.5 w-3.5" />
                Cấu hình mặc định
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Cấu hình khảo sát</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Định nghĩa chính sách mặc định cho khảo sát và quản lý bộ mẫu để giảng viên tạo nhanh
                các khảo sát lặp đi lặp lại.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleSaveSettings()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="content-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Mặc định khi tạo khảo sát</h2>
                <p className="text-sm text-slate-500">
                  Các giá trị được nạp sẵn khi giảng viên tạo khảo sát mới.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Thời lượng mặc định (phút)
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={settings.default_duration_minutes}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      default_duration_minutes: Number.parseInt(event.target.value, 10) || 60,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Phạm vi hiển thị mặc định
                <select
                  value={settings.default_visibility}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      default_visibility: event.target.value as 'class' | 'student' | 'all',
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="class">Trong lớp</option>
                  <option value="student">Theo học viên</option>
                  <option value="all">Toàn bộ người xem được cấp phép</option>
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <label className="rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.allow_multiple_answers}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      allow_multiple_answers: event.target.checked,
                    }))
                  }
                  className="mr-3 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                />
                Cho phép chọn nhiều đáp án
              </label>

              <label className="rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.show_results_before_closing}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      show_results_before_closing: event.target.checked,
                    }))
                  }
                  className="mr-3 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                />
                Hiện kết quả trước khi đóng khảo sát
              </label>

              <label className="rounded-3xl border border-slate-200 px-4 py-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.allow_anonymous_responses}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      allow_anonymous_responses: event.target.checked,
                    }))
                  }
                  className="mr-3 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                />
                Cho phép phản hồi ẩn danh
              </label>
            </div>

            <div className="mt-5 rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-900">
              Nếu team muốn thay đổi chính sách toàn hệ thống, trang này chỉ ảnh hưởng không gian khảo sát của
              giảng viên hiện tại, không thay cấu hình quản trị cấp cao hơn.
            </div>
          </div>

          <div className="content-card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Mẫu khảo sát</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bộ câu hỏi mẫu để giảng viên tạo khảo sát nhanh mà vẫn đúng khung.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTemplateForm((current) => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {showTemplateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showTemplateForm ? 'Đóng biểu mẫu' : 'Thêm mẫu'}
              </button>
            </div>

            {showTemplateForm ? (
              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Tên mẫu
                    <input
                      type="text"
                      value={templateDraft.name}
                      onChange={(event) =>
                        setTemplateDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Ví dụ: Khảo sát buổi học"
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Danh mục
                    <select
                      value={templateDraft.category}
                      onChange={(event) =>
                        setTemplateDraft((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="general">Tổng quát</option>
                      <option value="feedback">Phản hồi</option>
                      <option value="assessment">Đánh giá</option>
                      <option value="engagement">Tương tác</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Loại khảo sát
                    <select
                      value={templateDraft.pollType}
                      onChange={(event) =>
                        setTemplateDraft((current) => ({
                          ...current,
                          pollType: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="single_choice">Một lựa chọn</option>
                      <option value="multiple_choice">Nhiều lựa chọn</option>
                      <option value="rating">Rating</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700 lg:col-span-2">
                    Mô tả
                    <textarea
                      value={templateDraft.description}
                      onChange={(event) =>
                        setTemplateDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Mô tả ngắn để giảng viên biết khi nào nên dùng mẫu này."
                      className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 leading-6 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-medium text-slate-700">Tùy chọn mặc định</div>
                  <div className="mt-3 space-y-3">
                    {templateDraft.options.map((option, index) => (
                      <div key={`${index}-${templateDraft.options.length}`} className="flex gap-3">
                        <input
                          type="text"
                          value={option}
                          onChange={(event) => updateTemplateOption(index, event.target.value)}
                          placeholder={`Tùy chọn ${index + 1}`}
                          className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                        />
                        {templateDraft.options.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => removeTemplateOption(index)}
                            className="rounded-2xl border border-slate-200 px-3 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                            aria-label={`Xóa tùy chọn ${index + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addTemplateOption}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm tùy chọn
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      resetTemplateDraft();
                      setShowTemplateForm(false);
                    }}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateTemplate()}
                    disabled={creatingTemplate}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {creatingTemplate ? 'Đang tạo...' : 'Tạo mẫu'}
                  </button>
                </div>
              </div>
            ) : null}

            {settings.templates.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 px-4 py-12 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <p className="text-lg font-medium text-slate-700">Chưa có mẫu khảo sát nào</p>
                <p className="mt-2 text-sm text-slate-500">
                  Tạo mẫu để rút ngắn thao tác khi lặp lại những khảo sát giống nhau.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {settings.templates.map((template) => (
                  <article key={template.id} className="rounded-[1.5rem] border border-slate-200 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-slate-950">{template.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                            {template.category}
                          </span>
                          <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-800">
                            {pollTypeLabel(template.poll_type)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopyTemplate(template)}
                          className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                          aria-label={`Sao chép mẫu ${template.name}`}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTemplatePendingDelete(template)}
                          className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Xóa mẫu ${template.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {template.description ? (
                      <p className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                        {template.description}
                      </p>
                    ) : null}

                    <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-medium text-slate-700">Tùy chọn mặc định</div>
                      <ol className="mt-3 space-y-2 text-sm text-slate-600">
                        {template.default_options.map((option, index) => (
                          <li key={`${template.id}-${index}`} className="flex gap-3">
                            <span className="font-medium text-slate-500">{index + 1}.</span>
                            <span>{option}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="mt-4 text-sm text-slate-500">
                      Tạo lúc: {formatVietnamDateTime(template.created_at)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={templatePendingDelete !== null}
        title="Xóa mẫu khảo sát"
        message={
          templatePendingDelete
            ? `Mẫu "${templatePendingDelete.name}" sẽ bị xóa khỏi không gian khảo sát. Bạn có chắc chắn muốn tiếp tục?`
            : ''
        }
        confirmText="Xóa mẫu"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setTemplatePendingDelete(null)}
        onConfirm={async () => {
          await handleDeleteTemplate();
        }}
      />
    </div>
  );
}
