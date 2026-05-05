'use client';

import React from 'react';
import Link from 'next/link';
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
        name: typeof record.name === 'string' ? record.name : 'Chua cap nhat',
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
        throw new Error(getErrorMessage(payload, 'Khong the tai bao cao giang vien.'));
      }

      setTeachers(getTeachersFromResponse(payload));
    } catch (error) {
      console.error('Teacher report fetch error:', error);
      setTeachers([]);
      setErrorMessage(
        error instanceof Error ? error.message : 'Khong the tai bao cao giang vien.'
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

  const totalActivities = teachers.reduce((total, teacher) => total + teacher.totalActivitiesCreated, 0);
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
    return <LoadingSpinner message="Dang tai bao cao giang vien..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Teacher analytics
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Bao cao giang vien</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Tong hop khoi luong to chuc hoat dong, muc tham gia va mat bang diem da trao theo
              tung giang vien.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchReport()}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Tai lai
            </button>
            <Link
              href="/admin/reports"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Ve trung tam bao cao
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-600">Tong giang vien</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{teachers.length}</div>
          </article>
          <article className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-cyan-800">Tong hoat dong da tao</div>
            <div className="mt-3 text-3xl font-semibold text-cyan-950">{totalActivities}</div>
          </article>
          <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-emerald-800">Ti le tham gia trung binh</div>
            <div className="mt-3 text-3xl font-semibold text-emerald-950">
              {formatDecimal(averageAttendance)}%
            </div>
          </article>
          <article className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
            <div className="text-sm font-medium text-violet-800">Diem trung binh da trao</div>
            <div className="mt-3 text-3xl font-semibold text-violet-950">
              {formatDecimal(averagePointsAwarded)}
            </div>
            <div className="mt-2 text-sm text-violet-800">
              {totalStudentsParticipated.toLocaleString('vi-VN')} luot tham gia
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Chi tiet theo giang vien</h2>
            <p className="mt-1 text-sm text-slate-500">
              Doi thu tu sap xep de nhin ra nhom dang ganh nhieu khoi luong hoac can duoc ho tro.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSortChange('totalActivitiesCreated')}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                sortField === 'totalActivitiesCreated'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hoat dong da tao
            </button>
            <button
              type="button"
              onClick={() => handleSortChange('averageAttendance')}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                sortField === 'averageAttendance'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Ti le tham gia
            </button>
            <button
              type="button"
              onClick={() => handleSortChange('averagePointsAwarded')}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                sortField === 'averagePointsAwarded'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Diem trung binh
            </button>
            <button
              type="button"
              onClick={() => handleSortChange('totalStudentsParticipated')}
              className={`rounded-full px-3 py-2 text-sm font-medium ${
                sortField === 'totalStudentsParticipated'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hoc vien tham gia
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:hidden">
          {sortedTeachers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Chua co du lieu giang vien de hien thi.
            </div>
          ) : (
            sortedTeachers.map((teacher, index) => (
              <article
                key={teacher.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-500">Hang #{index + 1}</div>
                    <div className="mt-1 truncate text-base font-semibold text-slate-950">
                      {teacher.name}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">
                      {teacher.email || 'Chua cap nhat'}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-cyan-700">
                      Hoat dong
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">
                      {teacher.totalActivitiesCreated}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    Ti le tham gia
                    <div className="mt-1 font-semibold text-emerald-700">
                      {formatDecimal(teacher.averageAttendance)}%
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    Diem trung binh
                    <div className="mt-1 font-semibold text-violet-700">
                      {formatDecimal(teacher.averagePointsAwarded)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                  Hoc vien tham gia:{' '}
                  <span className="font-semibold text-slate-950">
                    {teacher.totalStudentsParticipated.toLocaleString('vi-VN')}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto lg:block">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  STT
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Giang vien
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hoat dong da tao
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ti le tham gia TB
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Diem TB da trao
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Hoc vien da tham gia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sortedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Chua co du lieu giang vien de hien thi.
                  </td>
                </tr>
              ) : (
                sortedTeachers.map((teacher, index) => (
                  <tr key={teacher.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{teacher.name}</div>
                      <div className="text-sm text-slate-500">
                        {teacher.email || 'Chua cap nhat'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-cyan-700">
                      {teacher.totalActivitiesCreated}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-700">
                      {formatDecimal(teacher.averageAttendance)}%
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-violet-700">
                      {formatDecimal(teacher.averagePointsAwarded)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {teacher.totalStudentsParticipated.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
