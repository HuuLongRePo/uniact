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

export default function AdminBiometricsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentBiometricRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, ready_count: 0, missing_count: 0 });
  const [error, setError] = useState('');
  const [updatingStudentId, setUpdatingStudentId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, router, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/biometrics/students');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Không thể tải biometric readiness');
      }
      setStudents(data?.data?.students || data?.students || []);
      setSummary(data?.data?.summary || data?.summary || { total: 0, ready_count: 0, missing_count: 0 });
    } catch (fetchError) {
      console.error('Admin biometrics fetch error:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải biometric readiness');
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
        throw new Error(data?.error || data?.message || 'Không thể cập nhật enrollment');
      }
      toast.success('Đã cập nhật enrollment mẫu cho học viên');
      await fetchData();
    } catch (updateError) {
      console.error('Admin biometrics enrollment update error:', updateError);
      toast.error(updateError instanceof Error ? updateError.message : 'Không thể cập nhật enrollment');
    } finally {
      setUpdatingStudentId(null);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Biometric readiness theo học viên</h1>
          <p className="mt-2 text-sm text-gray-600">
            Theo dõi học viên nào đã sẵn sàng cho enrollment, training và face attendance.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm text-gray-600">Tổng học viên</div>
            <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm text-gray-600">Sẵn sàng face attendance</div>
            <div className="text-3xl font-bold text-green-600">{summary.ready_count}</div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm text-gray-600">Chưa sẵn sàng</div>
            <div className="text-3xl font-bold text-amber-600">{summary.missing_count}</div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Học viên</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Lớp</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Enrollment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Training</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sample ảnh</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Face attendance</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Blocker / note</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-gray-500">{student.student_code} • {student.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{student.class_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-amber-700">{student.biometric_readiness.enrollment_status}</td>
                  <td className="px-4 py-3 text-sm text-amber-700">
                    <div>{student.biometric_readiness.training_status}</div>
                    {student.biometric_readiness.training_version ? (
                      <div className="text-xs text-gray-500">
                        v{student.biometric_readiness.training_version}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {student.biometric_readiness.sample_image_count || 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={student.biometric_readiness.face_attendance_ready ? 'text-green-600 font-medium' : 'text-amber-700 font-medium'}>
                      {student.biometric_readiness.face_attendance_ready ? 'ready' : 'blocked'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{student.biometric_readiness.blocker || '-'}</div>
                    {student.biometric_readiness.notes ? (
                      <div className="text-xs text-gray-500 mt-1">{student.biometric_readiness.notes}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={() => void markEnrollmentCaptured(student.id)}
                      disabled={updatingStudentId === student.id}
                      className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {updatingStudentId === student.id ? 'Đang cập nhật...' : 'Ghi nhận thêm ảnh mẫu'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
