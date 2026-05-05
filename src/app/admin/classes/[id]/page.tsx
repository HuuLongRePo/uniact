'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, Download, Edit3, GraduationCap, School2, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime, toVietnamDateStamp } from '@/lib/timezone';
import { Class as AdminClass } from '../types';

type ClassTeacher = {
  id: number;
  name?: string | null;
  email?: string | null;
};

type ClassDetail = AdminClass & {
  description?: string | null;
  teachers?: ClassTeacher[];
};

type ClassStudent = {
  id: number;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  student_code?: string | null;
  activity_count?: number | null;
  attended_count?: number | null;
  award_count?: number | null;
  total_points?: number | null;
  created_at?: string | null;
};

type StudentSummary = {
  total: number;
  activity_count: number;
  attended_count: number;
  total_points: number;
  avg_points: number;
  award_count: number;
};

function parseClassPayload(payload: any): ClassDetail | null {
  const record = payload?.data?.class || payload?.class || payload?.data || null;
  if (!record || typeof record !== 'object') return null;

  return {
    ...(record as ClassDetail),
    teachers: Array.isArray(record.teachers) ? (record.teachers as ClassTeacher[]) : [],
  };
}

function parseStudentPayload(payload: any) {
  const students = payload?.data?.students || payload?.students || payload?.data || [];
  const summary = payload?.data?.classSummary || payload?.classSummary || payload?.data?.summary || payload?.summary || null;

  return {
    students: Array.isArray(students) ? (students as ClassStudent[]) : [],
    summary:
      summary && typeof summary === 'object'
        ? ({
            total: Number(summary.total || 0),
            activity_count: Number(summary.activity_count || 0),
            attended_count: Number(summary.attended_count || 0),
            total_points: Number(summary.total_points || 0),
            avg_points: Number(summary.avg_points || 0),
            award_count: Number(summary.award_count || 0),
          } as StudentSummary)
        : null,
  };
}

