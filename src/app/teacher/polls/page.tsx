'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Plus,
  Settings2,
  Trash2,
  Users,
  Vote,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

interface PollSummary {
  id: number;
  title: string;
  description: string;
  class_name: string | null;
  status: string;
  response_count: number;
  created_at: string;
  allow_multiple: boolean | number;
}

interface TeacherClass {
  id: number;
  name: string;
}

interface PollDraft {
  title: string;
  description: string;
  classId: string;
  allowMultiple: boolean;
  options: string[];
}

type PendingPollAction = { type: 'close' | 'delete'; poll: PollSummary } | null;

const EMPTY_POLL_DRAFT: PollDraft = {
  title: '',
  description: '',
  classId: '',
  allowMultiple: false,
  options: ['', ''],
};

function getResponseList<T>(payload: any, key: string): T[] {
  const value = payload?.data?.[key] ?? payload?.[key];
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(payload: any, fallback: string) {
  return String(payload?.error || payload?.message || fallback);
}

function normalizePoll(item: any): PollSummary {
  return {
    id: Number(item?.id ?? 0),
    title: String(item?.title ?? ''),
    description: String(item?.description ?? ''),
    class_name: item?.class_name ? String(item.class_name) : null,
    status: String(item?.status ?? 'closed'),
    response_count: Number(item?.response_count ?? 0),
    created_at: String(item?.created_at ?? ''),
    allow_multiple: Boolean(item?.allow_multiple),
  };
}

function statusMeta(status: string) {
  if (status === 'active') {
      return {
      label: 'Đang mở',
      tone: 'bg-emerald-100 text-emerald-800',
    };
  }

  return {
    label: 'Đã đóng',
    tone: 'bg-slate-100 text-slate-700',
  };
}

export default function TeacherPollsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingPollAction>(null);
  const [draft, setDraft] = useState<PollDraft>(EMPTY_POLL_DRAFT);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, router, user]);

  async function fetchData() {
    try {
      setLoading(true);

      const [pollsRes, classesRes] = await Promise.all([
        fetch('/api/teacher/polls'),
        fetch('/api/teacher/classes'),
      ]);

      const pollsPayload = await pollsRes.json().catch(() => null);
      const classesPayload = await classesRes.json().catch(() => null);

      if (!pollsRes.ok) {
        throw new Error(getErrorMessage(pollsPayload, 'Không thể tải danh sách khảo sát'));
      }

      if (!classesRes.ok) {
        throw new Error(getErrorMessage(classesPayload, 'Không thể tải danh sách lớp'));
      }

      setPolls(getResponseList<any>(pollsPayload, 'polls').map(normalizePoll));
      setClasses(getResponseList<TeacherClass>(classesPayload, 'classes'));
    } catch (error) {
      console.error('Teacher polls fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải danh sách khảo sát');
    } finally {
      setLoading(false);
    }
  }

  function updateOption(index: number, value: string) {
    setDraft((current) => {
      const nextOptions = [...current.options];
      nextOptions[index] = value;
      return { ...current, options: nextOptions };
    });
  }

  function addOption() {
    setDraft((current) => ({ ...current, options: [...current.options, ''] }));
  }

  function removeOption(index: number) {
    setDraft((current) => {
      if (current.options.length <= 2) return current;
      return {
        ...current,
        options: current.options.filter((_, optionIndex) => optionIndex !== index),
      };
    });
  }

  function resetDraft() {
    setDraft(EMPTY_POLL_DRAFT);
  }

  async function handleCreatePoll() {
    const cleanTitle = draft.title.trim();
    const cleanDescription = draft.description.trim();
    const cleanOptions = draft.options.map((option) => option.trim()).filter(Boolean);

    if (!cleanTitle || cleanOptions.length < 2) {
      toast.error('Cần có tiêu đề và ít nhất 2 lựa chọn');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/teacher/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cleanTitle,
          description: cleanDescription,
          class_id: draft.classId || null,
          allow_multiple: draft.allowMultiple,
          options: cleanOptions,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Không thể tạo khảo sát'));
      }

      toast.success('Đã tạo khảo sát mới');
      resetDraft();
      setShowCreateForm(false);
      await fetchData();
    } catch (error) {
      console.error('Teacher poll create error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tạo khảo sát');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;

    try {
      const response = await fetch(
        pendingAction.type === 'close'
          ? `/api/teacher/polls/${pendingAction.poll.id}?action=close`
          : `/api/teacher/polls/${pendingAction.poll.id}`,
        { method: 'DELETE' }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            payload,
            pendingAction.type === 'close' ? 'Không thể đóng khảo sát' : 'Không thể xóa khảo sát'
          )
        );
      }

      toast.success(pendingAction.type === 'close' ? 'Đã đóng khảo sát' : 'Đã xóa khảo sát');
      setPendingAction(null);
      await fetchData();
    } catch (error) {
      console.error('Teacher poll action error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : pendingAction.type === 'close'
            ? 'Không thể đóng khảo sát'
            : 'Không thể xóa khảo sát'
      );
    }
  }

  const activePolls = polls.filter((poll) => poll.status === 'active').length;
  const closedPolls = polls.length - activePolls;
  const totalResponses = polls.reduce((sum, poll) => sum + Number(poll.response_count || 0), 0);

  if (authLoading || loading) {
    return <LoadingSpinner message="Đang tải không gian khảo sát..." />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <Vote className="h-3.5 w-3.5" />
                Thu thập phản hồi
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Khảo sát lớp học</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Tạo khảo sát nhanh cho học viên, theo dõi số lượt phản hồi và điều hướng sang màn chi
                tiết khi cần xem kết quả từng câu hỏi.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/teacher/polls/responses"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <BarChart3 className="h-4 w-4" />
                Báo cáo phản hồi
              </Link>
              <Link
                href="/teacher/polls/settings"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Settings2 className="h-4 w-4" />
                Cài đặt khảo sát
              </Link>
              <button
                type="button"
                onClick={() => setShowCreateForm((current) => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-800"
              >
                <Plus className="h-4 w-4" />
                {showCreateForm ? 'Đóng biểu mẫu tạo' : 'Tạo khảo sát mới'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Tổng khảo sát</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{polls.length}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Đang mở</div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">{activePolls}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Đã đóng</div>
              <div className="mt-2 text-3xl font-bold text-slate-700">{closedPolls}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Tổng phản hồi</div>
              <div className="mt-2 text-3xl font-bold text-cyan-700">{totalResponses}</div>
            </div>
          </div>

          {showCreateForm ? (
            <div className="content-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Khảo sát mới
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-950">Tạo khảo sát mới</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Chỉ thu thập các trường backend đang xử lý ổn định: tiêu đề, mô tả, lớp, chế độ
                    chọn nhiều và danh sách lựa chọn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                  aria-label="Đóng biểu mẫu tạo khảo sát"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 lg:col-span-2">
                  Tiêu đề khảo sát
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Ví dụ: Chọn khung giờ họp lớp"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700 lg:col-span-2">
                  Mô tả
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={4}
                    placeholder="Nếu cần, ghi rõ bối cảnh để học viên phản hồi đúng mức."
                    className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 leading-6 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Lớp áp dụng
                  <select
                    value={draft.classId}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, classId: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Tất cả lớp giảng viên được thao tác</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-start gap-3 rounded-3xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.allowMultiple}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, allowMultiple: event.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">Cho phép chọn nhiều đáp án</span>
                    <span className="mt-1 block text-slate-500">
                      Bật chế độ này khi muốn thu thập nhiều lựa chọn trên cùng một phiếu.
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-6">
                <div className="text-sm font-medium text-slate-700">Lựa chọn trả lời</div>
                <div className="mt-3 space-y-3">
                  {draft.options.map((option, index) => (
                    <div key={`${index}-${draft.options.length}`} className="flex gap-3">
                      <input
                        type="text"
                        value={option}
                        onChange={(event) => updateOption(index, event.target.value)}
                        placeholder={`Lựa chọn ${index + 1}`}
                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                      />
                      {draft.options.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="rounded-2xl border border-slate-200 px-3 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Xóa lựa chọn ${index + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  <Plus className="h-4 w-4" />
                  Thêm lựa chọn
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    resetDraft();
                    setShowCreateForm(false);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreatePoll()}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? 'Đang tạo...' : 'Tạo khảo sát'}
                </button>
              </div>
            </div>
          ) : null}

          {polls.length === 0 ? (
            <div className="content-card p-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-14 w-14 text-slate-300" />
              <p className="text-lg font-medium text-slate-700">Chưa có khảo sát nào</p>
              <p className="mt-2 text-sm text-slate-500">
                Tạo khảo sát đầu tiên để thu thập ý kiến học viên hoặc chọn phương án tổ chức.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {polls.map((poll) => {
                const status = statusMeta(poll.status);

                return (
                  <article key={poll.id} className="content-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-slate-950">{poll.title}</h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${status.tone}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span>{poll.class_name || 'Tất cả lớp giảng viên được phép'}</span>
                          <span>{poll.allow_multiple ? 'Chọn nhiều đáp án' : 'Một đáp án'}</span>
                          <span>{formatVietnamDateTime(poll.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {poll.description ? (
                      <p className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                        {poll.description}
                      </p>
                    ) : null}

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <div className="text-slate-500">Phản hồi</div>
                        <div className="mt-1 font-semibold text-slate-900">{poll.response_count}</div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <div className="text-slate-500">Loại</div>
                        <div className="mt-1 font-semibold text-slate-900">
                          {poll.allow_multiple ? 'Nhiều lựa chọn' : 'Một lựa chọn'}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-3">
                        <div className="text-slate-500">Trạng thái</div>
                        <div className="mt-1 font-semibold text-slate-900">{status.label}</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        href={`/teacher/polls/${poll.id}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
                      >
                        <BarChart3 className="h-4 w-4" />
                        Mở chi tiết
                      </Link>
                      {poll.status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => setPendingAction({ type: 'close', poll })}
                          className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
                        >
                          <Users className="h-4 w-4" />
                          Đóng khảo sát
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPendingAction({ type: 'delete', poll })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={pendingAction?.type === 'close' ? 'Đóng khảo sát' : 'Xóa khảo sát'}
        message={
          pendingAction
            ? pendingAction.type === 'close'
              ? `Khảo sát "${pendingAction.poll.title}" sẽ dừng nhận phản hồi mới. Bạn có chắc chắn muốn đóng?`
              : `Khảo sát "${pendingAction.poll.title}" sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?`
            : ''
        }
        confirmText={pendingAction?.type === 'close' ? 'Đóng khảo sát' : 'Xóa khảo sát'}
        cancelText="Hủy"
        variant={pendingAction?.type === 'close' ? 'warning' : 'danger'}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          await handleConfirmAction();
        }}
      />
    </div>
  );
}
