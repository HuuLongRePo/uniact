'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Download,
  Filter,
  Search,
  Vote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { formatVietnamDateTime, parseVietnamDate, toVietnamDateStamp } from '@/lib/timezone';

interface PollSummary {
  id: number;
  title: string;
  status: string;
}

interface PollResponse {
  id: number;
  poll_id: number;
  poll_title: string;
  student_id: number;
  student_name: string;
  class_name: string;
  selected_option: string;
  response_text: string;
  responded_at: string;
}

interface PollOption {
  id: number;
  poll_id: number;
  option_text: string;
  response_count: number;
  percentage: number;
}

type SortKey = 'responded_at' | 'student_name' | 'selected_option';
type SortDirection = 'asc' | 'desc';

function getResponseList<T>(payload: any, key: string): T[] {
  const value = payload?.data?.[key] ?? payload?.[key];
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(payload: any, fallback: string) {
  return String(payload?.error || payload?.message || fallback);
}

function normalizePolls(payload: any): PollSummary[] {
  return getResponseList<any>(payload, 'polls').map((item) => ({
    id: Number(item?.id ?? 0),
    title: String(item?.title ?? ''),
    status: String(item?.status ?? ''),
  }));
}

export default function PollResponsesPage() {
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<number | null>(null);
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    classId: '',
    dateStart: '',
    dateEnd: '',
  });
  const [sortBy, setSortBy] = useState<SortKey>('responded_at');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');

  useEffect(() => {
    void fetchPolls();
  }, []);

  useEffect(() => {
    if (selectedPoll) {
      void fetchResponses(selectedPoll);
    } else {
      setResponses([]);
      setOptions([]);
    }
  }, [selectedPoll]);

  async function fetchPolls() {
    try {
      setLoadingPolls(true);
      const response = await fetch('/api/teacher/polls');
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Không thể tải danh sách khảo sát'));
      }

      const nextPolls = normalizePolls(payload);
      setPolls(nextPolls);

      const preferred =
        nextPolls.find((item) => item.status === 'active') ??
        nextPolls.find((item) => item.status === 'closed') ??
        nextPolls[0] ??
        null;

      setSelectedPoll(preferred ? preferred.id : null);
    } catch (error) {
      console.error('Teacher poll responses list error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải danh sách khảo sát');
    } finally {
      setLoadingPolls(false);
    }
  }

  async function fetchResponses(pollId: number) {
    try {
      setLoadingResponses(true);
      const response = await fetch(`/api/teacher/polls/${pollId}/responses`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Không thể tải phản hồi bình chọn'));
      }

      setResponses(getResponseList<PollResponse>(payload, 'responses'));
      setOptions(getResponseList<PollOption>(payload, 'options'));
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải phản hồi bình chọn');
      setResponses([]);
      setOptions([]);
    } finally {
      setLoadingResponses(false);
    }
  }

  async function handleExport() {
    if (!selectedPoll) return;

    try {
      const response = await fetch(`/api/teacher/polls/${selectedPoll}/responses/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error('Không thể xuất phản hồi');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        `poll-responses-${toVietnamDateStamp(new Date())}.csv`
      );
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất phản hồi thành công');
    } catch (error) {
      console.error('Poll responses export error:', error);
      toast.error('Không thể xuất phản hồi');
    }
  }

  const filteredResponses = useMemo(() => {
    const next = responses.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.selected_option.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.class_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClass = !filters.classId || item.class_name === filters.classId;

      let matchesDate = true;
      if (filters.dateStart) {
        const start = parseVietnamDate(`${filters.dateStart}T00:00`);
        if (start) {
          matchesDate =
            matchesDate &&
            (parseVietnamDate(item.responded_at)?.getTime() ?? Number.NEGATIVE_INFINITY) >=
              start.getTime();
        }
      }

      if (filters.dateEnd) {
        const end = parseVietnamDate(`${filters.dateEnd}T23:59:59`);
        if (end) {
          matchesDate =
            matchesDate &&
            (parseVietnamDate(item.responded_at)?.getTime() ?? Number.POSITIVE_INFINITY) <=
              end.getTime();
        }
      }

      return matchesSearch && matchesClass && matchesDate;
    });

    next.sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortBy === 'student_name') {
        leftValue = left.student_name.toLowerCase();
        rightValue = right.student_name.toLowerCase();
      } else if (sortBy === 'selected_option') {
        leftValue = left.selected_option.toLowerCase();
        rightValue = right.selected_option.toLowerCase();
      } else {
        leftValue = parseVietnamDate(left.responded_at)?.getTime() ?? 0;
        rightValue = parseVietnamDate(right.responded_at)?.getTime() ?? 0;
      }

      if (leftValue < rightValue) return sortOrder === 'asc' ? -1 : 1;
      if (leftValue > rightValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return next;
  }, [filters, responses, searchTerm, sortBy, sortOrder]);

  const classOptions = useMemo(() => {
    return Array.from(new Set(responses.map((item) => item.class_name)))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  }, [responses]);

  const stats = {
    totalResponses: responses.length,
    totalOptions: options.length,
    averagePerOption: options.length > 0 ? Math.round(responses.length / options.length) : 0,
  };

  if (loadingPolls) {
    return <LoadingSpinner message="Đang tải thống kê phản hồi khảo sát..." />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <Vote className="h-3.5 w-3.5" />
                Phân tích khảo sát
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                Phân tích phản hồi bình chọn
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Xem nhanh kết quả từng lựa chọn, lọc theo lớp và xuất CSV để đối soát lại khi cần.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={!selectedPoll}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="content-card p-5 sm:p-6">
            <label className="block text-sm font-medium text-slate-700">
              Chọn khảo sát cần xem phản hồi
              <select
                value={selectedPoll ?? ''}
                onChange={(event) => setSelectedPoll(event.target.value ? Number(event.target.value) : null)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500 lg:max-w-xl"
              >
                <option value="">Chọn khảo sát</option>
                {polls.map((poll) => (
                  <option key={poll.id} value={poll.id}>
                    {poll.title}
                    {poll.status ? ` - ${poll.status}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!selectedPoll ? (
            <div className="content-card p-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-14 w-14 text-slate-300" />
              <p className="text-lg font-medium text-slate-700">Chưa chọn khảo sát nào</p>
              <p className="mt-2 text-sm text-slate-500">
                Chọn một khảo sát ở trên để xem thống kê phản hồi và chi tiết từng học viên.
              </p>
            </div>
          ) : loadingResponses ? (
            <LoadingSpinner message="Đang tải phản hồi khảo sát..." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="content-card p-4">
                  <div className="text-sm text-slate-500">Tổng phản hồi</div>
                  <div className="mt-2 text-3xl font-bold text-cyan-700">{stats.totalResponses}</div>
                </div>
                <div className="content-card p-4">
                  <div className="text-sm text-slate-500">Số tùy chọn</div>
                  <div className="mt-2 text-3xl font-bold text-emerald-600">{stats.totalOptions}</div>
                </div>
                <div className="content-card p-4">
                  <div className="text-sm text-slate-500">Trung bình mỗi tùy chọn</div>
                  <div className="mt-2 text-3xl font-bold text-violet-600">{stats.averagePerOption}</div>
                </div>
              </div>

              {options.length > 0 ? (
                <div className="content-card p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">Kết quả tùy chọn</h2>
                      <p className="text-sm text-slate-500">
                        Tổng hợp tỷ lệ từng đáp án theo dữ liệu đã ghi nhận.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {options.map((option) => (
                      <div key={option.id}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                          <span className="font-medium text-slate-800">{option.option_text}</span>
                          <span className="text-slate-500">
                            {option.response_count} phản hồi · {option.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-200">
                          <div
                            className="h-2.5 rounded-full bg-cyan-600"
                            style={{ width: `${option.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="content-card p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-950">Bộ lọc chi tiết</h2>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block text-sm font-medium text-slate-700">
                    <Search className="mr-1 inline h-4 w-4" />
                    Tìm học viên
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Ten, lop hoac lua chon..."
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Lớp học
                    <select
                      value={filters.classId}
                      onChange={(event) => setFilters((current) => ({ ...current, classId: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">Tất cả lớp</option>
                      {classOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Từ ngày
                    <input
                      type="date"
                      value={filters.dateStart}
                      onChange={(event) => setFilters((current) => ({ ...current, dateStart: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Đến ngày
                    <input
                      type="date"
                      value={filters.dateEnd}
                      onChange={(event) => setFilters((current) => ({ ...current, dateEnd: event.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                    />
                  </label>
                </div>
              </div>

              {filteredResponses.length === 0 ? (
                <div className="content-card p-12 text-center">
                  <AlertCircle className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                  <p className="text-lg font-medium text-slate-700">Không có phản hồi phù hợp bộ lọc</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 xl:hidden">
                    {filteredResponses.map((response) => (
                      <article key={response.id} className="content-card p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-semibold text-slate-950">
                              {response.student_name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{response.class_name}</p>
                          </div>
                          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
                            {response.selected_option}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-slate-600">
                          <div>Thời gian: {formatVietnamDateTime(response.responded_at)}</div>
                          <div>Ghi chú: {response.response_text || '-'}</div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="content-card hidden overflow-hidden xl:block">
                    <div className="overflow-x-auto">
                      <table className="min-w-[960px]">
                        <thead className="border-b border-slate-200 bg-slate-50">
                          <tr>
                            <th
                              className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                              onClick={() => {
                                setSortBy('student_name');
                                setSortOrder((current) =>
                                  sortBy === 'student_name' && current === 'asc' ? 'desc' : 'asc'
                                );
                              }}
                            >
                              Học viên {sortBy === 'student_name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Lớp</th>
                            <th
                              className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                              onClick={() => {
                                setSortBy('selected_option');
                                setSortOrder((current) =>
                                  sortBy === 'selected_option' && current === 'asc' ? 'desc' : 'asc'
                                );
                              }}
                            >
                              Lựa chọn {sortBy === 'selected_option' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th
                              className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-slate-900"
                              onClick={() => {
                                setSortBy('responded_at');
                                setSortOrder((current) =>
                                  sortBy === 'responded_at' && current === 'asc' ? 'desc' : 'asc'
                                );
                              }}
                            >
                              Thời gian {sortBy === 'responded_at' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredResponses.map((response) => (
                            <tr key={response.id} className="transition-colors hover:bg-slate-50">
                              <td className="px-4 py-4 text-sm font-medium text-slate-900">
                                {response.student_name}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">{response.class_name}</td>
                              <td className="px-4 py-4">
                                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-800">
                                  {response.selected_option}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {formatVietnamDateTime(response.responded_at)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">
                                {response.response_text || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
