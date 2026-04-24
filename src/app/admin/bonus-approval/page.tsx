'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Eye, Loader, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveDownloadFilename } from '@/lib/download-filename';
import { formatVietnamDateTime, parseVietnamDate, toVietnamDateStamp } from '@/lib/timezone';

interface BonusProposal {
  id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  points: number;
  source_type: string;
  source_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  author_id: number;
  author_name?: string;
  approver_id?: number;
  evidence_url?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminBonusApprovePage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();

  const [proposals, setProposals] = useState<BonusProposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<BonusProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'pending'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'points' | 'student'>('created');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedProposal, setSelectedProposal] = useState<BonusProposal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchProposals();
    }
  }, [currentUser, loading, router]);

  const fetchProposals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/bonus');
      if (res.ok) {
        const data = await res.json();
        setProposals(data.suggestions || []);
      } else {
        toast.error('Không thể tải danh sách đề xuất');
      }
    } catch (error) {
      console.error('Lỗi tải đề xuất:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...proposals];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.student_name?.toLowerCase().includes(query) ||
          p.student_email?.toLowerCase().includes(query) ||
          p.author_name?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'created') {
        comparison =
          (parseVietnamDate(a.created_at)?.getTime() ?? 0) -
          (parseVietnamDate(b.created_at)?.getTime() ?? 0);
      } else if (sortBy === 'points') {
        comparison = a.points - b.points;
      } else if (sortBy === 'student') {
        comparison = (a.student_name || '').localeCompare(b.student_name || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredProposals(filtered);
  }, [filterStatus, proposals, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  const handleApprove = async (proposal: BonusProposal) => {
    setIsProcessing(proposal.id);
    try {
      const res = await fetch(`/api/bonus/${proposal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          note: approvalNote,
        }),
      });

      if (res.ok) {
        toast.success(`✅ Đã phê duyệt đề xuất cho ${proposal.student_name}`);
        setApprovalNote('');
        setShowDetailModal(false);
        fetchProposals();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Không thể phê duyệt');
      }
    } catch (error) {
      console.error('Lỗi phê duyệt:', error);
      toast.error('Lỗi khi phê duyệt');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (proposal: BonusProposal) => {
    setIsProcessing(proposal.id);
    try {
      const res = await fetch(`/api/bonus/${proposal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          note: approvalNote,
        }),
      });

      if (res.ok) {
        toast.success(`❌ Đã từ chối đề xuất`);
        setApprovalNote('');
        setShowDetailModal(false);
        fetchProposals();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Không thể từ chối');
      }
    } catch (error) {
      console.error('Lỗi từ chối:', error);
      toast.error('Lỗi khi từ chối');
    } finally {
      setIsProcessing(null);
    }
  };

  const getSourceTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      achievement: 'Thành tích',
      activity: 'Hoạt động',
      development: 'Phát triển',
      social: 'Xã hội',
      special: 'Đặc biệt',
    };
    return typeMap[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Chờ duyệt' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã duyệt' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Từ chối' },
    };
    const style = statusMap[status] || statusMap.pending;
    return { ...style };
  };

  const handleExportReport = async (format: 'csv' | 'json') => {
    try {
      const url = `/api/bonus/reports?type=semester&format=${format}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = resolveDownloadFilename(
        response.headers?.get?.('Content-Disposition') ?? null,
        `bonus-report-${toVietnamDateStamp(new Date())}.${format}`
      );
      link.click();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`✅ Xuất báo cáo ${format.toUpperCase()} thành công`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất báo cáo');
    }
  };

  const stats = {
    pending: proposals.filter((p) => p.status === 'pending').length,
    approved: proposals.filter((p) => p.status === 'approved').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/dashboard" className="p-2 hover:bg-white/50 rounded-lg transition">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-800">Duyệt Đề Xuất Cộng Điểm</h1>
            <p className="text-gray-600 mt-1">Quản lý và phê duyệt các đề xuất từ giảng viên</p>
          </div>
          <Link
            href="/admin/bonus-reports"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            📊 Xem Báo Cáo
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-yellow-600 font-bold text-2xl">{stats.pending}</div>
            <div className="text-gray-600 text-sm">Chờ duyệt</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-green-600 font-bold text-2xl">{stats.approved}</div>
            <div className="text-gray-600 text-sm">Đã duyệt</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-red-600 font-bold text-2xl">{stats.rejected}</div>
            <div className="text-gray-600 text-sm">Từ chối</div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">Xuất Báo Cáo</h3>
              <p className="text-purple-100 text-sm">Tải báo cáo tổng hợp cộng điểm theo học kỳ</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExportReport('csv')}
                className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => handleExportReport('json')}
                className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tìm kiếm</label>
              <input
                type="text"
                placeholder="Tên học viên, email, giảng viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sắp xếp</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created' | 'points' | 'student')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="created">Mới nhất</option>
                <option value="points">Điểm</option>
                <option value="student">Học viên</option>
              </select>
            </div>
          </div>
        </div>

        {/* Proposals Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Đang tải dữ liệu...</p>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Không có đề xuất nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Học viên</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Loại</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-700">Điểm</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Giảng viên</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-700">Trạng thái</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProposals.map((proposal, idx) => {
                    const statusStyle = getStatusBadge(proposal.status);
                    return (
                      <tr key={proposal.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-800">
                            {proposal.student_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {proposal.student_email || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {getSourceTypeLabel(proposal.source_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-lg text-blue-600">
                            +{proposal.points}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {proposal.author_name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                          >
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedProposal(proposal);
                              setShowDetailModal(true);
                              setApprovalNote('');
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition text-sm font-semibold"
                          >
                            <Eye className="w-4 h-4" />
                            Xem
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
              <h2 className="text-xl font-bold">Chi Tiết Đề Xuất</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Học viên</p>
                  <p className="font-semibold text-gray-800">{selectedProposal.student_name}</p>
                  <p className="text-xs text-gray-500">{selectedProposal.student_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Điểm đề xuất</p>
                  <p className="font-bold text-2xl text-blue-600">+{selectedProposal.points}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Loại hoạt động</p>
                  <p className="font-semibold text-gray-800">
                    {getSourceTypeLabel(selectedProposal.source_type)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Trạng thái</p>
                  <div className="mt-1">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusBadge(selectedProposal.status).bg} ${getStatusBadge(selectedProposal.status).text}`}
                    >
                      {getStatusBadge(selectedProposal.status).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              {selectedProposal.evidence_url && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bằng chứng</p>
                  <a
                    href={selectedProposal.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {selectedProposal.evidence_url}
                  </a>
                </div>
              )}

              {/* Timeline */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>🕐 Tạo: {formatVietnamDateTime(selectedProposal.created_at)}</p>
                {selectedProposal.status !== 'pending' && (
                  <p>
                    ✅ Cập nhật: {formatVietnamDateTime(selectedProposal.updated_at)}
                  </p>
                )}
              </div>

              {/* Approval Section */}
              {selectedProposal.status === 'pending' && (
                <div className="border-t pt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ghi chú (tùy chọn)
                    </label>
                    <textarea
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Thêm ghi chú..."
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedProposal)}
                      disabled={isProcessing === selectedProposal.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      {isProcessing === selectedProposal.id ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Phê duyệt
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(selectedProposal)}
                      disabled={isProcessing === selectedProposal.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      {isProcessing === selectedProposal.id ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Từ chối
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="bg-gray-50 px-6 py-4 border-t text-right">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
