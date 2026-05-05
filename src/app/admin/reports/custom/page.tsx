'use client';

import React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Eye, Settings } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { toVietnamDateStamp } from '@/lib/timezone';

type ReportType = 'activities' | 'participants' | 'scores' | 'awards';

interface ReportConfig {
  id?: string;
  name: string;
  type: ReportType;
  columns: string[];
  filters: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  };
  format: 'csv';
}

type PreviewRow = string[];

const REPORT_TYPES: Array<{ id: ReportType; label: string; description: string; icon: string }> = [
  {
    id: 'activities',
    label: 'Bao cao hoat dong',
    description: 'Thong ke hoat dong theo thoi gian, trang thai va don vi to chuc.',
    icon: 'Hoat dong',
  },
  {
    id: 'participants',
    label: 'Bao cao nguoi tham gia',
    description: 'Danh sach nguoi tham gia, trang thai diem danh va diem so.',
    icon: 'Nguoi tham gia',
  },
  {
    id: 'scores',
    label: 'Bao cao diem so',
    description: 'Tong hop diem, so hoat dong da tham gia va xep hang.',
    icon: 'Diem so',
  },
  {
    id: 'awards',
    label: 'Bao cao khen thuong',
    description: 'Theo doi cac quyet dinh khen thuong theo thoi gian.',
    icon: 'Khen thuong',
  },
];

const COLUMN_OPTIONS: Record<ReportType, string[]> = {
  activities: [
    'id',
    'title',
    'date_time',
    'location',
    'status',
    'type',
    'level',
    'organizer',
    'participants',
    'created_at',
  ],
  participants: [
    'id',
    'name',
    'email',
    'class',
    'activity',
    'status',
    'checked_in',
    'rating',
    'points',
    'registered_at',
  ],
  scores: [
    'id',
    'name',
    'class',
    'total_points',
    'activities_joined',
    'avg_rating',
    'rank',
    'updated_at',
  ],
  awards: ['id', 'recipient', 'type', 'reason', 'awarded_by', 'awarded_at', 'status'],
};

const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  title: 'Tieu de',
  name: 'Ho ten',
  email: 'Email',
  class: 'Lop',
  date_time: 'Ngay gio',
  location: 'Dia diem',
  status: 'Trang thai',
  type: 'Loai',
  level: 'Cap do',
  organizer: 'Nguoi to chuc',
  participants: 'So nguoi tham gia',
  created_at: 'Ngay tao',
  activity: 'Hoat dong',
  checked_in: 'Diem danh',
  rating: 'Danh gia',
  points: 'Diem',
  registered_at: 'Ngay dang ky',
  total_points: 'Tong diem',
  activities_joined: 'Hoat dong tham gia',
  avg_rating: 'Danh gia trung binh',
  rank: 'Xep hang',
  updated_at: 'Cap nhat lan cuoi',
  recipient: 'Nguoi nhan',
  reason: 'Ly do',
  awarded_by: 'Trao boi',
  awarded_at: 'Ngay trao',
};

const DEFAULT_CONFIG: ReportConfig = {
  name: '',
  type: 'activities',
  columns: [],
  filters: {},
  format: 'csv',
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsvPreview(csvText: string): PreviewRow[] {
  return csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 6)
    .map((line) => parseCsvLine(line));
}

function getDefaultColumns(type: ReportType): string[] {
  return COLUMN_OPTIONS[type].slice(0, 3);
}

function SelectStepCard({
  reportType,
  onSelect,
}: {
  reportType: { id: ReportType; label: string; description: string; icon: string };
  onSelect: (type: ReportType) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(reportType.id)}
      className="rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 hover:shadow-md"
    >
      <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
        {reportType.icon}
      </div>
      <div className="mt-4 text-xl font-semibold text-slate-950">{reportType.label}</div>
      <div className="mt-3 text-sm leading-6 text-slate-600">{reportType.description}</div>
      <div className="mt-4 text-sm font-medium text-cyan-700">Bat dau cau hinh</div>
    </button>
  );
}

