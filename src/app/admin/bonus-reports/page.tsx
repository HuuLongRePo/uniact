'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Download,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { resolveDownloadFilename } from '@/lib/download-filename';

interface SemesterReport {
  semester: string;
  academicYear: string;
  totalPoints: number;
  totalStudents: number;
  averagePointsPerStudent: number;
  classReports: ClassReport[];
}

interface ClassReport {
  className: string;
  studentCount: number;
  totalApprovedPoints: number;
  averagePointsPerStudent: number;
  proposals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

interface Statistics {
  total: { proposals: number; points: number };
  byStatus: { approved: number; pending: number; rejected: number };
  averages: { pointsPerApprovedProposal: number; approvalRate: number };
}

export default function BonusReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<SemesterReport | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, router, user]);

  async function fetchReport() {
    try {
      setLoading(true);
      setError('');
      const [reportResponse, statisticsResponse] = await Promise.all([
        fetch(`/api/bonus/reports?type=semester&semester=${semester}&academicYear=${academicYear}`),
        fetch('/api/bonus/reports?type=statistics'),
      ]);

      const [reportPayload, statisticsPayload] = await Promise.all([
        reportResponse.json().catch(() => null),
        statisticsResponse.json().catch(() => null),
      ]);

      if (!reportResponse.ok) {
        throw new Error(reportPayload?.error || reportPayload?.message || 'Khong the tai bao cao cong diem');
      }

      setReport((reportPayload?.data || reportPayload) as SemesterReport);
      setStatistics((statisticsPayload?.data || statisticsPayload) as Statistics);
    } catch (fetchError) {
      console.error('Fetch bonus reports error:', fetchError);
      setReport(null);
      setStatistics(null);
      setError(
        fetchError instanceof Error ? fetchError.message : 'Khong the tai bao cao cong diem'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: 'csv' | 'xlsx' | 'json') {
    try {
      setExporting(true);
      const response = await fetch(
        `/api/bonus/reports?type=semester&semester=${semester}&academicYear=${academicYear}&format=${format}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        `bonus-report-hk${semester}-${academicYear}.${format}`
      );
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`Da xuat bao cao ${format.toUpperCase()}`);
    } catch (exportError) {
      console.error('Export bonus report error:', exportError);
      toast.error('Khong the xuat bao cao cong diem');
    } finally {
      setExporting(false);
    }
  }

  if (authLoading || (loading && !report && !error)) {
    return <LoadingSpinner message="Dang tai bao cao cong diem..." />;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                href="/admin/bonus-approval"
                className="rounded-xl border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                  Bonus reports
                </div>
                <h1
                  className="mt-3 text-3xl font-bold text-slate-900"
                  data-testid="admin-bonus-reports-heading"
                >
                  Bao cao cong diem
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Tong hop cong diem theo hoc ky, doi soat ty le duyet va so sanh giua cac lop.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExport('csv')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExport('xlsx')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExport('json')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                JSON
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="text-sm font-semibold text-rose-700">Co loi khi tai bao cao</div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="grid gap-4 md:grid-cols-[220px_220px_1fr]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Hoc ky</span>
              <select
                value={semester}
                onChange={(event) => setSemester(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              >
                <option value={1}>Hoc ky 1</option>
                <option value={2}>Hoc ky 2</option>
                <option value={3}>Hoc ky 3</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Nam hoc</span>
              <input
                type="text"
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => void fetchReport()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Tai lai bao cao
              </button>
            </div>
          </div>
        </section>

        {statistics ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] bg-blue-50 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Tong de xuat</div>
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{statistics.total.proposals}</div>
              <div className="mt-2 text-xs text-slate-500">Duyet {statistics.byStatus.approved} | Cho {statistics.byStatus.pending}</div>
            </div>
            <div className="rounded-[1.5rem] bg-emerald-50 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tong diem</div>
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{statistics.total.points}</div>
              <div className="mt-2 text-xs text-slate-500">Chi tinh diem da duyet</div>
            </div>
            <div className="rounded-[1.5rem] bg-violet-50 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-violet-700">Ty le duyet</div>
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">
                {statistics.averages.approvalRate.toFixed(1)}%
              </div>
              <div className="mt-2 text-xs text-slate-500">
                TB {statistics.averages.pointsPerApprovedProposal.toFixed(1)} diem/de xuat
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-rose-50 px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Tu choi</div>
              <div className="mt-3 text-2xl font-semibold text-slate-900">{statistics.byStatus.rejected}</div>
              <div className="mt-2 text-xs text-slate-500">So de xuat khong duoc duyet</div>
            </div>
          </section>
        ) : null}

        {report ? (
          <>
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
              <div className="text-sm text-slate-500">Tong quan hoc ky</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Bao cao {report.semester} - nam hoc {report.academicYear}
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong hoc vien</div>
                  <div className="mt-3 text-2xl font-semibold text-slate-900">{report.totalStudents}</div>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong diem duyet</div>
                  <div className="mt-3 text-2xl font-semibold text-slate-900">{report.totalPoints}</div>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diem TB / hoc vien</div>
                  <div className="mt-3 text-2xl font-semibold text-slate-900">
                    {report.averagePointsPerStudent.toFixed(2)}
                  </div>
                </div>
              </div>
            </section>

            {report.classReports.length === 0 ? (
              <section className="page-surface rounded-[1.75rem] border-dashed px-5 py-10 text-center sm:px-7">
                <div className="text-xl font-semibold text-slate-900">Khong co du lieu theo lop</div>
                <p className="mt-2 text-sm text-slate-600">
                  Thu doi hoc ky hoac nam hoc de xem bao cao khac.
                </p>
              </section>
            ) : (
              <>
                <section className="grid gap-4 xl:hidden">
                  {report.classReports.map((classReport) => (
                    <article
                      key={classReport.className}
                      className="page-surface rounded-[1.75rem] border px-5 py-5 sm:px-7"
                    >
                      <div className="text-base font-semibold text-slate-900">{classReport.className}</div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">So HV</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{classReport.studentCount}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong diem</div>
                          <div className="mt-2 text-sm font-semibold text-emerald-700">{classReport.totalApprovedPoints}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diem TB</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">
                            {classReport.averagePointsPerStudent.toFixed(2)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tong de xuat</div>
                          <div className="mt-2 text-sm font-semibold text-slate-900">{classReport.proposals.total}</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>

                <section className="page-surface hidden overflow-x-auto rounded-[1.75rem] border xl:block">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Lop</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">So HV</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tong diem</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Diem TB</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tong de xuat</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Duyet</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cho</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tu choi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {report.classReports.map((classReport) => (
                        <tr key={classReport.className} className="hover:bg-slate-50">
                          <td className="px-5 py-4 text-sm font-semibold text-slate-900">{classReport.className}</td>
                          <td className="px-5 py-4 text-right text-sm text-slate-600">{classReport.studentCount}</td>
                          <td className="px-5 py-4 text-right text-sm font-semibold text-emerald-700">{classReport.totalApprovedPoints}</td>
                          <td className="px-5 py-4 text-right text-sm text-slate-600">
                            {classReport.averagePointsPerStudent.toFixed(2)}
                          </td>
                          <td className="px-5 py-4 text-right text-sm text-slate-600">{classReport.proposals.total}</td>
                          <td className="px-5 py-4 text-right text-sm text-emerald-700">{classReport.proposals.approved}</td>
                          <td className="px-5 py-4 text-right text-sm text-amber-700">{classReport.proposals.pending}</td>
                          <td className="px-5 py-4 text-right text-sm text-rose-700">{classReport.proposals.rejected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
