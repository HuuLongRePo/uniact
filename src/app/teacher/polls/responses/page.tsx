'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Search, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface PollResponse {
  id: number;
  poll_id: number;
  poll_title: string;
  student_id: number;
  student_name: string;
  class_name: string;
  selected_option: string;
  response_text: string;
  responded_at: string;
}

interface PollOption {
  id: number;
  poll_id: number;
  option_text: string;
  response_count: number;
  percentage: number;
}

export default function PollResponsesPage() {
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<PollResponse[]>([]);
  const [pollOptions, setPollOptions] = useState<PollOption[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    classId: '',
    dateStart: '',
    dateEnd: '',
  });
  const [sortBy, setSortBy] = useState('responded_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolls();
  }, []);

  useEffect(() => {
    if (selectedPoll) {
      fetchResponses(selectedPoll);
    }
  }, [selectedPoll]);

  useEffect(() => {
    applyFilters();
  }, [responses, searchTerm, filters, sortBy, sortOrder]);

  const fetchPolls = async () => {
    try {
      const response = await fetch('/api/teacher/polls');
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || 'Không thể tải danh sách bình chọn');
      const pollsList: any[] = Array.isArray(data) ? data : data?.polls || data?.data?.polls || [];
      setPolls(pollsList);
      // Select first poll with active status
      const activePoll = pollsList.find((p: any) => p.status === 'active' || p.status === 'closed');
      if (activePoll) {
        setSelectedPoll(activePoll.id);
      } else if (pollsList.length > 0) {
        setSelectedPoll(pollsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching polls:', error);
      toast.error('Không thể tải danh sách bình chọn');
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async (pollId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/polls/${pollId}/responses`);
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || data?.message || 'Không thể tải phản hồi');
      setResponses(Array.isArray(data) ? data : data?.responses || data?.data?.responses || []);
      setPollOptions(data?.options || data?.data?.options || []);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải phản hồi');
      setResponses([]);
      setPollOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = responses;

    // Filter by class
    if (filters.classId) {
      result = result.filter((r) => r.class_name === filters.classId);
    }

    // Filter by date range
    if (filters.dateStart) {
      const startDate = new Date(filters.dateStart);
      result = result.filter((r) => new Date(r.responded_at) >= startDate);
    }
    if (filters.dateEnd) {
      const endDate = new Date(filters.dateEnd);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.responded_at) <= endDate);
    }

    // Search by student name
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((r) => r.student_name.toLowerCase().includes(search));
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'responded_at':
          aVal = new Date(a.responded_at).getTime();
          bVal = new Date(b.responded_at).getTime();
          break;
        case 'student_name':
          aVal = a.student_name.toLowerCase();
          bVal = b.student_name.toLowerCase();
          break;
        case 'selected_option':
          aVal = a.selected_option.toLowerCase();
          bVal = b.selected_option.toLowerCase();
          break;
        default:
          aVal = new Date(a.responded_at).getTime();
          bVal = new Date(b.responded_at).getTime();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredResponses(result);
  };

  const handleExport = async () => {
    if (!selectedPoll) return;

    try {
      const response = await fetch(`/api/teacher/polls/${selectedPoll}/responses/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error('Không thể xuất phản hồi');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poll-responses-${Date.now()}.csv`;
      a.click();
      toast.success('Xuất phản hồi thành công');
    } catch (error) {
      console.error('Error exporting responses:', error);
      toast.error('Không thể xuất phản hồi');
    }
  };

  const getClasses = () => {
    const classSet = new Set(responses.map((r) => r.class_name));
    return Array.from(classSet).sort();
  };

  const stats = {
    total: responses.length,
    totalOptions: pollOptions.length,
    avgPerOption: pollOptions.length > 0 ? Math.round(responses.length / pollOptions.length) : 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Phân tích phản hồi bình chọn
              </h1>
              <p className="text-gray-600 mt-2">Xem chi tiết và phân tích phản hồi từ học viên</p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
            >
              <Download className="w-4 h-4" />
              Xuất
            </button>
          </div>
        </div>

        {/* Poll Selection */}
        {!loading && polls.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">Chọn bình chọn</label>
            <select
              value={selectedPoll || ''}
              onChange={(e) => setSelectedPoll(Number(e.target.value))}
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn bình chọn --</option>
              {polls.map((poll) => (
                <option key={poll.id} value={poll.id}>
                  {poll.title} (
                  {poll.status === 'active' ? '🟢' : poll.status === 'closed' ? '⊘' : '✎'})
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedPoll && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-sm text-gray-600 font-medium mb-1">Tổng phản hồi</div>
                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-sm text-gray-600 font-medium mb-1">Số tùy chọn</div>
                <div className="text-3xl font-bold text-green-600">{stats.totalOptions}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="text-sm text-gray-600 font-medium mb-1">Trung bình/tùy chọn</div>
                <div className="text-3xl font-bold text-purple-600">{stats.avgPerOption}</div>
              </div>
            </div>

            {/* Options Summary */}
            {pollOptions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Kết quả tùy chọn</h2>
                <div className="space-y-4">
                  {pollOptions.map((option) => (
                    <div key={option.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          {option.option_text}
                        </div>
                        <div className="text-sm text-gray-600">
                          {option.response_count} ({option.percentage.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${option.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Bộ lọc</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tìm kiếm học viên
                  </label>
                  <input
                    type="text"
                    placeholder="Tên học viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lớp học</label>
                  <select
                    value={filters.classId}
                    onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    {getClasses().map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                  <input
                    type="date"
                    value={filters.dateStart}
                    onChange={(e) => setFilters({ ...filters, dateStart: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                  <input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(e) => setFilters({ ...filters, dateEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Responses Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
                  <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                </div>
              ) : filteredResponses.length === 0 ? (
                <div className="p-12 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Không có phản hồi nào</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => {
                            setSortBy('student_name');
                            setSortOrder(
                              sortBy === 'student_name'
                                ? sortOrder === 'asc'
                                  ? 'desc'
                                  : 'asc'
                                : 'desc'
                            );
                          }}
                          className="font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1"
                        >
                          Học viên {sortBy === 'student_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Lớp
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => {
                            setSortBy('selected_option');
                            setSortOrder(
                              sortBy === 'selected_option'
                                ? sortOrder === 'asc'
                                  ? 'desc'
                                  : 'asc'
                                : 'desc'
                            );
                          }}
                          className="font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1"
                        >
                          Lựa chọn{' '}
                          {sortBy === 'selected_option' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => {
                            setSortBy('responded_at');
                            setSortOrder(
                              sortBy === 'responded_at'
                                ? sortOrder === 'asc'
                                  ? 'desc'
                                  : 'asc'
                                : 'desc'
                            );
                          }}
                          className="font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1"
                        >
                          Thời gian {sortBy === 'responded_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Ghi chú
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredResponses.map((response) => (
                      <tr key={response.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {response.student_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{response.class_name}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                            {response.selected_option}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(response.responded_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {response.response_text || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
