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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-lg font-medium text-slate-700 dark:text-slate-200">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
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
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-blue-600">{stats.classCount}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Lớp học</div>
                  </div>
                  <div className="text-5xl opacity-30">🏫</div>
                </div>
                <Link
                  href="/admin/classes"
                  className="mt-4 block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Quản lý lớp →
                </Link>
              </div>

              {/* Teachers */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-purple-600">{stats.teacherCount}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Giảng viên</div>
                  </div>
                  <div className="text-5xl opacity-30">👨‍🏫</div>
                </div>
                <Link
                  href="/admin/users"
                  className="mt-4 block text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-200"
                >
                  Quản lý giảng viên →
                </Link>
              </div>

              {/* Students */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-orange-600">{stats.studentCount}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Học viên</div>
                  </div>
                  <div className="text-5xl opacity-30">👨‍🎓</div>
                </div>
                <Link
                  href="/admin/users?role=student"
                  className="mt-4 block text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-amber-300 dark:hover:text-amber-200"
                >
                  Quản lý học viên →
                </Link>
              </div>

              {/* Activities */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-green-600">{stats.activityCount}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Hoạt động</div>
                  </div>
                  <div className="text-5xl opacity-30">🎯</div>
                </div>
                <Link
                  href="/admin/activities"
                  className="mt-4 block text-sm font-medium text-green-600 hover:text-green-700 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  Quản lý hoạt động →
                </Link>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-500/40 dark:bg-red-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-red-600">{stats.pendingApprovals}</div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-red-100">Chờ phê duyệt</div>
                  </div>
                  <div className="text-4xl">⏳</div>
                </div>
                <Link
                  href="/admin/approvals"
                  className="mt-4 block text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-200 dark:hover:text-red-100"
                >
                  Xem chi tiết →
                </Link>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {stats.totalParticipations}
                    </div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-amber-100">Tham gia tổng cộng</div>
                  </div>
                  <div className="text-4xl">📊</div>
                </div>
                <Link
                  href="/admin/reports"
                  className="mt-4 block text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-200 dark:hover:text-amber-100"
                >
                  Xem báo cáo →
                </Link>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">
                      {stats.upcomingActivities}
                    </div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-emerald-100">Sắp diễn ra</div>
                  </div>
                  <div className="text-4xl">📅</div>
                </div>
                <Link
                  href="/admin/activities?filter=upcoming"
                  className="mt-4 block text-sm font-medium text-green-700 hover:text-green-800 dark:text-emerald-200 dark:hover:text-emerald-100"
                >
                  Xem chi tiết →
                </Link>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Line Chart - Monthly Participation Trend */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
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
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
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
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">⚡ Thao tác nhanh</h2>
                <div className="space-y-3">
                  <Link
                    href="/admin/classes/new"
                    className="group flex items-center rounded-lg border border-slate-200 p-4 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div className="text-2xl mr-4 group-hover:scale-110 transition-transform">
                      ➕
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Tạo lớp học</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Thêm lớp học mới vào hệ thống</div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/users/new"
                    className="group flex items-center rounded-lg border border-slate-200 p-4 transition-colors hover:bg-purple-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div className="text-2xl mr-4 group-hover:scale-110 transition-transform">
                      👤
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Thêm người dùng</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Thêm giảng viên hoặc học viên</div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/approvals"
                    className="group flex items-center rounded-lg border border-slate-200 p-4 transition-colors hover:bg-yellow-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div className="text-2xl mr-4 group-hover:scale-110 transition-transform">
                      ✅
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Phê duyệt hoạt động</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {stats.pendingApprovals} chờ xử lý
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/admin/system-health"
                    className="group flex items-center rounded-lg border border-slate-200 p-4 transition-colors hover:bg-green-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div className="text-2xl mr-4 group-hover:scale-110 transition-transform">
                      🏥
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Giám sát hệ thống</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Kiểm tra tình trạng hệ thống</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Upcoming Activities */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">📅 Hoạt động sắp tới</h2>
                  <Link
                    href="/admin/activities"
                    className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    Xem tất cả
                  </Link>
                </div>

                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mb-2 text-4xl text-slate-400 dark:text-slate-500">📅</div>
                    <p className="text-slate-500 dark:text-slate-400">Không có hoạt động sắp tới</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/70"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-lg dark:bg-emerald-500/15">
                          🎯
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{activity.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{formatDate(activity.date_time)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{activity.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* System Status Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-500 dark:bg-slate-900">
              <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                📊 Thống kê hệ thống
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-blue-200 bg-white px-3 py-4 text-center dark:border-blue-400/70 dark:bg-slate-800 dark:shadow-sm dark:shadow-slate-950/30">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-100">{stats.classCount}</div>
                  <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-100">Lớp học</div>
                </div>
                <div className="rounded-xl border border-violet-200 bg-white px-3 py-4 text-center dark:border-violet-400/70 dark:bg-slate-800 dark:shadow-sm dark:shadow-slate-950/30">
                  <div className="text-2xl font-bold text-violet-700 dark:text-violet-100">
                    {stats.teacherCount}
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-100">Giảng viên</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-4 text-center dark:border-amber-400/70 dark:bg-slate-800 dark:shadow-sm dark:shadow-slate-950/30">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-100">
                    {stats.studentCount}
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-100">Học viên</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-4 text-center dark:border-emerald-400/70 dark:bg-slate-800 dark:shadow-sm dark:shadow-slate-950/30">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-100">
                    {stats.activityCount}
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-100">Hoạt động</div>
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
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🏫</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.classCount}</div>
                    <div className="text-slate-600 dark:text-slate-300">Lớp học</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🎯</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.activityCount}</div>
                    <div className="text-slate-600 dark:text-slate-300">Hoạt động</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">📅</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats.upcomingActivities}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">Sắp diễn ra</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">👥</div>
                  </div>
                  <div className="ml-4">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.studentCount}</div>
                    <div className="text-slate-600 dark:text-slate-300">Học viên</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quick Actions */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">⚡ Truy cập nhanh</h2>
                <div className="space-y-3">
                  <Link
                    href="/activities"
                    className="flex items-center rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/70"
                  >
                    <div className="text-2xl mr-4">🎯</div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Hoạt động</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        Xem và quản lý hoạt động ngoại khóa
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/classes"
                    className="flex items-center rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/70"
                  >
                    <div className="text-2xl mr-4">🏫</div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Lớp học</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">Quản lý lớp học và học viên</div>
                    </div>
                  </Link>

                  {user.role === 'teacher' && (
                    <Link
                      href="/teacher/activities"
                      className="flex items-center rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/70"
                    >
                      <div className="text-2xl mr-4">➕</div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">Tạo hoạt động</div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">Tạo hoạt động ngoại khóa mới</div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>

              {/* Upcoming Activities */}
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">📅 Hoạt động sắp tới</h2>
                  <Link
                    href="/activities"
                    className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    Xem tất cả
                  </Link>
                </div>

                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mb-2 text-4xl text-slate-400 dark:text-slate-500">📅</div>
                    <p className="text-slate-500 dark:text-slate-400">Không có hoạt động sắp tới</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-4 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/70"
                      >
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-emerald-500/15">
                          <span className="text-lg">🎯</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{activity.title}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{formatDate(activity.date_time)}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{activity.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Role-specific Tips */}
            <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-500/40 dark:bg-blue-500/10">
              <h3 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">💡 Mẹo sử dụng</h3>
              <div className="text-blue-800 dark:text-blue-200">
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
