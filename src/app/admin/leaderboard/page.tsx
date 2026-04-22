'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Trophy, Medal, Award, Download, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  email: string;
  class_name: string | null;
  total_points: number;
  activities_count: number;
}

export default function AdminLeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [limit, setLimit] = useState(20);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportColumns, setExportColumns] = useState({
    rank: true,
    name: true,
    email: true,
    class_name: true,
    total_points: true,
    activities_count: true,
  });

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/leaderboard?limit=${limit}`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      void fetchLeaderboard();
    }
  }, [authLoading, fetchLeaderboard, router, user]);

  const exportToCSV = () => {
    if (leaderboard.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const columnMap: Record<
      string,
      { label: string; getValue: (entry: LeaderboardEntry) => string | number }
    > = {
      rank: { label: 'Hạng', getValue: (e) => e.rank },
      name: { label: 'Họ tên', getValue: (e) => e.name },
      email: { label: 'Email', getValue: (e) => e.email },
      class_name: { label: 'Lớp', getValue: (e) => e.class_name || 'N/A' },
      total_points: { label: 'Tổng điểm', getValue: (e) => e.total_points },
      activities_count: { label: 'Số hoạt động', getValue: (e) => e.activities_count },
    };

    const selectedColumns = Object.keys(exportColumns).filter(
      (k) => exportColumns[k as keyof typeof exportColumns]
    );

    if (selectedColumns.length === 0) {
      toast.error('Vui lòng chọn ít nhất một cột để xuất');
      return;
    }

    const headers = selectedColumns.map((col) => columnMap[col].label);
    const rows = leaderboard.map((entry) =>
      selectedColumns.map((col) => columnMap[col].getValue(entry))
    );

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bang-xep-hang-top-${limit}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(`Đã xuất Top ${limit} học viên!`);
    setShowExportDialog(false);
  };

  const exportToExcel = () => {
    // For now, export as CSV with .xls extension (Excel can open it)
    if (leaderboard.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const columnMap: Record<
      string,
      { label: string; getValue: (entry: LeaderboardEntry) => string | number }
    > = {
      rank: { label: 'Hạng', getValue: (e) => e.rank },
      name: { label: 'Họ tên', getValue: (e) => e.name },
      email: { label: 'Email', getValue: (e) => e.email },
      class_name: { label: 'Lớp', getValue: (e) => e.class_name || 'N/A' },
      total_points: { label: 'Tổng điểm', getValue: (e) => e.total_points },
      activities_count: { label: 'Số hoạt động', getValue: (e) => e.activities_count },
    };

    const selectedColumns = Object.keys(exportColumns).filter(
      (k) => exportColumns[k as keyof typeof exportColumns]
    );

    if (selectedColumns.length === 0) {
      toast.error('Vui lòng chọn ít nhất một cột để xuất');
      return;
    }

    const headers = selectedColumns.map((col) => columnMap[col].label);
    const rows = leaderboard.map((entry) =>
      selectedColumns.map((col) => columnMap[col].getValue(entry))
    );

    const csvContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bang-xep-hang-top-${limit}-${new Date().toISOString().split('T')[0]}.xls`;
    link.click();

    toast.success(`Đã xuất Top ${limit} sang Excel!`);
    setShowExportDialog(false);
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600" />
              Bảng Xếp Hạng
            </h1>
            <p className="text-gray-600 mt-1">Xếp hạng học viên theo điểm tích lũy</p>
          </div>
          <button
            onClick={() => setShowExportDialog(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
          >
            <Download className="w-5 h-5" />
            Xuất File
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700">Hiển thị:</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>

          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  entry.rank <= 3
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200'
                    : 'bg-gray-50'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                    entry.rank === 1
                      ? 'bg-yellow-400 text-white'
                      : entry.rank === 2
                        ? 'bg-gray-300 text-white'
                        : entry.rank === 3
                          ? 'bg-orange-400 text-white'
                          : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {entry.rank === 1 ? (
                    <Trophy className="w-6 h-6" />
                  ) : entry.rank === 2 ? (
                    <Medal className="w-6 h-6" />
                  ) : entry.rank === 3 ? (
                    <Award className="w-6 h-6" />
                  ) : (
                    entry.rank
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{entry.name}</p>
                  <p className="text-sm text-gray-600">
                    {entry.class_name || 'N/A'} • {entry.activities_count} hoạt động
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{entry.total_points}</p>
                  <p className="text-xs text-gray-500">điểm</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Dialog */}
        {showExportDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowExportDialog(false)}
          >
            <div
              className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold">Xuất Bảng Xếp Hạng</h3>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">Chọn các cột muốn xuất:</p>
                <div className="space-y-2">
                  {[
                    { key: 'rank', label: 'Hạng' },
                    { key: 'name', label: 'Họ tên' },
                    { key: 'email', label: 'Email' },
                    { key: 'class_name', label: 'Lớp' },
                    { key: 'total_points', label: 'Tổng điểm' },
                    { key: 'activities_count', label: 'Số hoạt động' },
                  ].map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={exportColumns[col.key as keyof typeof exportColumns]}
                        onChange={(e) =>
                          setExportColumns({ ...exportColumns, [col.key]: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  Sẽ xuất <strong>Top {limit}</strong> học viên với{' '}
                  <strong>{Object.values(exportColumns).filter(Boolean).length}</strong> cột đã chọn
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  CSV
                </button>
                <button
                  onClick={exportToExcel}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Excel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
