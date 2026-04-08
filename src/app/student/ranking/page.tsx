'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from '@/lib/toast';

interface RankingEntry {
  rank: number;
  student_id: number;
  student_name: string;
  class_name: string;
  total_points: number;
  total_activities: number;
  excellent_count: number;
  good_count: number;
  is_current_user: boolean;
}

interface RankingResponse {
  data: RankingEntry[];
  total: number;
  user_rank: number;
  user_points: number;
}

export default function StudentRankingPage() {
  const { user, loading: authLoading } = useAuth();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [perPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading && user) {
      fetchRankings();
    }
  }, [user, authLoading, classFilter, currentPage]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(perPage),
        order: 'desc',
      });

      if (classFilter !== 'all') {
        params.append('class_id', classFilter);
      }

      const res = await fetch(`/api/scoreboard?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch rankings');

      const data: RankingResponse = await res.json();

      // Add current user flag
      const enrichedData = data.data.map((entry: any) => ({
        ...entry,
        is_current_user: user?.id === entry.student_id,
      }));

      setRankings(enrichedData);
      setUserRank(data.user_rank || null);
      setUserPoints(data.user_points || 0);
    } catch (error: any) {
      console.error('Error fetching rankings:', error);
      toast.error('Không thể tải bảng xếp hạng');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 data-testid="ranking-heading" className="text-4xl font-bold text-gray-900 mb-2">
            🏆 Bảng Xếp Hạng
          </h1>
          <p className="text-gray-600">Xem xếp hạng điểm của các học sinh</p>
        </div>

        {/* User Stats Card */}
        {userRank && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Xếp hạng của bạn</p>
                <p className="text-3xl font-bold text-blue-600">
                  #{userRank}
                  <span className="text-lg text-gray-500 ml-3">{userPoints} điểm</span>
                </p>
              </div>
              <div className="text-5xl">
                {userRank === 1 ? '🥇' : userRank === 2 ? '🥈' : userRank === 3 ? '🥉' : '⭐'}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <label className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">Lọc theo lớp:</span>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả lớp</option>
              <option value="lop-10a">Lớp 10A</option>
              <option value="lop-10b">Lớp 10B</option>
              <option value="lop-11a">Lớp 11A</option>
              <option value="lop-11b">Lớp 11B</option>
              <option value="lop-12a">Lớp 12A</option>
              <option value="lop-12b">Lớp 12B</option>
            </select>
          </label>
        </div>

        {/* Rankings Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold w-24">Hạng</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Tên Học Sinh</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Lớp</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Tổng Điểm</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Hoạt Động</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Xuất Sắc</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Tốt</th>
                </tr>
              </thead>
              <tbody>
                {rankings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Không có dữ liệu xếp hạng
                    </td>
                  </tr>
                ) : (
                  rankings.map((entry) => (
                    <tr
                      key={entry.student_id}
                      className={`border-b transition-colors ${
                        entry.is_current_user ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 text-center font-bold text-lg">
                        <div className="flex items-center justify-center gap-2">
                          {entry.rank === 1 && '🥇'}
                          {entry.rank === 2 && '🥈'}
                          {entry.rank === 3 && '🥉'}
                          {entry.rank > 3 && entry.rank <= 10 && '⭐'}
                          {entry.rank > 10 && ''}
                          <span className={entry.rank <= 3 ? 'text-blue-600' : ''}>
                            #{entry.rank}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {entry.student_name}
                            {entry.is_current_user && (
                              <span className="ml-2 inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                Bạn
                              </span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{entry.class_name || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                          {entry.total_points}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-700">
                        {entry.total_activities}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                          {entry.excellent_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {entry.good_count}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {rankings.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                ← Trang trước
              </button>
              <span className="text-gray-700 font-medium">Trang {currentPage}</span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={rankings.length < perPage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                Trang tiếp →
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Cách tính điểm</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Mỗi hoạt động bạn tham gia sẽ được tính điểm dựa trên loại hoạt động</li>
            <li>• Nếu đạt &quot;Xuất Sắc&quot; sẽ được nhân thêm 1.5x điểm</li>
            <li>• Nếu đạt &quot;Tốt&quot; sẽ được nhân thêm 1.2x điểm</li>
            <li>• Hoạt động cấp độ cao hơn sẽ được nhân thêm điểm</li>
            <li>• Điểm được cộng dồn, không có điểm âm</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