function formatMetric(value: number, digits = 0) {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function toStudentName(student: ClassStudent) {
  return student.full_name || student.name || `Hoc vien #${student.id}`;
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'cyan' | 'emerald' | 'violet' | 'amber';
}) {
  const toneMap: Record<typeof tone, string> = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneMap[tone]}`}>
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-800">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default function ClassDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, router, user?.id, user?.role]);

  const fetchClassDetail = useCallback(async () => {
    if (!classId) return;

    try {
      setIsLoading(true);
      setLoadError(null);

      const [classRes, studentRes] = await Promise.all([
        fetch(`/api/admin/classes/${classId}`),
        fetch(`/api/admin/students?class_id=${encodeURIComponent(classId)}&page=1&limit=200`),
      ]);

      const classPayload = await classRes.json().catch(() => null);
      if (!classRes.ok) {
        throw new Error(classPayload?.error || classPayload?.message || 'Khong the tai thong tin lop hoc');
      }

      const parsedClass = parseClassPayload(classPayload);
      if (!parsedClass) {
        throw new Error('Khong tim thay thong tin lop hoc');
      }

      setClassData(parsedClass);

      if (studentRes.ok) {
        const studentPayload = await studentRes.json().catch(() => null);
        const parsedStudents = parseStudentPayload(studentPayload);
        setStudents(parsedStudents.students);
        setSummary(parsedStudents.summary);
      } else {
        setStudents([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Fetch class detail error:', error);
      const message = error instanceof Error ? error.message : 'Khong the tai thong tin lop hoc';
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    void fetchClassDetail();
  }, [fetchClassDetail, user?.id, user?.role]);

  const metrics = useMemo(() => {
    const totalStudents = Number(classData?.student_count || summary?.total || students.length || 0);
    const totalActivities =
      summary?.activity_count ??
      students.reduce((sum, student) => sum + Number(student.activity_count || 0), 0);
    const totalPoints =
      summary?.total_points ??
      students.reduce((sum, student) => sum + Number(student.total_points || 0), 0);
    const averagePoints = totalStudents > 0 ? (summary?.avg_points ?? totalPoints / totalStudents) : 0;
    const awardCount =
      summary?.award_count ?? students.reduce((sum, student) => sum + Number(student.award_count || 0), 0);

    return {
      totalStudents,
      totalActivities,
      totalPoints,
      averagePoints,
      awardCount,
    };
  }, [classData?.student_count, students, summary]);

  const exportClassRoster = () => {
    if (!classData) return;

    const escapeCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [
      [
        'Ma hoc vien',
        'Ho va ten',
        'Email',
        'So hoat dong',
        'So lan co mat',
        'Tong diem',
        'Ngay tao tai khoan',
      ].join(','),
      ...students.map((student) =>
        [
          escapeCell(student.student_code || ''),
          escapeCell(toStudentName(student)),
          escapeCell(student.email || ''),
          escapeCell(Number(student.activity_count || 0)),
          escapeCell(Number(student.attended_count || 0)),
          escapeCell(Number(student.total_points || 0)),
          escapeCell(student.created_at ? formatVietnamDateTime(student.created_at, 'date') : '-'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `roster-${classData.name.replace(/\s+/g, '-').toLowerCase()}-${toVietnamDateStamp(new Date())}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    toast.success('Da xuat roster lop hoc');
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner message="Dang tai chi tiet lop hoc..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (!classData) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-2xl font-semibold text-slate-950">Khong tim thay lop hoc</div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          {loadError || 'Lop hoc nay khong con ton tai hoac admin khong co du lieu de hien thi.'}
        </p>
        <Link
          href="/admin/classes"
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai danh sach lop
        </Link>
      </div>
    );
  }

  const homeroomNames =
    classData.teachers && classData.teachers.length > 0
      ? classData.teachers.map((teacher) => teacher.name || teacher.email || `Teacher #${teacher.id}`).join(', ')
      : classData.teacher_name || 'Chua gan GVCN';

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/admin/classes"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-700 hover:text-cyan-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lai danh sach lop
            </Link>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Class detail
            </p>
            <h1 data-testid="admin-class-detail-heading" className="mt-3 text-3xl font-semibold text-slate-950">
              {classData.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Theo doi si so, GVCN, tong diem va roster hoc vien ngay tai mot man hinh.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={exportClassRoster}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Xuat roster CSV
            </button>
            <Link
              href={`/admin/classes/${classId}/edit`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800"
            >
              <Edit3 className="h-4 w-4" />
              Chinh sua lop
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Hoc vien trong lop" value={formatMetric(metrics.totalStudents)} tone="cyan" />
          <StatCard icon={<BookOpenCheck className="h-5 w-5" />} label="Tong luot hoat dong" value={formatMetric(metrics.totalActivities)} tone="emerald" />
          <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Tong diem tich luy" value={formatMetric(metrics.totalPoints)} tone="violet" />
          <StatCard icon={<Trophy className="h-5 w-5" />} label="Diem trung binh" value={formatMetric(metrics.averagePoints, 1)} tone="amber" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Thong tin lop</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoCard label="Ten lop" value={classData.name} />
            <InfoCard label="Khoa / khoi" value={classData.grade || '-'} />
            <InfoCard label="GVCN / phu trach" value={homeroomNames} />
            <InfoCard
              label="Ngay tao"
              value={classData.created_at ? formatVietnamDateTime(classData.created_at, 'date') : '-'}
            />
          </div>
          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Mo ta / ghi chu
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-700">
              {classData.description || 'Chua co mo ta bo sung cho lop hoc nay.'}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <School2 className="h-4 w-4 text-cyan-700" />
            Snapshot van hanh
          </div>
          <div className="mt-5 space-y-4">
            <SnapshotRow
              label="Hoc vien da co diem"
              value={`${students.filter((student) => Number(student.total_points || 0) > 0).length}/${students.length || 0}`}
            />
            <SnapshotRow label="Khen thuong da ghi nhan" value={formatMetric(metrics.awardCount)} />
            <SnapshotRow
              label="Luot diem danh"
              value={formatMetric(summary?.attended_count ?? students.reduce((sum, student) => sum + Number(student.attended_count || 0), 0))}
            />
            <SnapshotRow
              label="Trang thai du lieu"
              value={loadError ? 'Can kiem tra' : 'San sang'}
              accent={loadError ? 'text-rose-700' : 'text-emerald-700'}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Roster hoc vien</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mo chi tiet hoc vien de doi soat diem, hoat dong va ghi chu.
            </p>
          </div>
          <div className="text-sm text-slate-500">Dang hien thi {students.length} hoc vien</div>
        </div>

        {students.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            Chua co hoc vien nao trong lop nay.
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 lg:hidden">
              {students.map((student) => (
                <article key={student.id} className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-950">{toStudentName(student)}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {student.student_code || 'Chua co ma hoc vien'}
                      </div>
                    </div>
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50"
                    >
                      Chi tiet
                    </Link>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <MiniMetric label="Hoat dong" value={formatMetric(Number(student.activity_count || 0))} />
                    <MiniMetric label="Co mat" value={formatMetric(Number(student.attended_count || 0))} />
                    <MiniMetric label="Tong diem" value={formatMetric(Number(student.total_points || 0))} />
                    <MiniMetric label="Khen thuong" value={formatMetric(Number(student.award_count || 0))} />
                  </div>
                  <div className="mt-4 text-sm text-slate-600">{student.email || '-'}</div>
                </article>
              ))}
            </div>

            <div className="mt-6 hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Hoc vien</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Ma</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Hoat dong</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Co mat</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Tong diem</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Tac vu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-950">{toStudentName(student)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Tao tai khoan {student.created_at ? formatVietnamDateTime(student.created_at, 'date') : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{student.student_code || '-'}</td>
                      <td className="px-4 py-4 text-slate-600">{student.email || '-'}</td>
                      <td className="px-4 py-4 text-right font-medium text-slate-900">
                        {formatMetric(Number(student.activity_count || 0))}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-900">
                        {formatMetric(Number(student.attended_count || 0))}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-cyan-800">
                        {formatMetric(Number(student.total_points || 0))}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="text-sm font-medium text-cyan-700 hover:text-cyan-800"
                        >
                          Xem chi tiet
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-slate-200 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold text-slate-950 ${accent || ''}`}>{value}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}
