'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Activity, ArrowLeft, Download, Filter, Search } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface ClassOption {
  id: number;
  name: string;
}

interface ActivityTypeOption {
  id: number;
  name: string;
}

interface ParticipationRecord {
  activity_id: number;
  activity_name: string;
  student_id: number;
  student_name: string;
  class_name: string;
  activity_type: string;
  date: string;
  score: number;
  status: 'participated' | 'attended' | 'not_participated';
}

interface ParticipationSummary {
  student_id: number;
  student_name: string;
  student_code: string;
  class_name: string;
  total_activities: number;
  participated_count: number;
  participation_rate: number;
  total_score: number;
  avg_score: number;
}

type ParticipationSortKey = 'date' | 'student' | 'score' | 'activity';
type SortDirection = 'asc' | 'desc';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getClassesFromResponse(payload: unknown): ClassOption[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { classes?: ClassOption[] };
    classes?: ClassOption[];
  };

  if (Array.isArray(normalized.data?.classes)) {
    return normalized.data.classes;
  }

  if (Array.isArray(normalized.classes)) {
    return normalized.classes;
  }

  return [];
}

function getParticipationData(payload: unknown): {
  records: ParticipationRecord[];
  summary: ParticipationSummary[];
} {
  if (!payload || typeof payload !== 'object') {
    return { records: [], summary: [] };
  }

  const normalized = payload as {
    data?: {
      records?: ParticipationRecord[];
      summary?: ParticipationSummary[];
    };
    records?: ParticipationRecord[];
    summary?: ParticipationSummary[];
  };

  return {
    records: normalized.data?.records ?? normalized.records ?? [],
    summary: normalized.data?.summary ?? normalized.summary ?? [],
  };
}

function getActivityTypeNames(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    activityTypes?: ActivityTypeOption[];
    activity_types?: ActivityTypeOption[];
    types?: ActivityTypeOption[];
  };

  const activityTypes =
    normalized.activityTypes ?? normalized.activity_types ?? normalized.types ?? [];

  return activityTypes
    .map((type) => type?.name?.trim())
    .filter((name): name is string => Boolean(name));
}

