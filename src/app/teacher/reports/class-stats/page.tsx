'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, BarChart3, Calendar, Download, Filter, TrendingUp, Users } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { toVietnamFileTimestamp } from '@/lib/timezone';

interface ClassOption {
  id: number;
  name: string;
}

interface ClassStats {
  class_id: number;
  class_name: string;
  total_students: number;
  total_activities: number;
  avg_participation_rate: number;
  avg_score: number;
  total_points: number;
  attendance_trends: Array<{ month: string; rate: number }>;
  score_distribution: Array<{ range: string; count: number }>;
}

interface StudentClassStats {
  class_name: string;
  students: Array<{
    student_name: string;
    student_code: string;
    participation_count: number;
    participation_rate: number;
    avg_score: number;
  }>;
}

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

function getClassStatsFromResponse(payload: unknown): ClassStats[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { stats?: ClassStats[] };
    stats?: ClassStats[];
  };

  if (Array.isArray(normalized.data?.stats)) {
    return normalized.data.stats;
  }

  if (Array.isArray(normalized.stats)) {
    return normalized.stats;
  }

  return [];
}

function getStudentStatsFromResponse(payload: unknown): StudentClassStats | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const normalized = payload as { data?: StudentClassStats };
  return normalized.data ?? (payload as StudentClassStats);
}

export default function ClassStatsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [studentStats, setStudentStats] = useState<StudentClassStats | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [classesRes, statsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/teacher/reports/class-stats'),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        const normalizedClasses = getClassesFromResponse(classesData);
        setClasses(normalizedClasses);

        if (normalizedClasses.length > 0) {
          setSelectedClass((current) => current ?? normalizedClasses[0].id);
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setClassStats(getClassStatsFromResponse(statsData));
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
      router.push('/teacher/dashboard');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, fetchData, router, user]);

  const handleClassSelect = async (classId: number) => {
    setSelectedClass(classId);

    try {
      const response = await fetch(`/api/teacher/reports/class-stats/${classId}`);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(data?.error || data?.message, 'Không thể tải chi tiết lớp')
        );
      }
      setStudentStats(getStudentStatsFromResponse(data));
    } catch (error) {
      console.error('Error fetching class details:', error);
      toast.error(getErrorMessage(error, 'Không thể tải chi tiết lớp'));
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch('/api/teacher/reports/class-stats/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClass,
          date_range: dateRange,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `class-stats-${toVietnamFileTimestamp(new Date())}.pdf`;
      anchor.click();
      toast.success('Đã xuất báo cáo thành công');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Không thể xuất báo cáo');
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  const selectedClassData = classStats.find((item) => item.class_id === selectedClass);
  const maxDistributionCount = Math.max(
    ...(selectedClassData?.score_distribution.map((item) => item.count) ?? [0]),
    1
  );

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
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  Thống kê lớp học
                </h1>
                <p className="mt-2 text-gray-600">
                  Phân tích mức độ tham gia, điểm số và xu hướng hoạt động theo từng lớp.
                </p>
              </div>
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Xuất PDF
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                <Filter className="mr-1 inline h-4 w-4" />
                Chọn lớp
              </label>
              <select
                value={selectedClass ?? ''}
                onChange={(event) => void handleClassSelect(Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn lớp --</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Từ ngày</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(event) => setDateRange({ ...dateRange, start: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Đến ngày</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(event) => setDateRange({ ...dateRange, end: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {selectedClassData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 text-sm text-gray-600">Tổng học viên</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {selectedClassData.total_students}
                    </div>
                  </div>
                  <Users className="h-12 w-12 text-blue-100" />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 text-sm text-gray-600">Tỷ lệ tham gia</div>
                    <div className="text-3xl font-bold text-green-600">
                      {selectedClassData.avg_participation_rate.toFixed(1)}%
                    </div>
                  </div>
                  <TrendingUp className="h-12 w-12 text-green-100" />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 text-sm text-gray-600">Điểm trung bình</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {selectedClassData.avg_score.toFixed(1)}
                    </div>
                  </div>
                  <BarChart3 className="h-12 w-12 text-purple-100" />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 text-sm text-gray-600">Tổng hoạt động</div>
                    <div className="text-3xl font-bold text-orange-600">
                      {selectedClassData.total_activities}
                    </div>
                  </div>
                  <Calendar className="h-12 w-12 text-orange-100" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Xu hướng tỷ lệ tham gia trong 6 tháng
              </h3>
              <div className="space-y-3">
                {selectedClassData.attendance_trends.map((trend) => (
                  <div key={trend.month}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{trend.month}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {trend.rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all"
                        style={{ width: `${trend.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Phân bổ điểm</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {selectedClassData.score_distribution.map((distribution) => (
                  <div key={distribution.range} className="text-center">
                    <div className="mb-2 flex h-32 items-end justify-center rounded-lg bg-gray-100 p-2">
                      <div
                        className="w-4/5 rounded-t bg-gradient-to-t from-blue-500 to-blue-400"
                        style={{
                          height: `${Math.max((distribution.count / maxDistributionCount) * 100, 5)}%`,
                        }}
                      />
                    </div>
                    <div className="mb-1 text-xs text-gray-600">{distribution.range}</div>
                    <div className="text-lg font-bold text-gray-900">{distribution.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {studentStats && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Chi tiết học viên</h3>
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Lần tham gia
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Tỷ lệ tham gia
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                          Điểm trung bình
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {studentStats.students.map((student) => (
                        <tr
                          key={student.student_code || student.student_name}
                          className="transition-colors hover:bg-gray-50"
                        >
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">
                            {student.student_name}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {student.student_code}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {student.participation_count}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                student.participation_rate >= 80
                                  ? 'bg-green-100 text-green-800'
                                  : student.participation_rate >= 50
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {student.participation_rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-blue-600">
                            {student.avg_score.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <BarChart3 className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="mb-2 text-lg text-gray-600">Chọn một lớp để xem thống kê</p>
            <p className="text-sm text-gray-500">
              Chọn lớp từ danh sách bên trên để xem phân tích chi tiết.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
