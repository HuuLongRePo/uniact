'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Medal,
  Search,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatVietnamDateTime, parseVietnamDate } from '@/lib/timezone';

type AwardSuggestion = {
  id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  class_name?: string;
  award_type_id: number;
  award_type_name?: string;
  award_min_points?: number;
  score_snapshot?: number;
  suggested_at?: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string | null;
};

type SuggestionStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type SuggestionSort = 'latest' | 'points' | 'student';

function parseSuggestionsPayload(payload: any): AwardSuggestion[] {
  const source = payload?.suggestions || payload?.data?.suggestions || [];
  return Array.isArray(source) ? source : [];
}

function getStatusMeta(status: AwardSuggestion['status']) {
  if (status === 'approved') {
    return {
      label: 'Da duyet',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (status === 'rejected') {
    return {
      label: 'Tu choi',
      badgeClass: 'bg-rose-100 text-rose-700',
    };
  }

  return {
    label: 'Cho duyet',
    badgeClass: 'bg-amber-100 text-amber-700',
  };
}

function formatPointsLabel(value?: number | null) {
  return Number.isFinite(value) ? String(value) : '0';
}

export default function AdminAwardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<AwardSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SuggestionStatusFilter>('pending');
  const [sortBy, setSortBy] = useState<SuggestionSort>('latest');
  const [selectedSuggestion, setSelectedSuggestion] = useState<AwardSuggestion | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchSuggestions(statusFilter === 'all' ? '' : statusFilter);
    }
  }, [authLoading, router, statusFilter, user]);

  async function fetchSuggestions(status: '' | Exclude<SuggestionStatusFilter, 'all'>) {
    try {
      setLoading(true);
      setError('');
      const query = status ? `?status=${status}` : '';
      const response = await fetch(`/api/admin/awards${query}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai de xuat khen thuong');
      }

      setSuggestions(parseSuggestionsPayload(payload));
    } catch (fetchError) {
      console.error('Fetch admin award suggestions error:', fetchError);
      setSuggestions([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Khong the tai de xuat khen thuong'
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const nextItems = suggestions.filter((suggestion) => {
      if (!query) return true;

      return [suggestion.student_name, suggestion.student_email, suggestion.class_name, suggestion.award_type_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });

    nextItems.sort((left, right) => {
      if (sortBy === 'points') {
        return (right.score_snapshot || 0) - (left.score_snapshot || 0);
      }

      if (sortBy === 'student') {
        return String(left.student_name || '').localeCompare(String(right.student_name || ''));
      }

      return (
        (parseVietnamDate(right.suggested_at || '')?.getTime() ?? 0) -
        (parseVietnamDate(left.suggested_at || '')?.getTime() ?? 0)
      );
    });

    return nextItems;
  }, [searchQuery, sortBy, suggestions]);

  const stats = useMemo(
    () => ({
      pending: suggestions.filter((item) => item.status === 'pending').length,
      approved: suggestions.filter((item) => item.status === 'approved').length,
      rejected: suggestions.filter((item) => item.status === 'rejected').length,
    }),
    [suggestions]
  );

  async function handleGenerateSuggestions() {
    try {
      setGenerating(true);
      const response = await fetch('/api/admin/awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tao de xuat khen thuong');
      }

      toast.success(payload?.message || `Da tao ${payload?.data?.count || 0} de xuat khen thuong`);
      await fetchSuggestions(statusFilter === 'all' ? '' : statusFilter);
    } catch (generateError) {
      console.error('Generate award suggestions error:', generateError);
      toast.error(
        generateError instanceof Error
          ? generateError.message
          : 'Khong the tao de xuat khen thuong'
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleDecision(suggestion: AwardSuggestion, action: 'approve' | 'reject') {
    try {
      setProcessingId(suggestion.id);
      const response = await fetch('/api/admin/awards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion_id: suggestion.id,
          action,
          note: decisionNote || null,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the cap nhat de xuat');
      }

      toast.success(
        action === 'approve'
          ? 'Da phe duyet de xuat khen thuong'
          : 'Da tu choi de xuat khen thuong'
      );
      setSelectedSuggestion(null);
      setDecisionNote('');
      await fetchSuggestions(statusFilter === 'all' ? '' : statusFilter);
    } catch (decisionError) {
      console.error('Process award suggestion error:', decisionError);
      toast.error(
        decisionError instanceof Error
          ? decisionError.message
          : 'Khong the cap nhat de xuat khen thuong'
      );
    } finally {
      setProcessingId(null);
    }
  }

  if (authLoading || (loading && suggestions.length === 0 && !error)) {
    return <LoadingSpinner message="Dang tai de xuat khen thuong..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Awards review
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="admin-awards-heading"
              >
                Duyet de xuat khen thuong
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Tao de xuat tu dong, doi soat nguong diem va phe duyet danh hieu cho hoc vien.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerateSuggestions()}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Tao de xuat tu dong
            </button>
          </div>
        </section>

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Co loi khi tai de xuat</div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] bg-amber-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Cho duyet</div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.pending}</div>
          </div>
          <div className="rounded-[1.5rem] bg-emerald-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Da duyet</div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.approved}</div>
          </div>
          <div className="rounded-[1.5rem] bg-rose-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Tu choi</div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{stats.rejected}</div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Tim kiem</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Hoc vien, email, lop, danh hieu..."
                  className="w-full rounded-2xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-900"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Trang thai</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as SuggestionStatusFilter)
                }
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              >
                <option value="all">Tat ca</option>
                <option value="pending">Cho duyet</option>
                <option value="approved">Da duyet</option>
                <option value="rejected">Tu choi</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Sap xep</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SuggestionSort)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              >
                <option value="latest">Moi nhat</option>
                <option value="points">Diem cao</option>
                <option value="student">Ten hoc vien</option>
              </select>
            </label>
          </div>
        </section>

        {loading ? (
          <section className="page-surface rounded-[1.75rem] px-5 py-10 text-center sm:px-7">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Dang tai de xuat...
            </div>
          </section>
        ) : filteredSuggestions.length === 0 ? (
          <section className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
              <Medal className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Chua co de xuat nao</h2>
            <p className="mt-2 text-sm text-slate-600">
              Thu doi bo loc hoac tao de xuat tu dong de bat dau vong duyet.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 xl:hidden">
              {filteredSuggestions.map((suggestion) => {
                const statusMeta = getStatusMeta(suggestion.status);
                return (
                  <article
                    key={suggestion.id}
                    className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {suggestion.student_name || 'N/A'}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {suggestion.student_email || 'Khong co email'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {suggestion.award_type_name || `Danh hieu #${suggestion.award_type_id}`}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-semibold text-amber-700">
                          {formatPointsLabel(suggestion.score_snapshot)}
                        </div>
                        <div className="text-xs text-slate-500">diem hien tai</div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      {suggestion.class_name || 'Chua co lop'} | {formatVietnamDateTime(suggestion.suggested_at || '')}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSuggestion(suggestion);
                        setDecisionNote(suggestion.note || '');
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                    >
                      <Trophy className="h-4 w-4" />
                      Xem chi tiet
                    </button>
                  </article>
                );
              })}
            </section>

            <section className="page-surface hidden overflow-x-auto rounded-[1.75rem] border xl:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hoc vien
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Danh hieu
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Diem
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lop
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Trang thai
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Chi tiet
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredSuggestions.map((suggestion) => {
                    const statusMeta = getStatusMeta(suggestion.status);
                    return (
                      <tr key={suggestion.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold text-slate-900">
                            {suggestion.student_name || 'N/A'}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {suggestion.student_email || 'Khong co email'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {suggestion.award_type_name || `Danh hieu #${suggestion.award_type_id}`}
                        </td>
                        <td className="px-5 py-4 text-right text-sm font-semibold text-amber-700">
                          {formatPointsLabel(suggestion.score_snapshot)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {suggestion.class_name || 'Chua co lop'}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSuggestion(suggestion);
                              setDecisionNote(suggestion.note || '');
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                          >
                            <Trophy className="h-4 w-4" />
                            Xem
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>

      {selectedSuggestion ? (
        <div
          className="app-modal-backdrop p-4"
          onClick={() => setSelectedSuggestion(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-award-suggestion-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-2xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Award suggestion
                </div>
                <h3 id="admin-award-suggestion-title" className="mt-2 text-2xl font-bold text-slate-900">
                  {selectedSuggestion.student_name || 'N/A'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedSuggestion.student_email || 'Khong co email'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSuggestion(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Dong
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Danh hieu de xuat
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedSuggestion.award_type_name ||
                    `Danh hieu #${selectedSuggestion.award_type_id}`}
                </div>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Diem va nguong
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {formatPointsLabel(selectedSuggestion.score_snapshot)} / toi thieu{' '}
                  {formatPointsLabel(selectedSuggestion.award_min_points)}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Thong tin ho tro</div>
              <div className="mt-2">Lop: {selectedSuggestion.class_name || 'Chua co lop'}</div>
              <div className="mt-2">
                De xuat luc {formatVietnamDateTime(selectedSuggestion.suggested_at || '')}
              </div>
              {selectedSuggestion.note ? (
                <div className="mt-2 rounded-2xl bg-white px-3 py-3 text-sm text-slate-600">
                  Ghi chu hien tai: {selectedSuggestion.note}
                </div>
              ) : null}
            </div>

            {selectedSuggestion.status === 'pending' ? (
              <div className="mt-6 space-y-4 border-t border-slate-200 pt-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Ghi chu admin
                  </span>
                  <textarea
                    rows={3}
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Nhap ly do neu can..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={processingId === selectedSuggestion.id}
                    onClick={() => void handleDecision(selectedSuggestion, 'approve')}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {processingId === selectedSuggestion.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Phe duyet
                  </button>
                  <button
                    type="button"
                    disabled={processingId === selectedSuggestion.id}
                    onClick={() => void handleDecision(selectedSuggestion, 'reject')}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {processingId === selectedSuggestion.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Tu choi
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                De xuat nay da duoc xu ly. Neu can thay doi, hay kiem tra log phan thuong va thuc hien
                dieu chinh o luong admin lien quan.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