export default function CustomReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [exporting, setExporting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_CONFIG);
  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user]);

  const selectedTypeLabel = useMemo(
    () => REPORT_TYPES.find((reportType) => reportType.id === config.type)?.label ?? '',
    [config.type]
  );

  if (authLoading || !user || user.role !== 'admin') {
    return <LoadingSpinner message="Dang tai custom report..." />;
  }

  const handleSelectType = (type: ReportType) => {
    setConfig({
      ...DEFAULT_CONFIG,
      type,
      columns: getDefaultColumns(type),
    });
    setPreviewRows([]);
    setPreviewError(null);
    setStep('configure');
  };

  const handleAddColumn = (column: string) => {
    if (config.columns.includes(column)) {
      return;
    }

    setConfig((current) => ({
      ...current,
      columns: [...current.columns, column],
    }));
  };

  const handleRemoveColumn = (column: string) => {
    setConfig((current) => ({
      ...current,
      columns: current.columns.filter((item) => item !== column),
    }));
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setPreviewRows([]);
    setPreviewError(null);
    setStep('select');
  };

  const buildRequestBody = () => ({
    ...config,
    columns: config.columns,
    format: 'csv' as const,
  });

  const fetchPreview = async () => {
    if (config.columns.length === 0) {
      toast.error('Vui long chon it nhat mot cot');
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);

      const response = await fetch('/api/admin/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody()),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Khong the tai du lieu xem truoc');
      }

      const csvText = await response.text();
      setPreviewRows(parseCsvPreview(csvText));
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewError(error instanceof Error ? error.message : 'Khong the tai du lieu xem truoc');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    if (!config.name.trim()) {
      toast.error('Vui long nhap ten bao cao');
      return;
    }

    if (config.columns.length === 0) {
      toast.error('Vui long chon it nhat mot cot');
      return;
    }

    try {
      setExporting(true);

      const response = await fetch('/api/admin/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody()),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Khong the xuat bao cao');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        `${config.name}-${toVietnamDateStamp(new Date())}.csv`
      );
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      toast.success('Xuat bao cao thanh cong');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the xuat bao cao');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveReport = () => {
    if (!config.name.trim()) {
      toast.error('Vui long nhap ten bao cao truoc khi luu');
      return;
    }

    setSavedReports((current) => [
      ...current,
      {
        ...config,
        id: Date.now().toString(),
      },
    ]);
    toast.success('Da luu cau hinh bao cao');
  };

  const handleLoadSavedReport = (report: ReportConfig) => {
    setConfig({ ...report, id: undefined });
    setPreviewRows([]);
    setPreviewError(null);
    setStep('configure');
  };

  if (step === 'select') {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3">
                <Settings className="h-8 w-8 text-cyan-700" />
                <h1 className="text-3xl font-semibold text-slate-950">Bao cao tuy chinh</h1>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Chon nhom du lieu can xuat, cau hinh bo cot va preview ngay truoc khi tai file CSV.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/reports"
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ve trung tam bao cao
              </Link>
              <Link
                href="/admin/dashboard"
                className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
              >
                Ve dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {REPORT_TYPES.map((reportType) => (
            <SelectStepCard
              key={reportType.id}
              reportType={reportType}
              onSelect={handleSelectType}
            />
          ))}
        </section>

        {savedReports.length > 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Cau hinh da luu trong phien</h2>
            <div className="mt-4 space-y-3">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <div className="font-medium text-slate-950">{report.name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {REPORT_TYPES.find((item) => item.id === report.type)?.label} ·{' '}
                      {report.columns.length} cot
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadSavedReport(report)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50"
                  >
                    <Eye className="h-4 w-4" />
                    Nap lai
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai chon loai bao cao
        </button>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold text-slate-950">Cau hinh bao cao</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
              Loai bao cao dang chon: <span className="font-semibold text-slate-950">{selectedTypeLabel}</span>
            </p>
          </div>

          <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            CSV only · preview nhanh truoc khi tai file
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block text-sm font-medium text-slate-700">
              Ten bao cao
              <input
                type="text"
                value={config.name}
                onChange={(event) =>
                  setConfig((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Vi du: Bao cao hoat dong thang nay"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
              />
            </label>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Chon cot hien thi</h2>

            <div className="mt-4 space-y-2">
              {config.columns.length > 0 ? (
                config.columns.map((column) => (
                  <div
                    key={column}
                    className="flex items-center justify-between rounded-2xl border border-cyan-200 bg-cyan-50 p-3"
                  >
                    <span className="font-medium text-slate-900">{COLUMN_LABELS[column] || column}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(column)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Xoa
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">Chua chon cot nao</div>
              )}
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">Them cot</label>
              <div className="grid grid-cols-2 gap-2">
                {COLUMN_OPTIONS[config.type].map((column) => (
                  <button
                    type="button"
                    key={column}
                    onClick={() => handleAddColumn(column)}
                    disabled={config.columns.includes(column)}
                    className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                      config.columns.includes(column)
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + {COLUMN_LABELS[column] || column}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Bo loc</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tu ngay</label>
                <input
                  type="date"
                  value={config.filters.dateFrom || ''}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      filters: { ...current.filters, dateFrom: event.target.value },
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Den ngay</label>
                <input
                  type="date"
                  value={config.filters.dateTo || ''}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      filters: { ...current.filters, dateTo: event.target.value },
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                />
              </div>

              {config.type === 'activities' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Trang thai</label>
                  <select
                    value={config.filters.status || ''}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        filters: { ...current.filters, status: event.target.value },
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
                  >
                    <option value="">Tat ca</option>
                    <option value="draft">Nhap</option>
                    <option value="published">Da cong bo</option>
                    <option value="completed">Hoan thanh</option>
                    <option value="cancelled">Da huy</option>
                  </select>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Dinh dang xuat</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Luong hien tai chi xuat CSV de giu contract on dinh va giam nham lan cho end-user.
            </p>
          </section>
        </div>

        <div className="md:col-span-1">
          <section className="sticky top-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Xem truoc</h2>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 text-sm text-slate-500">Loai bao cao</div>
                <div className="font-semibold text-slate-950">{selectedTypeLabel}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-slate-500">Ten</div>
                <div className="font-semibold text-slate-950">{config.name || '(Chua nhap)'}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-slate-500">So cot</div>
                <div className="font-semibold text-slate-950">{config.columns.length}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-slate-500">Dinh dang</div>
                <div className="font-semibold text-slate-950">CSV</div>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchPreview}
              disabled={previewLoading || config.columns.length === 0}
              className="bg-purple-600 mb-4 mt-6 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold text-white transition hover:bg-purple-700 disabled:bg-slate-400"
            >
              <Eye className="h-5 w-5" />
              {previewLoading ? 'Dang tai...' : 'Xem truoc'}
            </button>

            {previewRows.length > 0 ? (
              <div className="max-h-48 mb-4 overflow-y-auto rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-900">Du lieu mau</div>
                <table className="w-full text-xs">
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr
                        key={`${rowIndex}-${row.join('-')}`}
                        className={rowIndex === 0 ? 'border-b font-bold text-slate-900' : 'text-slate-700'}
                      >
                        {row.slice(0, 3).map((cell, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`} className="truncate p-1">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {previewError ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {previewError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !config.name.trim() || config.columns.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:bg-slate-400"
            >
              <Download className="h-5 w-5" />
              {exporting ? 'Dang xuat...' : 'Xuat bao cao'}
            </button>

            <button
              type="button"
              onClick={handleSaveReport}
              className="mt-2 w-full rounded-2xl bg-cyan-700 px-4 py-3 font-bold text-white transition hover:bg-cyan-800"
            >
              Luu cau hinh hien tai
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="mt-2 w-full rounded-2xl bg-slate-200 px-4 py-3 font-bold text-slate-800 transition hover:bg-slate-300"
            >
              Bat dau lai
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
