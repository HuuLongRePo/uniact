'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Eye, Settings } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

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
    label: 'Báo cáo hoạt động',
    description: 'Thống kê hoạt động theo thời gian, trạng thái và đơn vị tổ chức.',
    icon: 'Hoạt động',
  },
  {
    id: 'participants',
    label: 'Báo cáo người tham gia',
    description: 'Danh sách người tham gia, trạng thái điểm danh và điểm số.',
    icon: 'Người tham gia',
  },
  {
    id: 'scores',
    label: 'Báo cáo điểm số',
    description: 'Tổng hợp điểm, số hoạt động đã tham gia và xếp hạng.',
    icon: 'Điểm số',
  },
  {
    id: 'awards',
    label: 'Báo cáo khen thưởng',
    description: 'Theo dõi các quyết định khen thưởng theo thời gian.',
    icon: 'Khen thưởng',
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
  title: 'Tiêu đề',
  name: 'Họ tên',
  email: 'Email',
  class: 'Lớp',
  date_time: 'Ngày giờ',
  location: 'Địa điểm',
  status: 'Trạng thái',
  type: 'Loại',
  level: 'Cấp độ',
  organizer: 'Người tổ chức',
  participants: 'Số người tham gia',
  created_at: 'Ngày tạo',
  activity: 'Hoạt động',
  checked_in: 'Điểm danh',
  rating: 'Đánh giá',
  points: 'Điểm',
  registered_at: 'Ngày đăng ký',
  total_points: 'Tổng điểm',
  activities_joined: 'Hoạt động tham gia',
  avg_rating: 'Đánh giá trung bình',
  rank: 'Xếp hạng',
  updated_at: 'Cập nhật lần cuối',
  recipient: 'Người nhận',
  reason: 'Lý do',
  awarded_by: 'Trao bởi',
  awarded_at: 'Ngày trao',
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
    return <LoadingSpinner />;
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
      toast.error('Vui lòng chọn ít nhất một cột');
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
        throw new Error(error.error || error.message || 'Không thể tải dữ liệu xem trước');
      }

      const csvText = await response.text();
      setPreviewRows(parseCsvPreview(csvText));
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewError(error instanceof Error ? error.message : 'Không thể tải dữ liệu xem trước');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    if (!config.name.trim()) {
      toast.error('Vui lòng nhập tên báo cáo');
      return;
    }

    if (config.columns.length === 0) {
      toast.error('Vui lòng chọn ít nhất một cột');
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
        throw new Error(error.error || error.message || 'Không thể xuất báo cáo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${config.name}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      toast.success('Xuất báo cáo thành công');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xuất báo cáo');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveReport = () => {
    if (!config.name.trim()) {
      toast.error('Vui lòng nhập tên báo cáo trước khi lưu');
      return;
    }

    setSavedReports((current) => [
      ...current,
      {
        ...config,
        id: Date.now().toString(),
      },
    ]);
    toast.success('Đã lưu cấu hình báo cáo');
  };

  const handleLoadSavedReport = (report: ReportConfig) => {
    setConfig({ ...report, id: undefined });
    setPreviewRows([]);
    setPreviewError(null);
    setStep('configure');
  };

  if (step === 'select') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 flex items-center gap-3 text-4xl font-bold">
            <Settings className="h-10 w-10 text-blue-600" />
            Báo cáo tùy chỉnh
          </h1>
          <p className="text-gray-600">Chọn loại báo cáo bạn muốn cấu hình và xuất ra CSV.</p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {REPORT_TYPES.map((reportType) => (
            <button
              key={reportType.id}
              onClick={() => handleSelectType(reportType.id)}
              className="rounded-lg border bg-white p-8 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-4 text-sm font-semibold text-blue-600">{reportType.icon}</div>
              <div className="text-xl font-bold text-gray-800">{reportType.label}</div>
              <div className="mt-3 text-sm text-gray-600">{reportType.description}</div>
              <div className="mt-4 text-sm font-medium text-blue-600">Bắt đầu cấu hình</div>
            </button>
          ))}
        </div>

        {savedReports.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold">Cấu hình đã lưu trong phiên làm việc</h2>
            <div className="space-y-3">
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded border p-3 transition hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">{report.name}</div>
                    <div className="text-sm text-gray-500">
                      {REPORT_TYPES.find((item) => item.id === report.type)?.label} •{' '}
                      {report.columns.length} cột
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoadSavedReport(report)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="h-5 w-5" />
                    Nạp lại
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={handleReset}
          className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại chọn loại báo cáo
        </button>
        <h1 className="mb-2 text-3xl font-bold">Cấu hình báo cáo</h1>
        <p className="text-gray-600">Loại báo cáo: {selectedTypeLabel}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <label className="mb-2 block text-sm font-medium">Tên báo cáo</label>
            <input
              type="text"
              value={config.name}
              onChange={(event) =>
                setConfig((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ví dụ: Báo cáo hoạt động tháng này"
              className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-bold">Chọn cột hiển thị</h3>
            <div className="mb-4 space-y-2">
              {config.columns.length > 0 ? (
                config.columns.map((column) => (
                  <div
                    key={column}
                    className="flex items-center justify-between rounded border border-blue-200 bg-blue-50 p-3"
                  >
                    <span className="font-medium">{COLUMN_LABELS[column] || column}</span>
                    <button
                      onClick={() => handleRemoveColumn(column)}
                      className="font-bold text-red-600 hover:text-red-800"
                    >
                      Xóa
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded bg-gray-50 p-3 text-gray-500">Chưa chọn cột nào</div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Thêm cột</label>
              <div className="grid grid-cols-2 gap-2">
                {COLUMN_OPTIONS[config.type].map((column) => (
                  <button
                    key={column}
                    onClick={() => handleAddColumn(column)}
                    disabled={config.columns.includes(column)}
                    className={`rounded px-3 py-2 text-sm font-medium transition ${
                      config.columns.includes(column)
                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    + {COLUMN_LABELS[column] || column}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-bold">Bộ lọc</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Từ ngày</label>
                <input
                  type="date"
                  value={config.filters.dateFrom || ''}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      filters: { ...current.filters, dateFrom: event.target.value },
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Đến ngày</label>
                <input
                  type="date"
                  value={config.filters.dateTo || ''}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      filters: { ...current.filters, dateTo: event.target.value },
                    }))
                  }
                  className="w-full rounded border px-3 py-2"
                />
              </div>

              {config.type === 'activities' && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Trạng thái</label>
                  <select
                    value={config.filters.status || ''}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        filters: { ...current.filters, status: event.target.value },
                      }))
                    }
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="">Tất cả</option>
                    <option value="draft">Nháp</option>
                    <option value="published">Đã công bố</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-bold">Định dạng xuất</h3>
            <p className="text-sm text-gray-600">
              Luồng hiện tại hỗ trợ xuất CSV ổn định. Các tùy chọn Excel/PDF cũ đã được loại bỏ để
              tránh gây hiểu nhầm.
            </p>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="sticky top-8 rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-bold">Xem trước</h3>

            <div className="mb-6 space-y-3">
              <div>
                <div className="mb-1 text-sm text-gray-500">Loại báo cáo</div>
                <div className="font-semibold">{selectedTypeLabel}</div>
              </div>

              <div>
                <div className="mb-1 text-sm text-gray-500">Tên</div>
                <div className="font-semibold">{config.name || '(Chưa nhập)'}</div>
              </div>

              <div>
                <div className="mb-1 text-sm text-gray-500">Số cột</div>
                <div className="font-semibold">{config.columns.length}</div>
              </div>

              <div>
                <div className="mb-1 text-sm text-gray-500">Định dạng</div>
                <div className="font-semibold">CSV</div>
              </div>
            </div>

            <button
              onClick={fetchPreview}
              disabled={previewLoading || config.columns.length === 0}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-bold text-white transition hover:bg-purple-700 disabled:bg-gray-400"
            >
              <Eye className="h-5 w-5" />
              {previewLoading ? 'Đang tải...' : 'Xem trước'}
            </button>

            {previewRows.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto rounded border border-blue-200 bg-blue-50 p-3">
                <div className="mb-2 text-xs font-bold text-blue-900">Dữ liệu mẫu</div>
                <table className="w-full text-xs">
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr
                        key={`${rowIndex}-${row.join('-')}`}
                        className={rowIndex === 0 ? 'border-b font-bold' : ''}
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
            )}

            {previewError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {previewError}
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={exporting || !config.name.trim() || config.columns.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-700 disabled:bg-gray-400"
            >
              <Download className="h-5 w-5" />
              {exporting ? 'Đang xuất...' : 'Xuất báo cáo'}
            </button>

            <button
              onClick={handleSaveReport}
              className="mt-2 w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700"
            >
              Lưu cấu hình hiện tại
            </button>

            <button
              onClick={handleReset}
              className="mt-2 w-full rounded-lg bg-gray-200 px-4 py-3 font-bold text-gray-800 transition hover:bg-gray-300"
            >
              Bắt đầu lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
