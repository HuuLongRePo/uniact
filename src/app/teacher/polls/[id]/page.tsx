'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, PieChart, Vote } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime, toVietnamDateStamp } from '@/lib/timezone';

interface PollDetail {
  poll: {
    id: number;
    title: string;
    description: string;
    class_name: string;
    creator_name: string;
    status: string;
    allow_multiple: boolean;
    created_at: string;
  };
  options: Array<{
    id: number;
    option_text: string;
    vote_count: number;
    percentage: string;
  }>;
  total_votes: number;
  has_voted: boolean;
}

const CHART_COLORS = ['#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PollDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PollDetail | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && params?.id) {
      void fetchPollDetail(params.id);
    }
  }, [authLoading, params?.id, router, user]);

  async function fetchPollDetail(pollId: string) {
    try {
      setLoading(true);
      const response = await fetch(`/api/polls/${pollId}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Không thể tải chi tiết khảo sát');
      }

      setData((payload?.data || payload) as PollDetail);
    } catch (error) {
      console.error('Fetch poll detail error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải chi tiết khảo sát');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!data) return;

    const headers = ['Lựa chọn', 'Số phiếu', 'Tỷ lệ'];
    const rows = data.options.map((option) => [
      `"${option.option_text}"`,
      String(option.vote_count),
      `${option.percentage}%`,
    ]);

    const csv = [
      `"Tiêu đề khảo sát","${data.poll.title}"`,
      `"Mô tả","${data.poll.description || ''}"`,
      `"Lớp","${data.poll.class_name || 'Tất cả lớp'}"`,
      `"Tổng số phiếu","${data.total_votes}"`,
      `"Ngày tạo","${formatVietnamDateTime(data.poll.created_at)}"`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `ket-qua-khao-sat-${data.poll.id}-${toVietnamDateStamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất kết quả khảo sát');
  }

  const normalizedOptions = useMemo(() => {
    if (!data) return [];
    return data.options.map((option) => ({
      ...option,
      vote_count: toNumber(option.vote_count),
      percentage: toNumber(option.percentage),
    }));
  }, [data]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return (
      <div className="page-shell">
        <section className="page-surface rounded-[1.75rem] px-5 py-8 text-center sm:px-7">
          Không có dữ liệu khảo sát.
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200">
                <Vote className="h-3.5 w-3.5" />
                Chi tiết khảo sát
              </div>
              <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                {data.poll.title}
              </h1>
              {data.poll.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{data.poll.description}</p>
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-900"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-slate-900"
              >
                <Download className="h-4 w-4" />
                Xuất CSV
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Lớp áp dụng</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{data.poll.class_name || 'Tất cả lớp'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tạo bởi</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{data.poll.creator_name}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Ngày tạo</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{formatVietnamDateTime(data.poll.created_at)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Trạng thái</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {data.poll.status === 'active' ? 'Đang mở' : 'Đã đóng'}
              </div>
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 dark:border-cyan-500/40 dark:bg-cyan-500/10">
              <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-200">Tổng số phản hồi</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{data.total_votes}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Số lựa chọn</div>
              <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{normalizedOptions.length}</div>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 dark:border-violet-500/40 dark:bg-violet-500/10">
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-200">Cách bình chọn</div>
              <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {data.poll.allow_multiple ? 'Cho phép chọn nhiều đáp án' : 'Mỗi học viên chọn một đáp án'}
              </div>
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kết quả chi tiết</h2>
          <div className="mt-4 space-y-4">
            {normalizedOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                Chưa có lựa chọn nào.
              </div>
            ) : (
              normalizedOptions.map((option, index) => (
                <article key={option.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {index + 1}. {option.option_text}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-700 dark:text-cyan-300">{option.vote_count} phiếu</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{option.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${Math.min(100, Math.max(0, option.percentage))}%` }}
                    />
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <h2 className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            <PieChart className="h-5 w-5 text-violet-500" />
            Biểu đồ tròn
          </h2>
          <div className="mt-5 flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
            <div className="relative h-64 w-64 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800">
              {normalizedOptions.map((option, index) => {
                const previousPercentage = normalizedOptions
                  .slice(0, index)
                  .reduce((sum, item) => sum + item.percentage, 0);
                const color = CHART_COLORS[index % CHART_COLORS.length];

                return (
                  <div
                    key={option.id}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(transparent 0deg ${previousPercentage * 3.6}deg, ${color} ${previousPercentage * 3.6}deg ${(previousPercentage + option.percentage) * 3.6}deg, transparent ${(previousPercentage + option.percentage) * 3.6}deg)`,
                    }}
                  />
                );
              })}
              <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-900">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{data.total_votes}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">phiếu</div>
                </div>
              </div>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
              {normalizedOptions.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/80">
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="truncate text-slate-700 dark:text-slate-200">{option.option_text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
