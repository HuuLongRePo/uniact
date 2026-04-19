'use client';

import { useEffect, useState } from 'react';
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
    face_attendance_ready: boolean;
    blocker: string;
  };
};

export default function AdminBiometricsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentBiometricRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, ready_count: 0, missing_count: 0 });
  const [error, setError] = useState('');

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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Face attendance</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Blocker</th>
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
                  <td className="px-4 py-3 text-sm text-amber-700">{student.biometric_readiness.training_status}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={student.biometric_readiness.face_attendance_ready ? 'text-green-600 font-medium' : 'text-amber-700 font-medium'}>
                      {student.biometric_readiness.face_attendance_ready ? 'ready' : 'blocked'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.biometric_readiness.blocker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
