'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Loader,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SemesterReport {
  semester: string;
  academicYear: string;
  totalPoints: number;
  totalStudents: number;
  averagePointsPerStudent: number;
  classReports: ClassReport[];
}

interface ClassReport {
  className: string;
  studentCount: number;
  totalApprovedPoints: number;
  averagePointsPerStudent: number;
  proposals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

interface Statistics {
  total: { proposals: number; points: number };
  byStatus: { approved: number; pending: number; rejected: number };
  averages: { pointsPerApprovedProposal: number; approvalRate: number };
}

export default function BonusReportsPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();

  const [report, setReport] = useState<SemesterReport | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
      return;
    }
  }, [loading, currentUser, router]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchReport();
    }
  }, [currentUser, semester, academicYear]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const [reportRes, statsRes] = await Promise.all([
        fetch(`/api/bonus/reports?type=semester&semester=${semester}&academicYear=${academicYear}`),
        fetch(`/api/bonus/reports?type=statistics`),
      ]);

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setReport(reportData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStatistics(statsData);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Lỗi khi tải báo cáo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (type: 'csv' | 'xlsx' | 'json') => {
    try {
      const url = `/api/bonus/reports?type=semester&semester=${semester}&academicYear=${academicYear}&format=${type}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `bonus-hk${semester}-${academicYear}.${type}`;
      link.click();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`✅ Xuất ${type.toUpperCase()} thành công`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất báo cáo');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <Loader className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/bonus-approval"
            className="p-2 hover:bg-white/50 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Báo Cáo Cộng Điểm</h1>
            <p className="text-gray-600 mt-1">Phân tích và thống kê điểm cộng toàn trường</p>
          </div>
        </div>

        {/* Period Selection */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Học kỳ</label>
              <select
                value={semester}
                onChange={(e) => setSemester(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Học kỳ 1</option>
                <option value={2}>Học kỳ 2</option>
                <option value={3}>Học kỳ 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Năm học</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <button
                onClick={() => fetchReport()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Tải báo cáo
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 font-semibold">Tổng đề xuất</h3>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{statistics.total.proposals}</div>
              <p className="text-gray-500 text-sm mt-2">
                Phê duyệt: {statistics.byStatus.approved} | Chờ: {statistics.byStatus.pending}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 font-semibold">Tổng điểm</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{statistics.total.points}</div>
              <p className="text-gray-500 text-sm mt-2">Điểm đã phê duyệt</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 font-semibold">Tỉ lệ duyệt</h3>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-gray-800">
                {statistics.averages.approvalRate.toFixed(1)}%
              </div>
              <p className="text-gray-500 text-sm mt-2">
                Trung bình {statistics.averages.pointsPerApprovedProposal.toFixed(1)} điểm/đề
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 font-semibold">Từ chối</h3>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{statistics.byStatus.rejected}</div>
              <p className="text-gray-500 text-sm mt-2">Không phê duyệt</p>
            </div>
          </div>
        )}

        {/* Semester Report */}
        {report && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Báo Cáo {report.semester} - Năm học {report.academicYear}
            </h2>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-gray-600 text-sm">Tổng học viên</p>
                <p className="text-2xl font-bold text-blue-600">{report.totalStudents}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Tổng điểm</p>
                <p className="text-2xl font-bold text-green-600">{report.totalPoints}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Điểm bình quân</p>
                <p className="text-2xl font-bold text-purple-600">
                  {report.averagePointsPerStudent.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Class Reports */}
            <h3 className="text-xl font-bold text-gray-800 mb-4">Chi tiết theo lớp</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Lớp</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Số HV</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Tổng điểm</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Bình quân</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Tổng đề</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Duyệt</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Chờ</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-700">Từ chối</th>
                  </tr>
                </thead>
                <tbody>
                  {report.classReports.map((cls) => (
                    <tr key={cls.className} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-semibold text-gray-800">{cls.className}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{cls.studentCount}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-600">
                        {cls.totalApprovedPoints}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {cls.averagePointsPerStudent.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{cls.proposals.total}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
                          {cls.proposals.approved}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-semibold">
                          {cls.proposals.pending}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-semibold">
                          {cls.proposals.rejected}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
