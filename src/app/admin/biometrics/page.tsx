'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

type StudentBiometricRow = {
  id: number;
  name: string;
  email: string;
  student_code: string;
  class_name: string;
  biometric_readiness: {
    runtime_enabled: boolean;
    enrollment_status: string;
    training_status: string;
    sample_image_count?: number;
    notes?: string | null;
    training_version?: string | null;
    last_trained_at?: string | null;
    face_attendance_ready: boolean;
    blocker: string | null;
  };
};

type Summary = {
  total: number;
  ready_count: number;
  missing_count: number;
};

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`mt-3 text-3xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

export default function AdminBiometricsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentBiometricRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    ready_count: 0,
    missing_count: 0,
  });
  const [error, setError] = useState('');
  const [updatingStudentId, setUpdatingStudentId] = useState<number | null>(null);
  const [trainingStudentId, setTrainingStudentId] = useState<number | null>(null);
  const userId = Number(user?.id || 0);
  const userRole = user?.role;
  const canManageBiometric = userRole === 'admin' || userRole === 'teacher';

  useEffect(() => {
    if (!authLoading && (!userId || !canManageBiometric)) {
      router.push('/login');
      return;
    }

    if (userId && canManageBiometric) {
      void fetchData();
    }
  }, [authLoading, canManageBiometric, router, userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/biometrics/students');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Khong the tai biometric readiness');
      }

      setStudents(data?.data?.students || data?.students || []);
      setSummary(
        data?.data?.summary || data?.summary || { total: 0, ready_count: 0, missing_count: 0 }
      );
    } catch (fetchError) {
      console.error('Admin biometrics fetch error:', fetchError);
      setError(
        fetchError instanceof Error ? fetchError.message : 'Khong the tai biometric readiness'
      );
    } finally {
      setLoading(false);
    }
  };

  const markEnrollmentCaptured = async (studentId: number) => {
    try {
      setUpdatingStudentId(studentId);
      const res = await fetch(`/api/admin/biometrics/students/${studentId}/enrollment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_image_count_delta: 1 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Khong the cap nhat enrollment');
      }

      toast.success('Da cap nhat enrollment mau cho hoc vien');
      await fetchData();
    } catch (updateError) {
      console.error('Admin biometrics enrollment update error:', updateError);
      toast.error(
        updateError instanceof Error ? updateError.message : 'Khong the cap nhat enrollment'
      );
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const updateTrainingStatus = async (
    studentId: number,
    trainingStatus: 'pending' | 'trained' | 'failed'
  ) => {
    try {
      setTrainingStudentId(studentId);
      const res = await fetch(`/api/admin/biometrics/students/${studentId}/training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_status: trainingStatus,
          training_version: trainingStatus === 'trained' ? '1' : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Khong the cap nhat training');
      }

      toast.success(
        trainingStatus === 'trained'
          ? 'Da ghi nhan hoc vien train thanh cong'
          : trainingStatus === 'failed'
            ? 'Da ghi nhan training that bai'
            : 'Da chuyen hoc vien sang trang thai cho training'
      );
      await fetchData();
    } catch (updateError) {
      console.error('Admin biometrics training update error:', updateError);
      toast.error(
        updateError instanceof Error ? updateError.message : 'Khong the cap nhat training'
      );
    } finally {
      setTrainingStudentId(null);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Biometric readiness
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              Biometric readiness theo hoc vien
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Theo doi hoc vien nao da san sang cho enrollment, training va face attendance. Man
              nay giup admin va teacher scope kiem tra tinh san sang tung hoc vien truoc khi mo
              face attendance.
            </p>
          </div>
        </section>

        {error ? (
          <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {error}
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard label="Tong hoc vien" value={summary.total} accent="text-slate-950" />
          <SummaryCard
            label="San sang face attendance"
            value={summary.ready_count}
            accent="text-emerald-600"
          />
          <SummaryCard
            label="Chua san sang"
            value={summary.missing_count}
            accent="text-amber-600"
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Hoc vien
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Lop</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Enrollment
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Training
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Sample anh
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Face attendance
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Blocker / note
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                    Hanh dong
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student) => (
                  <tr key={student.id} className="align-top">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-slate-500">
                        {student.student_code} | {student.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{student.class_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-amber-700">
                      {student.biometric_readiness.enrollment_status}
                    </td>
                    <td className="px-4 py-3 text-sm text-amber-700">
                      <div>{student.biometric_readiness.training_status}</div>
                      {student.biometric_readiness.training_version ? (
                        <div className="text-xs text-slate-500">
                          v{student.biometric_readiness.training_version}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {student.biometric_readiness.sample_image_count || 0}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          student.biometric_readiness.face_attendance_ready
                            ? 'font-medium text-emerald-600'
                            : 'font-medium text-amber-700'
                        }
                      >
                        {student.biometric_readiness.face_attendance_ready ? 'ready' : 'blocked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div>{student.biometric_readiness.blocker || '-'}</div>
                      {student.biometric_readiness.notes ? (
                        <div className="mt-1 text-xs text-slate-500">
                          {student.biometric_readiness.notes}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="flex min-w-[13rem] flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void markEnrollmentCaptured(student.id)}
                          disabled={
                            updatingStudentId === student.id || trainingStudentId === student.id
                          }
                          className="rounded-xl bg-blue-600 px-3 py-2 text-white transition hover:bg-blue-700 disabled:bg-slate-400"
                        >
                          {updatingStudentId === student.id
                            ? 'Dang cap nhat...'
                            : 'Ghi nhan them anh mau'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateTrainingStatus(student.id, 'pending')}
                          disabled={
                            trainingStudentId === student.id || updatingStudentId === student.id
                          }
                          className="rounded-xl bg-amber-500 px-3 py-2 text-white transition hover:bg-amber-600 disabled:bg-slate-400"
                        >
                          {trainingStudentId === student.id ? 'Dang cap nhat...' : 'Cho training'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateTrainingStatus(student.id, 'trained')}
                          disabled={
                            trainingStudentId === student.id || updatingStudentId === student.id
                          }
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-white transition hover:bg-emerald-700 disabled:bg-slate-400"
                        >
                          {trainingStudentId === student.id
                            ? 'Dang cap nhat...'
                            : 'Danh dau train xong'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateTrainingStatus(student.id, 'failed')}
                          disabled={
                            trainingStudentId === student.id || updatingStudentId === student.id
                          }
                          className="rounded-xl bg-rose-600 px-3 py-2 text-white transition hover:bg-rose-700 disabled:bg-slate-400"
                        >
                          {trainingStudentId === student.id
                            ? 'Dang cap nhat...'
                            : 'Danh dau train loi'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
