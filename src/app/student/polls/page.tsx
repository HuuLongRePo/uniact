'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { BarChart3, CheckCircle2, MessageSquareQuote, Users } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

interface Poll {
  id: number;
  title: string;
  description: string;
  class_name: string;
  status: string;
  response_count: number;
  has_voted: number;
  allow_multiple: boolean;
  created_at: string;
}

interface PollDetail {
  poll: {
    id: number;
    title: string;
    description: string;
    allow_multiple: boolean;
    status: string;
  };
  options: Array<{
    id: number;
    option_text: string;
    vote_count: number;
    percentage: string;
  }>;
  total_votes: number;
  user_votes: number[];
  has_voted: boolean;
}

export default function StudentPollsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<PollDetail | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchPolls();
    }
  }, [authLoading, router, user]);

  async function fetchPolls() {
    try {
      setLoading(true);
      const response = await fetch('/api/polls');
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải danh sách khảo sát');
      }

      setPolls(payload?.polls || payload?.data?.polls || []);
    } catch (error) {
      console.error('Fetch polls error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải danh sách khảo sát');
      setPolls([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleViewPoll(pollId: number) {
    try {
      const response = await fetch(`/api/polls/${pollId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải chi tiết khảo sát');
      }

      const detail = (payload?.data || payload) as PollDetail;
      setSelectedPoll(detail);
      setSelectedOptions(detail?.user_votes || []);
    } catch (error) {
      console.error('Fetch poll detail error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải chi tiết khảo sát');
    }
  }

  function handleToggleOption(optionId: number) {
    if (selectedPoll?.poll.allow_multiple) {
      setSelectedOptions((current) =>
        current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
      );
      return;
    }

    setSelectedOptions([optionId]);
  }

  async function handleSubmitVote() {
    if (!selectedPoll || selectedOptions.length === 0) {
      toast.error('Vui lòng chọn ít nhất một lựa chọn');
      return;
    }

    try {
      const response = await fetch(`/api/polls/${selectedPoll.poll.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_ids: selectedOptions }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Gửi phản hồi thất bại');
      }

      toast.success('Đã ghi nhận phản hồi của bạn');
      setSelectedPoll(null);
      setSelectedOptions([]);
      await fetchPolls();
    } catch (error) {
      console.error('Submit poll vote error:', error);
      toast.error(error instanceof Error ? error.message : 'Gửi phản hồi thất bại');
    }
  }

  const answeredCount = useMemo(() => polls.filter((poll) => poll.has_voted > 0).length, [polls]);

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
                Tương tác và phản hồi
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">Khảo sát và bình chọn</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Theo dõi các khảo sát đang mở, gửi phản hồi và xem kết quả ngay trên giao diện học viên.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[20rem]">
              <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-500/40 dark:bg-cyan-500/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-200">
                  Tổng khảo sát
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{polls.length}</div>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                  Đã phản hồi
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{answeredCount}</div>
              </div>
            </div>
          </div>
        </section>

        <StudentDailyQuickActions />

        {selectedPoll ? (
          <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
            <button
              type="button"
              onClick={() => {
                setSelectedPoll(null);
                setSelectedOptions([]);
              }}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Quay lại danh sách
            </button>

            <div className="mt-5">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{selectedPoll.poll.title}</h2>
              {selectedPoll.poll.description ? (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{selectedPoll.poll.description}</p>
              ) : null}
            </div>

            {selectedPoll.has_voted ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Bạn đã tham gia khảo sát này. Các mục được đánh dấu màu xanh là lựa chọn của bạn.
                </div>

                {selectedPoll.options.map((option) => {
                  const selected = selectedPoll.user_votes.includes(option.id);
                  return (
                    <article
                      key={option.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {selected ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <BarChart3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            )}
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{option.option_text}</h3>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{option.vote_count}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{option.percentage}%</div>
                        </div>
                      </div>

                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full ${selected ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${option.percentage}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {selectedPoll.poll.allow_multiple ? (
                  <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                    Khảo sát này cho phép chọn nhiều đáp án.
                  </div>
                ) : null}

                <div className="space-y-3">
                  {selectedPoll.options.map((option) => {
                    const checked = selectedOptions.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-[1.5rem] border px-4 py-4 transition ${
                          checked
                            ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type={selectedPoll.poll.allow_multiple ? 'checkbox' : 'radio'}
                          checked={checked}
                          onChange={() => handleToggleOption(option.id)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{option.option_text}</span>
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => void handleSubmitVote()}
                  disabled={selectedOptions.length === 0}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:dark:bg-slate-700"
                >
                  Gửi phản hồi
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {polls.length === 0 ? (
              <div className="page-surface col-span-full rounded-[1.75rem] px-5 py-12 text-center sm:px-7">
                <MessageSquareQuote className="mx-auto h-14 w-14 text-cyan-400" />
                <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">Chưa có khảo sát nào</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Giảng viên sẽ tạo khảo sát để lấy ý kiến học viên khi cần.
                </p>
              </div>
            ) : (
              polls.map((poll) => (
                <article
                  key={poll.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-cyan-500/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{poll.title}</h2>
                      {poll.description ? (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{poll.description}</p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        poll.has_voted > 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
                      }`}
                    >
                      {poll.has_voted > 0 ? 'Đã bình chọn' : 'Chưa bình chọn'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span>Lớp: {poll.class_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span>Phản hồi: {poll.response_count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquareQuote className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span>{formatVietnamDateTime(poll.created_at, 'date')}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleViewPoll(poll.id)}
                    className="mt-5 w-full rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
                  >
                    {poll.has_voted > 0 ? 'Xem kết quả' : 'Tham gia khảo sát'}
                  </button>
                </article>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}
