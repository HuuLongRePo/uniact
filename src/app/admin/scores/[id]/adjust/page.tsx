'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ArrowLeft, Save, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdjustScorePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [adjustmentType, setAdjustmentType] = useState<'bonus' | 'penalty'>('bonus');
  const [points, setPoints] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user && userId) {
      fetchStudent();
    }
  }, [user, authLoading, userId, router]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error('Không thể tải thông tin học viên');
      const data = await res.json();
      setStudent(data);
    } catch (error) {
      toast.error('Không thể tải thông tin sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pointsValue = parseFloat(points);
    if (isNaN(pointsValue) || pointsValue <= 0) {
      toast.error('Điểm phải là số dương');
      return;
    }

    if (!reason.trim()) {
      toast.error('Vui lòng nhập lý do điều chỉnh');
      return;
    }

    setSubmitting(true);
    try {
      const finalPoints = adjustmentType === 'bonus' ? pointsValue : -pointsValue;

      const res = await fetch(`/api/admin/scores/${userId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: finalPoints,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) throw new Error('Adjustment failed');

      toast.success('Đã điều chỉnh điểm');
      router.push('/admin/scores');
    } catch (error: any) {
      toast.error(error.message || 'Điều chỉnh thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-center text-gray-600">Không tìm thấy sinh viên</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/admin/scores')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </button>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Điều chỉnh điểm</h1>

          <div className="mb-6 pb-6 border-b">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sinh viên</label>
            <p className="text-lg font-semibold text-gray-900">{student.name}</p>
            <p className="text-sm text-gray-600">{student.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại điều chỉnh
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('bonus')}
                  className={`flex items-center justify-center px-4 py-3 border-2 rounded-lg ${
                    adjustmentType === 'bonus'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Cộng điểm
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('penalty')}
                  className={`flex items-center justify-center px-4 py-3 border-2 rounded-lg ${
                    adjustmentType === 'penalty'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Minus className="w-5 h-5 mr-2" />
                  Trừ điểm
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điểm <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="Nhập số điểm..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do điều chỉnh..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/admin/scores')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                <Save className="w-5 h-5 mr-2" />
                {submitting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
