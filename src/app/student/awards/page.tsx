'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from '@/lib/toast';

interface Award {
  id: number;
  award_type_name: string;
  award_type_description: string;
  reason: string;
  awarded_at: string;
  awarded_by_name: string;
}

interface AwardSummary {
  award_type_name: string;
  total_awards: number;
  first_awarded_at: string;
  last_awarded_at: string;
}

interface AwardsData {
  awards: Award[];
  summary: AwardSummary[];
}

export default function StudentAwardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AwardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }
    if (user) fetchAwards();
  }, [user, authLoading, router]);

  const fetchAwards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await fetch(`/api/student/awards?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách giải thưởng:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    fetchAwards();
  };

  const resetFilters = () => {
    setTypeFilter('');
    setFromDate('');
    setToDate('');
    setTimeout(() => fetchAwards(), 100);
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <div className="p-6">Không thể tải dữ liệu</div>;
  }

  const totalAwards = data.awards.length;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 data-testid="awards-heading" className="text-3xl font-bold">
          🏆 Giải Thưởng Của Tôi
        </h1>
        <div className="text-right">
          <div className="text-sm text-gray-600">Tổng số giải thưởng</div>
          <div className="text-3xl font-bold text-yellow-600">{totalAwards}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại giải thưởng</label>
            <input
              type="text"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="Nhập tên giải thưởng..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleFilterChange}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Lọc
            </button>
            <button
              onClick={resetFilters}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data.summary.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">📊 Tổng hợp theo loại</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.summary.map((s, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow p-4 border border-yellow-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-lg">{s.award_type_name}</div>
                  <div className="text-2xl font-bold text-yellow-600">{s.total_awards}</div>
                </div>
                <div className="text-xs text-gray-600">
                  <div>Lần đầu: {new Date(s.first_awarded_at).toLocaleDateString('vi-VN')}</div>
                  <div>Lần cuối: {new Date(s.last_awarded_at).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awards List */}
      <div>
        <h2 className="text-xl font-semibold mb-3">📜 Danh sách giải thưởng</h2>
        {data.awards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-lg">Chưa có giải thưởng nào</p>
            <p className="text-sm mt-2">Tích cực tham gia hoạt động để nhận giải thưởng!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.awards.map((award) => (
              <div
                key={award.id}
                className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow border-l-4 border-yellow-400"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">🏆</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{award.award_type_name}</h3>
                        {award.award_type_description && (
                          <p className="text-sm text-gray-600">{award.award_type_description}</p>
                        )}
                      </div>
                    </div>
                    {award.reason && (
                      <div className="mb-2 pl-12">
                        <span className="text-sm font-medium text-gray-700">Lý do: </span>
                        <span className="text-sm text-gray-600">{award.reason}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 pl-12">
                      <div>
                        <span className="font-medium">Ngày trao:</span>{' '}
                        {new Date(award.awarded_at).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      {award.awarded_by_name && (
                        <div>
                          <span className="font-medium">Người trao:</span> {award.awarded_by_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <button
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium"
                      onClick={() =>
                        toast.info('Tính năng xem/tải giấy chứng nhận sẽ được bổ sung sau.')
                      }
                    >
                      📄 Giấy chứng nhận
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
