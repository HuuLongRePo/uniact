'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { TrendingUp, Download, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toVietnamDatetimeLocalValue } from '@/lib/timezone';

interface RankingRecord {
  rank: number;
  student_id: number;
  student_name: string;
  student_email: string;
  class_name: string;
  total_points: number;
  activity_count: number;
  award_count: number;
  avg_points: number;
}

interface RankingsResponse {
  data: RankingRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    class_id: number | null;
    org_level_id: number | null;
    date_from: string | null;
    date_to: string | null;
    sort_by: string;
  };
}

export default function ScoreboardPage() {
  const [rankings, setRankings] = useState<RankingRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [orgLevels, setOrgLevels] = useState<Array<{ id: number; name: string }>>([]);

  const [filters, setFilters] = useState({
    class_id: '',
    org_level_id: '',
    date_from: '',
    date_to: '',
    limit: '25',
    sort_by: 'total_points',
  });

  // Fetch rankings data
  const fetchRankings = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', filters.limit);
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.org_level_id) params.append('org_level_id', filters.org_level_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      params.append('sort_by', filters.sort_by);

      const res = await fetch(`/api/admin/rankings?${params}`);
      const data: RankingsResponse = await res.json();

      if (res.ok) {
        setRankings(data.data);
        setPagination(data.pagination);
      } else {
        toast.error('Lỗi khi tải bảng xếp hạng');
      }
    } catch (error) {
      console.error('Fetch rankings error:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes and levels
  const fetchFiltersData = async () => {
    try {
      const [classesRes, levelsRes] = await Promise.all([
        fetch('/api/admin/classes'),
        fetch('/api/admin/organization-levels'),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.data || []);
      }

      if (levelsRes.ok) {
        const levelsData = await levelsRes.json();
        setOrgLevels(levelsData.data || []);
      }
    } catch (error) {
      console.error('Fetch filters error:', error);
    }
  };

  useEffect(() => {
    fetchRankings(1);
    fetchFiltersData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    fetchRankings(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setFilters({
      class_id: '',
      org_level_id: '',
      date_from: '',
      date_to: '',
      limit: '25',
      sort_by: 'total_points',
    });
    fetchRankings(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchRankings(newPage);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);

      // Get all data (no pagination)
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '10000');
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.org_level_id) params.append('org_level_id', filters.org_level_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      params.append('sort_by', filters.sort_by);

      const res = await fetch(`/api/admin/rankings?${params}`);
      const data: RankingsResponse = await res.json();

      if (!res.ok) {
        toast.error('Lỗi khi xuất dữ liệu');
        return;
      }

      // Convert to CSV
      const headers = [
        'Xếp Hạng',
        'Tên Học Viên',
        'Email',
        'Lớp',
        'Tổng Điểm',
        'Hoạt Động',
        'Khen Thưởng',
        'ĐTB/HĐ',
      ];
      const rows = data.data.map((r) => [
        r.rank,
        r.student_name,
        r.student_email,
        r.class_name,
        r.total_points,
        r.activity_count,
        r.award_count,
        r.avg_points,
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach((row) => {
        csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
      });

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bang-xep-hang-${toVietnamDatetimeLocalValue(new Date()).slice(0, 10)}.csv`;
      link.click();

      toast.success('Xuất CSV thành công!');
    } catch (error) {
      console.error('Export CSV error:', error);
      toast.error('Lỗi khi xuất CSV');
    } finally {
      setExporting(false);
    }
  };

  // Export to Excel (uses external service)
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      // Get all data
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '10000');
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.org_level_id) params.append('org_level_id', filters.org_level_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      params.append('sort_by', filters.sort_by);

      const res = await fetch(`/api/admin/rankings?${params}`);
      const data: RankingsResponse = await res.json();

      if (!res.ok) {
        toast.error('Lỗi khi xuất dữ liệu');
        return;
      }

      // For now, export as CSV with .xlsx detection
      // In production, use a library like xlsx to create proper Excel files
      const headers = [
        'Xếp Hạng',
        'Tên Học Viên',
        'Email',
        'Lớp',
        'Tổng Điểm',
        'Hoạt Động',
        'Khen Thưởng',
        'ĐTB/HĐ',
      ];
      const rows = data.data.map((r) => [
        r.rank,
        r.student_name,
        r.student_email,
        r.class_name,
        r.total_points,
        r.activity_count,
        r.award_count,
        r.avg_points,
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach((row) => {
        csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
      });

      // Download as Excel
      const blob = new Blob([csv], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bang-xep-hang-${toVietnamDatetimeLocalValue(new Date()).slice(0, 10)}.xlsx`;
      link.click();

      toast.success('Xuất Excel thành công!');
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error('Lỗi khi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters =
    filters.class_id || filters.org_level_id || filters.date_from || filters.date_to;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Bảng Xếp Hạng Sinh Viên
        </h1>
        <p className="text-gray-600">Xem xếp hạng học viên theo điểm tích lũy</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${
                showFilters
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-5 h-5" />
              Bộ Lọc
              {hasActiveFilters && (
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full ml-1">
                  {
                    [
                      filters.class_id,
                      filters.org_level_id,
                      filters.date_from,
                      filters.date_to,
                    ].filter((v) => v).length
                  }
                </span>
              )}
            </button>

            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="total_points">Tổng Điểm</option>
              <option value="activity_count">Số Hoạt Động</option>
              <option value="award_count">Số Khen Thưởng</option>
            </select>

            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10/Trang</option>
              <option value="25">25/Trang</option>
              <option value="50">50/Trang</option>
              <option value="100">100/Trang</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting || rankings.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Đang xuất...' : 'CSV'}
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting || rankings.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Đang xuất...' : 'Excel'}
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Lớp</label>
              <select
                value={filters.class_id}
                onChange={(e) => handleFilterChange('class_id', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Tất Cả --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cấp Độ</label>
              <select
                value={filters.org_level_id}
                onChange={(e) => handleFilterChange('org_level_id', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Tất Cả --</option>
                {orgLevels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Từ Ngày</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Đến Ngày</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-1 md:col-span-4 flex gap-2">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex-1"
              >
                Áp Dụng
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-semibold rounded-lg flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Xóa Bộ Lọc
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-lg text-gray-600 font-medium">Đang tải dữ liệu...</p>
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-lg text-gray-600 font-medium">😔 Không có dữ liệu</p>
        </div>
      ) : (
        <>
          {/* Info Bar */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-900 font-medium">
              ✓ Tổng <strong>{pagination.total}</strong> học viên | Trang{' '}
              <strong>
                {pagination.page}/{pagination.pages}
              </strong>
            </p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Xếp Hạng
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Tên Sinh Viên
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lớp</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Tổng Điểm
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">HĐ</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">KT</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      ĐTB/HĐ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rankings.map((rank, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {rank.rank === 1 && <span className="text-2xl">🥇</span>}
                          {rank.rank === 2 && <span className="text-2xl">🥈</span>}
                          {rank.rank === 3 && <span className="text-2xl">🥉</span>}
                          {rank.rank > 3 && (
                            <span className="text-lg font-bold text-gray-600">#{rank.rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/students/${rank.student_id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {rank.student_name}
                        </Link>
                        <div className="text-xs text-gray-500">{rank.student_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{rank.class_name}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                          {rank.total_points}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{rank.activity_count}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{rank.award_count}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">
                        {rank.avg_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold rounded-lg flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Trước
            </button>

            <div className="flex gap-2">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pageNum = pagination.page > 3 ? pagination.page - 2 + i : i + 1;
                if (pageNum > pagination.pages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg font-semibold ${
                      pagination.page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 font-semibold rounded-lg flex items-center gap-2"
            >
              Sau
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