export default function ParticipationReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ParticipationRecord[]>([]);
  const [summary, setSummary] = useState<ParticipationSummary[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ParticipationRecord[]>([]);
  const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');

  const [filters, setFilters] = useState({
    classId: '',
    activityType: '',
    status: '',
    dateStart: '',
    dateEnd: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ParticipationSortKey>('date');
  const [sortOrder, setSortOrder] = useState<SortDirection>('desc');

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activityTypes, setActivityTypes] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [classesRes, recordsRes, typesRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/teacher/reports/participation'),
        fetch('/api/activity-types'),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(getClassesFromResponse(classesData));
      }

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        const normalized = getParticipationData(recordsData);
        setRecords(normalized.records);
        setSummary(normalized.summary);
        setFilteredRecords(normalized.records);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setActivityTypes(getActivityTypeNames(typesData));
      }
    } catch (error: unknown) {
      console.error('Error fetching data:', error);
      toast.error(getErrorMessage(error, 'Không thể tải dữ liệu'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      toast.error('Chỉ giảng viên mới có quyền xem báo cáo');
      router.push('/dashboard');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, fetchData, router, user]);

  const applyFilters = useCallback(() => {
    let filtered = [...records];

    if (filters.classId) {
      filtered = filtered.filter((record) => record.class_name === filters.classId);
    }

    if (filters.activityType) {
      filtered = filtered.filter((record) => record.activity_type === filters.activityType);
    }

    if (filters.status) {
      filtered = filtered.filter((record) => record.status === filters.status);
    }

    if (filters.dateStart) {
      filtered = filtered.filter((record) => new Date(record.date) >= new Date(filters.dateStart));
    }

    if (filters.dateEnd) {
      filtered = filtered.filter((record) => new Date(record.date) <= new Date(filters.dateEnd));
    }

    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.student_name.toLowerCase().includes(normalizedSearch) ||
          record.activity_name.toLowerCase().includes(normalizedSearch)
      );
    }

    filtered.sort((left, right) => {
      let leftValue: string | number = '';
      let rightValue: string | number = '';

      if (sortBy === 'date') {
        leftValue = new Date(left.date).getTime();
        rightValue = new Date(right.date).getTime();
      } else if (sortBy === 'student') {
        leftValue = left.student_name;
        rightValue = right.student_name;
      } else if (sortBy === 'score') {
        leftValue = left.score;
        rightValue = right.score;
      } else if (sortBy === 'activity') {
        leftValue = left.activity_name;
        rightValue = right.activity_name;
      }

      if (sortOrder === 'asc') {
        return leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
      }

      return leftValue < rightValue ? 1 : leftValue > rightValue ? -1 : 0;
    });

    setFilteredRecords(filtered);
  }, [filters, records, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleSort = (field: ParticipationSortKey) => {
    setSortOrder((current) => (sortBy === field && current === 'asc' ? 'desc' : 'asc'));
    setSortBy(field);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/teacher/reports/participation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `participation-report-${Date.now()}.pdf`;
      anchor.click();
      toast.success('Đã xuất báo cáo thành công');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Không thể xuất báo cáo');
    }
  };

  const getStatusBadge = (status: ParticipationRecord['status']) => {
    switch (status) {
      case 'participated':
        return (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            Tham gia
          </span>
        );
      case 'attended':
        return (
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            Có mặt
          </span>
        );
      case 'not_participated':
        return (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
            Không tham gia
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  const stats = {
    total: records.length,
    participated: records.filter((record) => record.status === 'participated').length,
    attended: records.filter((record) => record.status === 'attended').length,
    notParticipated: records.filter((record) => record.status === 'not_participated').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </button>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <Activity className="h-6 w-6 text-blue-600" />
                  Báo cáo tham gia hoạt động
                </h1>
                <p className="mt-2 text-gray-600">
                  Theo dõi tỷ lệ tham gia của học viên theo lớp, hoạt động và điểm số tích lũy.
                </p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Xuất PDF
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Tổng lượt tham gia</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Đã tham gia</div>
            <div className="text-3xl font-bold text-green-600">{stats.participated}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Có mặt</div>
            <div className="text-3xl font-bold text-blue-500">{stats.attended}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm text-gray-600">Không tham gia</div>
            <div className="text-3xl font-bold text-red-600">{stats.notParticipated}</div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex gap-4">
            <button
              onClick={() => setViewMode('summary')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tóm tắt
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                viewMode === 'details'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chi tiết
            </button>
          </div>
        </div>

        {viewMode === 'summary' ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Học viên
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Mã sinh viên
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Lớp</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Tổng hoạt động
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Đã tham gia
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Tỷ lệ tham gia
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Tổng điểm
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Điểm trung bình
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {summary.map((item) => (
                    <tr key={item.student_id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {item.student_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.student_code}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.class_name}</td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {item.total_activities}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-green-600">
                        {item.participated_count}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            item.participation_rate >= 80
                              ? 'bg-green-100 text-green-800'
                              : item.participation_rate >= 50
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.participation_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-blue-600">
                        {item.total_score.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-blue-600">
                        {item.avg_score.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <Search className="mr-1 inline h-4 w-4" />
                    Tìm kiếm
                  </label>
                  <input
                    type="text"
                    placeholder="Tên học viên hoặc hoạt động..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    <Filter className="mr-1 inline h-4 w-4" />
                    Lớp
                  </label>
                  <select
                    value={filters.classId}
                    onChange={(event) => setFilters({ ...filters, classId: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Tất cả lớp --</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.name}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Loại hoạt động
                  </label>
                  <select
                    value={filters.activityType}
                    onChange={(event) =>
                      setFilters({ ...filters, activityType: event.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Tất cả loại --</option>
                    {activityTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Trạng thái</label>
                  <select
                    value={filters.status}
                    onChange={(event) => setFilters({ ...filters, status: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Tất cả --</option>
                    <option value="participated">Tham gia</option>
                    <option value="attended">Có mặt</option>
                    <option value="not_participated">Không tham gia</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.dateStart}
                    onChange={(event) => setFilters({ ...filters, dateStart: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th
                        onClick={() => handleSort('student')}
                        className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Học viên {sortBy === 'student' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Lớp
                      </th>
                      <th
                        onClick={() => handleSort('activity')}
                        className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Hoạt động {sortBy === 'activity' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Loại
                      </th>
                      <th
                        onClick={() => handleSort('date')}
                        className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Ngày {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Trạng thái
                      </th>
                      <th
                        onClick={() => handleSort('score')}
                        className="cursor-pointer px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100"
                      >
                        Điểm {sortBy === 'score' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRecords.map((record) => (
                      <tr
                        key={`${record.activity_id}-${record.student_id}`}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {record.student_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{record.class_name}</td>
                        <td className="px-4 py-4 text-sm font-medium text-blue-600">
                          {record.activity_name}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{record.activity_type}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {new Date(record.date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-4">{getStatusBadge(record.status)}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                          {record.score.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredRecords.length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
                <Activity className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                <p className="text-lg text-gray-600">Không có dữ liệu tham gia</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
