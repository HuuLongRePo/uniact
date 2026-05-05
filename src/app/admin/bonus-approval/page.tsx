'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { formatVietnamDateTime, parseVietnamDate, toVietnamDateStamp } from '@/lib/timezone';

interface BonusProposal {
  id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  points: number;
  source_type: string;
  source_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  author_id: number;
  author_name?: string;
  approver_id?: number;
  evidence_url?: string;
  created_at: string;
  updated_at: string;
}

type ProposalStatus = 'all' | 'pending' | 'approved' | 'rejected';
type SortBy = 'created' | 'points' | 'student';

function parseProposalsPayload(payload: any): BonusProposal[] {
  const source = payload?.suggestions || payload?.data?.suggestions || [];
  return Array.isArray(source) ? source : [];
}

function getStatusMeta(status: BonusProposal['status']) {
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

function getSourceLabel(sourceType: string) {
  const labelMap: Record<string, string> = {
    achievement: 'Thanh tich',
    activity: 'Hoat dong',
    development: 'Phat trien',
    social: 'Xa hoi',
    special: 'Dac biet',
  };
  return labelMap[sourceType] || sourceType || 'Khong ro';
}

export default function AdminBonusApprovePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<BonusProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProposalStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [selectedProposal, setSelectedProposal] = useState<BonusProposal | null>(null);
  const [approvalNote, setApprovalNote] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchProposals();
    }
  }, [authLoading, router, user]);

  async function fetchProposals() {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/bonus');
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the tai de xuat cong diem');
      }

      setProposals(parseProposalsPayload(payload));
    } catch (fetchError) {
      console.error('Fetch bonus proposals error:', fetchError);
      setProposals([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Khong the tai de xuat cong diem'
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredProposals = useMemo(() => {
    let nextItems = [...proposals];

    if (filterStatus !== 'all') {
      nextItems = nextItems.filter((proposal) => proposal.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      nextItems = nextItems.filter((proposal) =>
        [proposal.student_name, proposal.student_email, proposal.author_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      );
    }

    nextItems.sort((left, right) => {
      if (sortBy === 'points') {
        return right.points - left.points;
      }
      if (sortBy === 'student') {
        return String(left.student_name || '').localeCompare(String(right.student_name || ''));
      }
      return (
        (parseVietnamDate(right.created_at)?.getTime() ?? 0) -
        (parseVietnamDate(left.created_at)?.getTime() ?? 0)
      );
    });

    return nextItems;
  }, [filterStatus, proposals, searchQuery, sortBy]);

  const stats = useMemo(() => {
    return {
      pending: proposals.filter((proposal) => proposal.status === 'pending').length,
      approved: proposals.filter((proposal) => proposal.status === 'approved').length,
      rejected: proposals.filter((proposal) => proposal.status === 'rejected').length,
    };
  }, [proposals]);

  async function handleDecision(proposal: BonusProposal, action: 'approve' | 'reject') {
    try {
      setProcessingId(proposal.id);
      const response = await fetch(`/api/bonus/${proposal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: approvalNote,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Khong the cap nhat de xuat');
      }

      toast.success(action === 'approve' ? 'Da phe duyet de xuat cong diem' : 'Da tu choi de xuat cong diem');
      setApprovalNote('');
      setSelectedProposal(null);
      await fetchProposals();
    } catch (decisionError) {
      console.error('Handle bonus proposal decision error:', decisionError);
      toast.error(
        decisionError instanceof Error
          ? decisionError.message
          : 'Khong the cap nhat de xuat cong diem'
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    try {
      const response = await fetch(`/api/bonus/reports?type=semester&format=${format}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        `bonus-report-${toVietnamDateStamp(new Date())}.${format}`
      );
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(format === 'csv' ? 'Da xuat bao cao CSV' : 'Da xuat bao cao JSON');
    } catch (exportError) {
      console.error('Export bonus report error:', exportError);
      toast.error('Khong the xuat bao cao cong diem');
    }
  }

  if (authLoading || (loading && proposals.length === 0 && !error)) {
    return <LoadingSpinner message="Dang tai de xuat cong diem..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/admin/dashboard"
                className="rounded-xl border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Bonus approval
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-bonus-approval-heading"
                >
                  Duyet de xuat cong diem
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Doi soat de xuat tu giang vien, xem bang chung va phe duyet theo tung hoc vien.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleExport('csv')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => void handleExport('json')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                JSON
              </button>
            </div>
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
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ten hoc vien, email, giang vien..."
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Trang thai</span>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as ProposalStatus)}
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
                onChange={(event) => setSortBy(event.target.value as SortBy)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              >
                <option value="created">Moi nhat</option>
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
        ) : filteredProposals.length === 0 ? (
          <section className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Khong co de xuat nao</h2>
            <p className="mt-2 text-sm text-slate-600">
              Thu doi bo loc hoac cho them de xuat moi tu giang vien.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 xl:hidden">
              {filteredProposals.map((proposal) => {
                const statusMeta = getStatusMeta(proposal.status);
                return (
                  <article key={proposal.id} className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {proposal.student_name || 'N/A'}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">{proposal.student_email || 'Khong co email'}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {getSourceLabel(proposal.source_type)}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-semibold text-blue-700">+{proposal.points}</div>
                        <div className="text-xs text-slate-500">diem</div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      Tao boi {proposal.author_name || 'N/A'} | {formatVietnamDateTime(proposal.created_at)}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProposal(proposal);
                        setApprovalNote('');
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-300 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
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
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Hoc vien</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Loai</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Diem</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Giang vien</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trang thai</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Chi tiet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredProposals.map((proposal) => {
                    const statusMeta = getStatusMeta(proposal.status);
                    return (
                      <tr key={proposal.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold text-slate-900">{proposal.student_name || 'N/A'}</div>
                          <div className="mt-1 text-sm text-slate-500">{proposal.student_email || 'Khong co email'}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{getSourceLabel(proposal.source_type)}</td>
                        <td className="px-5 py-4 text-right text-sm font-semibold text-blue-700">+{proposal.points}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{proposal.author_name || 'N/A'}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProposal(proposal);
                              setApprovalNote('');
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
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

      {selectedProposal ? (
        <div
          className="app-modal-backdrop p-4"
          onClick={() => setSelectedProposal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-bonus-proposal-detail-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-2xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Proposal detail
                </div>
                <h3 id="admin-bonus-proposal-detail-title" className="mt-2 text-2xl font-bold text-slate-900">
                  {selectedProposal.student_name || 'N/A'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{selectedProposal.student_email || 'Khong co email'}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Dong
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diem de xuat</div>
                <div className="mt-2 text-2xl font-semibold text-blue-700">+{selectedProposal.points}</div>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loai nguon</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{getSourceLabel(selectedProposal.source_type)}</div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Nguoi de xuat</div>
              <div className="mt-2">{selectedProposal.author_name || 'N/A'}</div>
              <div className="mt-2 text-xs text-slate-500">
                Tao luc {formatVietnamDateTime(selectedProposal.created_at)}
                {selectedProposal.status !== 'pending'
                  ? ` | Cap nhat ${formatVietnamDateTime(selectedProposal.updated_at)}`
                  : ''}
              </div>
            </div>

            {selectedProposal.evidence_url ? (
              <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">Bang chung</div>
                <a
                  href={selectedProposal.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block break-all text-sm text-blue-700 hover:underline"
                >
                  {selectedProposal.evidence_url}
                </a>
              </div>
            ) : null}

            {selectedProposal.status === 'pending' ? (
              <div className="mt-6 space-y-4 border-t border-slate-200 pt-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Ghi chu admin</span>
                  <textarea
                    rows={3}
                    value={approvalNote}
                    onChange={(event) => setApprovalNote(event.target.value)}
                    placeholder="Nhap ghi chu neu can..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={processingId === selectedProposal.id}
                    onClick={() => void handleDecision(selectedProposal, 'approve')}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {processingId === selectedProposal.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Phe duyet
                  </button>
                  <button
                    type="button"
                    disabled={processingId === selectedProposal.id}
                    onClick={() => void handleDecision(selectedProposal, 'reject')}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {processingId === selectedProposal.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Tu choi
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
