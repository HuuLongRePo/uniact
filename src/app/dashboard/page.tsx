'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type DashboardActivity = {
  id: number;
  title: string;
  date_time: string;
  location: string;
  status?: string;
  participant_count?: number;
  activity_type?: string | null;
  average_score?: string | number | null;
};

type DashboardUser = {
  role?: string;
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    classCount: 0,
    activityCount: 0,
    upcomingActivities: 0,
    studentCount: 0,
    teacherCount: 0,
    totalParticipations: 0,
    pendingApprovals: 0,
    averageScore: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [participationData, setParticipationData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, loading, router]);

  const fetchDashboardData = async () => {
    try {
      const requests: Promise<Response>[] = [
        fetch(resolveClientFetchUrl('/api/classes')),
        fetch(resolveClientFetchUrl('/api/activities')),
      ];

      if (user?.role === 'admin') {
        requests.push(fetch(resolveClientFetchUrl('/api/admin/users')));
      }

      const [classesRes, activitiesRes, usersRes] = await Promise.all(requests);

      if (!classesRes.ok || !activitiesRes.ok) {
        throw new Error('Không thể tải dữ liệu dashboard');
      }

      const classesData = await classesRes.json();
      const activitiesData = await activitiesRes.json();
      const usersData = user?.role === 'admin' && usersRes?.ok ? await usersRes.json() : null;

      const classes = classesData?.data?.classes || classesData?.classes || [];
      const activities: DashboardActivity[] =
        activitiesData?.data?.activities || activitiesData?.activities || [];
      const allUsers: DashboardUser[] =
        usersData?.users || usersData?.data?.users || usersData?.data || [];
      const teachers = allUsers.filter((u) => u.role === 'teacher');
      const students = allUsers.filter((u) => u.role === 'student');

      const now = new Date();
      const upcomingActs = activities.filter((a) => new Date(a.date_time) >= now);

      const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - 5 + i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        const monthActivities = activities.filter((a) => {
          const actDate = new Date(a.date_time);
          return actDate >= monthStart && actDate <= monthEnd;
        });

        const totalParticipants = monthActivities.reduce(
          (sum, a) => sum + Number(a.participant_count || 0),
          0
        );

        return {
          month: `Tháng ${d.getMonth() + 1}`,
          participants: totalParticipants,
          activities: monthActivities.length,
        };
      });

      const typeDistribution = Array.from(
        new Set(activities.map((a) => a.activity_type || 'Khác'))
      ).map((type) => ({
        name: type,
        value: activities.filter((a) => (a.activity_type || 'Khác') === type).length,
      }));

      const allScores = activities
        .map((a) => Number(a.average_score))
        .filter((score) => Number.isFinite(score) && score > 0);
      const avgScore =
        allScores.length > 0
          ? Number((allScores.reduce((sum, s) => sum + s, 0) / allScores.length).toFixed(1))
          : 0;

      setStats({
        classCount: classes.length,
        activityCount: activities.length,
        upcomingActivities: upcomingActs.length,
        studentCount: students.length,
        teacherCount: teachers.length,
        totalParticipations: activities.reduce(
          (sum, a) => sum + Number(a.participant_count || 0),
          0
        ),
        pendingApprovals: activities.filter((a) => a.status === 'pending').length,
        averageScore: avgScore,
      });

      setChartData(monthlyData);
      setParticipationData(typeDistribution);
      setRecentActivities(
        upcomingActs
          .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Lỗi tải dashboard:', error);
      setStats({
        classCount: 0,
        activityCount: 0,
        upcomingActivities: 0,
        studentCount: 0,
        teacherCount: 0,
        totalParticipations: 0,
        pendingApprovals: 0,
        averageScore: 0,
      });
      setChartData([]);
      setParticipationData([]);
      setRecentActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-4xl font-bold mb-2">Chào mừng trở lại, {user.name}! 👋</h1>
          <p className="text-green-50 text-lg">
            {user.role === 'admin' && '👨‍💼 Quản trị viên - Toàn quyền quản lý hệ thống'}
            {user.role === 'teacher' && `👨‍🏫 Giảng viên - ${stats.classCount} lớp phụ trách`}
            {user.role === 'student' && `🎓 Học viên - Sẵn sàng cho các hoạt động mới!`}
          </p>
        </div>

        {/* ADMIN SPECIFIC DASHBOARD */}
        {user.role === 'admin' && (
          <>
            {/* Admin Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Classes */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-blue-600">{stats.classCount}</div>
                    <div className="text-gray-600 text-sm mt-1">Lớp học</div>
                  </div>
                  <div className="text-5xl opacity-30">🏫</div>
                </div>
                <Link
                  href="/admin/classes"
                  className="mt-4 block text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Quản lý lớp →
                </Link>
              </div>

              {/* Teachers */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-purple-600">{stats.teacherCount}</div>
                    <div className="text-gray-600 text-sm mt-1">Giảng viên</div>
                  </div>
                  <div className="text-5xl opacity-30">👨‍🏫</div>
                </div>
                <Link
                  href="/admin/users"
                  className="mt-4 block text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  Quản lý giảng viên →
                </Link>
              </div>

              {/* Students */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-orange-600">{stats.studentCount}</div>
                    <div className="text-gray-600 text-sm mt-1">Học viên</div>
                  </div>
                  <div className="text-5xl opacity-30">👨‍🎓</div>
                </div>
                <Link
                  href="/admin/users?role=student"
                  className="mt-4 block text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  Quản lý học viên →
                </Link>
              </div>

              {/* Activities */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-green-600">{stats.activityCount}</div>
                    <div className="text-gray-600 text-sm mt-1">Hoạt động</div>
                  </div>
                  <div className="text-5xl opacity-30">🎯</div>
                </div>
                <Link
                  href="/admin/activities"
                  className="mt-4 block text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  Quản lý hoạt động →
                </Link>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-red-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-red-600">{stats.pendingApprovals}</div>
                    <div className="text-gray-600 text-sm mt-1">Chờ phê duyệt</div>
                  </div>
                  <div className="text-4xl">⏳</div>
                </div>
                <Link
                  href="/admin/approvals"
                  className="mt-4 block text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Xem chi tiết →
                </Link>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-yellow-200 bg-yellow-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {stats.totalParticipations}
                    </div>
                    <div className="text-gray-600 text-sm mt-1">Tham gia tổng cộng</div>
                  </div>
                  <div className="text-4xl">📊</div>
                </div>
                <Link
                  href="/admin/reports"
                  className="mt-4 block text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                >
                  Xem báo cáo →
                </Link>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-green-200 bg-green-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">
                      {stats.upcomingActivities}
                    </div>
                    <div className="text-gray-600 text-sm mt-1">Sắp diễn ra</div>
                  </div>
                  <div className="text-4xl">📅</div>
                </div>
                <Link
                  href="/admin/activities?filter=upcoming"
                  className="mt-4 block text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  Xem chi tiết →
                </Link>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Line Chart - Monthly Participation Trend */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📈 Xu hướng tham gia hàng tháng
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="participants"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Người tham gia"
                    />
                    <Line
                      type="monotone"
                      dataKey="activities"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Hoạt động"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart - Activity Distribution */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🎯 Phân bố loại hoạt động
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={participationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {participationData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][index % 4]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions for Admin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">⚡ Thao tác nhanh</h2>
                <div className="space-y-3">
                  <Link
                    href="/admin/classes/new"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <div className="text-2xl mr-4 group-hover:scale-110 transition-transform">
                      ➕
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Tạo lớp học</div>
                      <div className="text-sm text-gray-600">Thêm lớp học mới vào hệ thống</div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/users/new"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors group"
                  >
                    <div className="text-2xl mr-4 group-hover:scale-110 transition-transform">
                      👤
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Thêm người dùng</div>
                      <div className="text-sm text-gray-600">Thêm giảng viên hoặc học viên</div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/approvals"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-yellow-50 transition-colors group"
                  >
                    <div className="text-2xl mr-4 group-hover:scale-110 transition-transform">
                      ✅
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Phê duyệt hoạt động</div>
                      <div className="text-sm text-gray-600">
                        {stats.pendingApprovals} chờ xử lý
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/system-health"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 transition-colors group"
                  >
                    <div className="text-2xl mr-4 group-hover:scale-110 transition-transform">
                      🏥
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Giám sát hệ thống</div>
                      <div className="text-sm text-gray-600">Kiểm tra tình trạng hệ thống</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Upcoming Activities */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">📅 Hoạt động sắp tới</h2>
                  <Link
                    href="/admin/activities"
                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    Xem tất cả
                  </Link>
                </div>

                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📅</div>
                    <p className="text-gray-500">Không có hoạt động sắp tới</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg">
                          🎯
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                          <p className="text-xs text-gray-600">{formatDate(activity.date_time)}</p>
                          <p className="text-xs text-gray-500">{activity.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* System Status Card */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">📊 Thống kê hệ thống</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.classCount}</div>
                  <div className="text-xs text-gray-600">Lớp học</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.teacherCount}</div>
                  <div className="text-xs text-gray-600">Giảng viên</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.studentCount}</div>
                  <div className="text-xs text-gray-600">Học viên</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.activityCount}</div>
                  <div className="text-xs text-gray-600">Hoạt động</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* DEFAULT DASHBOARD FOR NON-ADMIN */}
        {user.role !== 'admin' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🏫</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.classCount}</div>
                    <div className="text-gray-600">Lớp học</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🎯</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.activityCount}</div>
                    <div className="text-gray-600">Hoạt động</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">📅</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.upcomingActivities}
                    </div>
                    <div className="text-gray-600">Sắp diễn ra</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">👥</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.studentCount}</div>
                    <div className="text-gray-600">Học viên</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">⚡ Truy cập nhanh</h2>
                <div className="space-y-3">
                  <Link
                    href="/activities"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-2xl mr-4">🎯</div>
                    <div>
                      <div className="font-medium text-gray-900">Hoạt động</div>
                      <div className="text-sm text-gray-600">
                        Xem và quản lý hoạt động ngoại khóa
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/classes"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-2xl mr-4">🏫</div>
                    <div>
                      <div className="font-medium text-gray-900">Lớp học</div>
                      <div className="text-sm text-gray-600">Quản lý lớp học và học viên</div>
                    </div>
                  </Link>

                  {user.role === 'teacher' && (
                    <Link
                      href="/teacher/activities"
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-2xl mr-4">➕</div>
                      <div>
                        <div className="font-medium text-gray-900">Tạo hoạt động</div>
                        <div className="text-sm text-gray-600">Tạo hoạt động ngoại khóa mới</div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>

              {/* Upcoming Activities */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">📅 Hoạt động sắp tới</h2>
                  <Link
                    href="/activities"
                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    Xem tất cả
                  </Link>
                </div>

                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📅</div>
                    <p className="text-gray-500">Không có hoạt động sắp tới</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-lg">🎯</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                          <p className="text-sm text-gray-600">{formatDate(activity.date_time)}</p>
                          <p className="text-sm text-gray-500">{activity.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Role-specific Tips */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Mẹo sử dụng</h3>
              <div className="text-blue-800">
                {user.role === 'teacher' && (
                  <p>
                    Tạo hoạt động ngoại khóa để thu hút học viên tham gia và phát triển kỹ năng.
                  </p>
                )}
                {user.role === 'student' && (
                  <p>
                    Tham gia các hoạt động ngoại khóa để phát triển kỹ năng và tích luỹ điểm thi đua
                    của bạn!
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
