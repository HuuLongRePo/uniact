'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, BarChart3, Calendar, Download, Filter, TrendingUp, Users } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { resolveDownloadFilename } from '@/lib/download-filename';
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
      console.error('Error fetching class stats:', error);
      toast.error(getErrorMessage(error, 'Khong the tai du lieu'));
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
      toast.error('Chi giang vien moi co quyen xem bao cao');
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
        throw new Error(getErrorMessage(data?.error || data?.message, 'Khong the tai chi tiet lop'));
      }
      setStudentStats(getStudentStatsFromResponse(data));
    } catch (error) {
      console.error('Error fetching class detail:', error);
      toast.error(getErrorMessage(error, 'Khong the tai chi tiet lop'));
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
        throw new Error('Khong the xuat bao cao');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        `class-stats-${toVietnamFileTimestamp(new Date())}.pdf`
      );
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success('Da xuat bao cao thanh cong');
    } catch (error) {
      console.error('Error exporting class stats:', error);
      toast.error('Khong the xuat bao cao');
    }
  };

  const selectedClassData = useMemo(
    () => classStats.find((item) => item.class_id === selectedClass) ?? null,
    [classStats, selectedClass]
  );

  const maxDistributionCount = Math.max(
    ...(selectedClassData?.score_distribution.map((item) => item.count) ?? [0]),
    1
  );

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lai
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <BarChart3 className="h-3.5 w-3.5" />
                Bao cao lop hoc
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Thong ke lop hoc</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Phan tich muc do tham gia, diem so va xu huong hoat dong theo tung lop de giao vien
                theo doi nhanh luc van hanh.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-800"
            >
              <Download className="h-4 w-4" />
              Xuat PDF
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="content-card p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">
                <Filter className="mr-1 inline h-4 w-4" />
                Chon lop
                <select
                  value={selectedClass ?? ''}
                  onChange={(event) => void handleClassSelect(Number(event.target.value))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Chon lop --</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Tu ngay
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(event) => setDateRange({ ...dateRange, start: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Den ngay
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(event) => setDateRange({ ...dateRange, end: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                />
              </label>
            </div>
          </div>

          {selectedClassData ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="content-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Tong hoc vien</div>
                      <div className="mt-2 text-3xl font-bold text-cyan-700">{selectedClassData.total_students}</div>
                    </div>
                    <Users className="h-10 w-10 text-cyan-200" />
                  </div>
                </div>
                <div className="content-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Ty le tham gia</div>
                      <div className="mt-2 text-3xl font-bold text-emerald-600">
                        {selectedClassData.avg_participation_rate.toFixed(1)}%
                      </div>
                    </div>
                    <TrendingUp className="h-10 w-10 text-emerald-200" />
                  </div>
                </div>
                <div className="content-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Diem trung binh</div>
                      <div className="mt-2 text-3xl font-bold text-violet-600">
                        {selectedClassData.avg_score.toFixed(1)}
                      </div>
                    </div>
                    <BarChart3 className="h-10 w-10 text-violet-200" />
                  </div>
                </div>
                <div className="content-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-slate-500">Tong hoat dong</div>
                      <div className="mt-2 text-3xl font-bold text-amber-600">{selectedClassData.total_activities}</div>
                    </div>
                    <Calendar className="h-10 w-10 text-amber-200" />
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                  <section className="content-card p-5">
                    <h2 className="text-lg font-semibold text-slate-950">Xu huong tham gia 6 thang</h2>
                    <div className="mt-5 space-y-4">
                      {selectedClassData.attendance_trends.length === 0 ? (
                        <p className="text-sm text-slate-500">Chua co du lieu xu huong.</p>
                      ) : (
                        selectedClassData.attendance_trends.map((trend) => (
                          <div key={trend.month}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-700">{trend.month}</span>
                              <span className="font-semibold text-slate-950">{trend.rate.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full bg-cyan-600"
                                style={{ width: `${trend.rate}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="content-card p-5">
                    <h2 className="text-lg font-semibold text-slate-950">Danh sach hoc vien</h2>
                    {studentStats?.students?.length ? (
                      <div className="mt-5 grid gap-4 lg:hidden">
                        {studentStats.students.map((student) => (
                          <article key={student.student_code || student.student_name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <h3 className="text-base font-semibold text-slate-950">{student.student_name}</h3>
                            <p className="mt-1 text-sm text-slate-500">{student.student_code}</p>
                            <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-slate-700">
                              <div>
                                <div className="text-xs uppercase tracking-wide text-slate-500">Lan TG</div>
                                <div className="mt-1 font-semibold text-slate-900">{student.participation_count}</div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wide text-slate-500">Ty le</div>
                                <div className="mt-1 font-semibold text-slate-900">{student.participation_rate.toFixed(1)}%</div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-wide text-slate-500">TB diem</div>
                                <div className="mt-1 font-semibold text-slate-900">{student.avg_score.toFixed(1)}</div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">Chon lop de tai danh sach hoc vien chi tiet.</p>
                    )}

                    {studentStats?.students?.length ? (
                      <div className="mt-5 hidden overflow-x-auto lg:block">
                        <table className="min-w-full">
                          <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Hoc vien</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Ma SV</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Lan tham gia</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Ty le</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">TB diem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {studentStats.students.map((student) => (
                              <tr key={student.student_code || student.student_name} className="hover:bg-slate-50">
                                <td className="px-4 py-4 text-sm font-medium text-slate-900">{student.student_name}</td>
                                <td className="px-4 py-4 text-sm text-slate-600">{student.student_code}</td>
                                <td className="px-4 py-4 text-sm text-slate-600">{student.participation_count}</td>
                                <td className="px-4 py-4 text-sm text-slate-600">{student.participation_rate.toFixed(1)}%</td>
                                <td className="px-4 py-4 text-sm font-semibold text-cyan-700">{student.avg_score.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </section>
                </div>

                <aside className="space-y-6">
                  <section className="content-card p-5">
                    <h2 className="text-lg font-semibold text-slate-950">Diem tong hop</h2>
                    <div className="mt-4 rounded-3xl bg-cyan-50 p-4">
                      <div className="text-sm text-cyan-700">Tong diem lop</div>
                      <div className="mt-2 text-3xl font-bold text-cyan-900">{selectedClassData.total_points.toFixed(1)}</div>
                    </div>
                  </section>

                  <section className="content-card p-5">
                    <h2 className="text-lg font-semibold text-slate-950">Phan bo diem</h2>
                    <div className="mt-5 grid grid-cols-2 gap-4">
                      {selectedClassData.score_distribution.length === 0 ? (
                        <p className="col-span-2 text-sm text-slate-500">Chua co du lieu phan bo diem.</p>
                      ) : (
                        selectedClassData.score_distribution.map((distribution) => (
                          <div key={distribution.range} className="text-center">
                            <div className="mb-2 flex h-28 items-end justify-center rounded-2xl bg-slate-100 p-2">
                              <div
                                className="w-4/5 rounded-t-2xl bg-gradient-to-t from-cyan-600 to-cyan-400"
                                style={{
                                  height: `${Math.max((distribution.count / maxDistributionCount) * 100, 8)}%`,
                                }}
                              />
                            </div>
                            <div className="text-xs text-slate-500">{distribution.range}</div>
                            <div className="mt-1 text-lg font-semibold text-slate-900">{distribution.count}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </aside>
              </div>
            </>
          ) : (
            <div className="content-card p-12 text-center">
              <BarChart3 className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <p className="text-lg font-medium text-slate-700">Chon mot lop de xem thong ke</p>
              <p className="mt-2 text-sm text-slate-500">Chon lop ben tren de xem phan tich chi tiet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
