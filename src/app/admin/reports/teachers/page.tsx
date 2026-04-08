'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

interface TeacherReport {
  id: number;
  name: string;
  email: string;
  totalActivitiesCreated: number;
  averageAttendance: number;
  averagePointsAwarded: number;
  totalStudentsParticipated: number;
}

type SortField =
  | 'totalActivitiesCreated'
  | 'averageAttendance'
  | 'averagePointsAwarded'
  | 'totalStudentsParticipated';

type SortDirection = 'asc' | 'desc';

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTeachersFromResponse(payload: unknown): TeacherReport[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const normalized = payload as {
    data?: { teachers?: unknown[] };
    teachers?: unknown[];
  };

  const rows = Array.isArray(normalized.data?.teachers)
    ? normalized.data.teachers
    : Array.isArray(normalized.teachers)
      ? normalized.teachers
      : [];

  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const record = row as Record<string, unknown>;

      return {
        id: toNumber(record.id),
        name: typeof record.name === 'string' ? record.name : 'Chưa cập nhật',
        email: typeof record.email === 'string' ? record.email : '',
        totalActivitiesCreated: toNumber(record.totalActivitiesCreated),
        averageAttendance: toNumber(record.averageAttendance),
        averagePointsAwarded: toNumber(record.averagePointsAwarded),
        totalStudentsParticipated: toNumber(record.totalStudentsParticipated),
      };
    })
    .filter((teacher): teacher is TeacherReport => teacher !== null);
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const normalized = payload as {
    error?: string;
    message?: string;
  };

  return normalized.error ?? normalized.message ?? fallback;
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}

export default function TeacherReportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [teachers, setTeachers] = useState<TeacherReport[]>([]);
  const [sortField, setSortField] = useState<SortField>('totalActivitiesCreated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchReport();
    }
  }, [authLoading, router, user]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await fetch('/api/admin/reports/teachers');
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Không thể tải báo cáo giảng viên.'));
      }

      setTeachers(getTeachersFromResponse(payload));
    } catch (error) {
      console.error('Teacher report fetch error:', error);
      setTeachers([]);
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể tải báo cáo giảng viên.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }

    setSortField(field);
    setSortDirection('desc');
  };

  const sortedTeachers = [...teachers].sort((left, right) => {
    const difference = left[sortField] - right[sortField];

    if (difference === 0) {
      return left.name.localeCompare(right.name, 'vi');
    }

    return sortDirection === 'desc' ? difference * -1 : difference;
  });

  const totalActivities = teachers.reduce(
    (total, teacher) => total + teacher.totalActivitiesCreated,
    0
  );
  const averageAttendance =
    teachers.length > 0
      ? teachers.reduce((total, teacher) => total + teacher.averageAttendance, 0) / teachers.length
      : 0;
  const averagePointsAwarded =
    teachers.length > 0
      ? teachers.reduce((total, teacher) => total + teacher.averagePointsAwarded, 0) /
        teachers.length
      : 0;
  const totalStudentsParticipated = teachers.reduce(
    (total, teacher) => total + teacher.totalStudentsParticipated,
    0
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Báo cáo giảng viên</h1>
          <p className="mt-2 text-sm text-gray-600">
            Tổng hợp hiệu quả tổ chức hoạt động, tỷ lệ tham gia và điểm trung bình theo từng giảng
            viên.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Tổng giảng viên</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{teachers.length}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Tổng hoạt động đã tạo</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{totalActivities}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Tỷ lệ tham gia trung bình</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {formatDecimal(averageAttendance)}%
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm text-gray-600">Điểm trung bình đã trao</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">
              {formatDecimal(averagePointsAwarded)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {totalStudentsParticipated.toLocaleString('vi-VN')} lượt sinh viên tham gia
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Chi tiết theo giảng viên</h2>
              <p className="mt-1 text-sm text-gray-600">
                Bấm vào tiêu chí để đổi cách sắp xếp và xác định nhóm giảng viên nổi bật.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSortChange('totalActivitiesCreated')}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  sortField === 'totalActivitiesCreated'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hoạt động đã tạo
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('averageAttendance')}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  sortField === 'averageAttendance'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tỷ lệ tham gia
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('averagePointsAwarded')}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  sortField === 'averagePointsAwarded'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Điểm trung bình
              </button>
              <button
                type="button"
                onClick={() => handleSortChange('totalStudentsParticipated')}
                className={`rounded-full px-3 py-2 text-sm font-medium ${
                  sortField === 'totalStudentsParticipated'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sinh viên tham gia
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    STT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Giảng viên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Hoạt động đã tạo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Tỷ lệ tham gia TB
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Điểm TB đã trao
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Sinh viên đã tham gia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sortedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      Chưa có dữ liệu giảng viên để hiển thị.
                    </td>
                  </tr>
                ) : (
                  sortedTeachers.map((teacher, index) => (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{teacher.name}</div>
                        <div className="text-sm text-gray-500">{teacher.email || 'Chưa cập nhật'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {teacher.totalActivitiesCreated}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600">
                        {formatDecimal(teacher.averageAttendance)}%
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-purple-600">
                        {formatDecimal(teacher.averagePointsAwarded)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {teacher.totalStudentsParticipated.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
