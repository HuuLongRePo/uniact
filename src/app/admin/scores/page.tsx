'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Trophy, Search, Download, RefreshCw, Edit2, Award } from 'lucide-react';
import toast from 'react-hot-toast';

interface StudentScore {
  user_id: number;
  name: string;
  email: string;
  class_id: number | null;
  class_name: string | null;
  total_points: number;
  activities_count: number;
  excellent_count: number;
  good_count: number;
  average_count: number;
  participated_count: number;
  awards_count: number;
  rank: number;
}

interface ClassOption {
  id: number;
  name: string;
}

export default function AdminStudentScoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isRecalculateConfirmOpen, setIsRecalculateConfirmOpen] = useState(false);
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [filteredScores, setFilteredScores] = useState<StudentScore[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [minPoints, setMinPoints] = useState<string>('');

  const [classes, setClasses] = useState<ClassOption[]>([]);

  const filterScores = useEffectEvent(() => {
    let filtered = [...scores];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) => s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
      );
    }

    if (classFilter && classFilter !== 'all') {
      filtered = filtered.filter((s) => s.class_id?.toString() === classFilter);
    }

    if (minPoints) {
      const min = parseFloat(minPoints);
      if (!isNaN(min)) {
        filtered = filtered.filter((s) => s.total_points >= min);
      }
    }

    setFilteredScores(filtered);
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    filterScores();
  }, [scores, searchTerm, classFilter, minPoints, filterScores]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scoresRes, classesRes] = await Promise.all([
        fetch('/api/admin/scores'),
        fetch('/api/classes'),
      ]);

      if (!scoresRes.ok) throw new Error('Failed to fetch scores');

      const scoresData = await scoresRes.json();
      setScores(scoresData.scores || []);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.classes || []);
      }
    } catch (_error) {
      toast.error('Không thể tải dữ liệu điểm');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      const res = await fetch('/api/admin/scores/recalculate', {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Recalculation failed');

      const data = await res.json();
      toast.success(`Đã tính lại điểm cho ${data.updated} sinh viên`);
      fetchData();
    } catch (_error) {
      toast.error('Tính lại điểm thất bại');
    }
  };

  const handleExport = () => {
    const csv = [
      [
        'Hạng',
        'Tên',
        'Email',
        'Lớp',
        'Tổng điểm',
        'Hoạt động',
        'Xuất sắc',
        'Tốt',
        'Trung bình',
        'Tham gia',
        'Giải thưởng',
      ].join(','),
      ...filteredScores.map((s) =>
        [
          s.rank,
          s.name,
          s.email,
          s.class_name || '-',
          s.total_points,
          s.activities_count,
          s.excellent_count,
          s.good_count,
          s.average_count,
          s.participated_count,
          s.awards_count,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-scores-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Đã export ${filteredScores.length} sinh viên`);
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  const stats = {
    totalStudents: scores.length,
    avgPoints:
      scores.length > 0
        ? (scores.reduce((sum, s) => sum + s.total_points, 0) / scores.length).toFixed(1)
        : 0,
    excellentCount: scores.filter((s) => s.total_points >= 500).length,
    awardedCount: scores.filter((s) => s.awards_count > 0).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Bảng Điểm Sinh Viên</h1>
          <p className="text-gray-600 mt-2">Quản lý và xem điểm rèn luyện của tất cả sinh viên</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng sinh viên</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalStudents}</p>
              </div>
              <Trophy className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Điểm trung bình</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.avgPoints}</p>
              </div>
              <Award className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Xuất sắc (≥500)</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{stats.excellentCount}</p>
              </div>
              <Trophy className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Có giải thưởng</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.awardedCount}</p>
              </div>
              <Award className="w-12 h-12 text-yellow-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Tìm kiếm
              </label>
              <input
                type="text"
                placeholder="Tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lớp</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Điểm tối thiểu</label>
              <input
                type="number"
                placeholder="0"
                value={minPoints}
                onChange={(e) => setMinPoints(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setClassFilter('all');
                  setMinPoints('');
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsRecalculateConfirmOpen(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tính lại điểm
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Scores Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hạng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sinh viên
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lớp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tổng điểm
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hoạt động
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Xuất sắc
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tốt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Giải thưởng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredScores.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredScores.map((score) => (
                    <tr key={score.user_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            score.rank === 1
                              ? 'bg-yellow-100 text-yellow-700'
                              : score.rank === 2
                                ? 'bg-gray-100 text-gray-700'
                                : score.rank === 3
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {score.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{score.name}</div>
                        <div className="text-sm text-gray-500">{score.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{score.class_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-blue-600 text-lg">
                          {score.total_points}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{score.activities_count}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          {score.excellent_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          {score.good_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          {score.awards_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/admin/scores/${score.user_id}/adjust`)}
                          className="flex items-center text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Hiển thị {filteredScores.length} / {scores.length} sinh viên
            </p>
          </div>
        </div>

        <ConfirmDialog
          isOpen={isRecalculateConfirmOpen}
          title="Tính lại điểm toàn bộ sinh viên"
          message="Bạn có chắc chắn muốn tính lại điểm cho tất cả sinh viên không? Quá trình này có thể mất vài phút."
          confirmText="Tính lại điểm"
          cancelText="Hủy"
          variant="warning"
          onCancel={() => setIsRecalculateConfirmOpen(false)}
          onConfirm={async () => {
            await handleRecalculate();
            setIsRecalculateConfirmOpen(false);
          }}
        />
      </div>
    </div>
  );
}
