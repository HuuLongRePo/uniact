'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Download, FileSpreadsheet, Filter, RefreshCw, Search, Award } from 'lucide-react';

interface StudentScore {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  class_name: string;
  total_points: number;
  activities_count: number;
  excellent_count: number;
  good_count: number;
  average_count: number;
  awards_count: number;
  rank: number;
}

interface ClassOption {
  id: number;
  name: string;
}

export default function ExportScoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [scores, setScores] = useState<StudentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [minPoints, setMinPoints] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (response.ok) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Fetch classes error:', error);
    }
  }, []);

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (classFilter) params.append('class_id', classFilter);
      if (minPoints) params.append('min_points', minPoints);

      const response = await fetch(`/api/admin/scores?${params}`);
      const data = await response.json();

      if (response.ok) {
        setScores(data.scores || []);
      } else {
        toast.error(data.error || 'Không thể tải điểm');
      }
    } catch (error) {
      console.error('Fetch scores error:', error);
      toast.error('Lỗi khi tải điểm');
    } finally {
      setLoading(false);
    }
  }, [classFilter, minPoints, searchTerm]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      void fetchClasses();
      void fetchScores();
    }
  }, [authLoading, fetchClasses, fetchScores, router, user]);

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (classFilter) params.append('class_id', classFilter);
      if (minPoints) params.append('min_points', minPoints);
      params.append('export', format);

      const response = await fetch(`/api/admin/scores?${params}`);

      if (!response.ok) {
        toast.error('Export thất bại');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scores-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Đã tải xuống file ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi export');
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setClassFilter('');
    setMinPoints('');
  };

  const filteredScores = scores.filter((score) => {
    if (
      searchTerm &&
      !score.student_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !score.student_email.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-8 h-8" />
          Xuất Bảng Điểm
        </h1>
        <p className="text-gray-600">Xem và xuất điểm rèn luyện của sinh viên</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold">Bộ Lọc</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              <Search className="inline w-4 h-4 mr-1" />
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tên hoặc email..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Lớp</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Tất cả lớp</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Điểm tối thiểu</label>
            <input
              type="number"
              value={minPoints}
              onChange={(e) => setMinPoints(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={fetchScores}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Áp dụng
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow p-6">
          <div className="text-sm opacity-90">Tổng sinh viên</div>
          <div className="text-3xl font-bold mt-1">{filteredScores.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow p-6">
          <div className="text-sm opacity-90">Tổng điểm TB</div>
          <div className="text-3xl font-bold mt-1">
            {filteredScores.length > 0
              ? (
                  filteredScores.reduce((sum, s) => sum + s.total_points, 0) / filteredScores.length
                ).toFixed(1)
              : 0}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow p-6">
          <div className="text-sm opacity-90">Xuất sắc</div>
          <div className="text-3xl font-bold mt-1">
            {filteredScores.reduce((sum, s) => sum + s.excellent_count, 0)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow p-6">
          <div className="text-sm opacity-90">Giải thưởng</div>
          <div className="text-3xl font-bold mt-1">
            {filteredScores.reduce((sum, s) => sum + s.awards_count, 0)}
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold">Xuất Dữ Liệu</h2>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || filteredScores.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exporting ? 'Đang xuất...' : 'Xuất CSV'}
            </button>

            <button
              onClick={fetchScores}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Scores Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredScores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                filteredScores.map((score, index) => (
                  <tr key={score.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {index < 3 ? (
                          <Award
                            className={`w-5 h-5 ${
                              index === 0
                                ? 'text-yellow-500'
                                : index === 1
                                  ? 'text-gray-400'
                                  : 'text-orange-600'
                            }`}
                          />
                        ) : null}
                        <span className="font-medium">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{score.student_name}</div>
                      <div className="text-sm text-gray-500">{score.student_email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{score.class_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {score.total_points}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{score.activities_count}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {score.excellent_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {score.good_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {score.awards_count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredScores.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center">
          Hiển thị {filteredScores.length} sinh viên
        </div>
      )}
    </div>
  );
}
