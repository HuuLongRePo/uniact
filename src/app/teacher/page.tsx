'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  Bell,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Clock,
  Activity,
  Send,
  Award,
  MessageSquare,
} from 'lucide-react';

interface DashboardStats {
  total_activities: number;
  pending_approval: number;
  approved_activities: number;
  total_students: number;
  pending_notifications: number;
  this_week_activities: number;
}

interface MenuSection {
  title: string;
  icon: React.ReactNode;
  items: Array<{
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: { count: number; color: string };
  }>;
}

export default function TeacherDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/teacher/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Lỗi tải thống kê:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Hoạt động',
      icon: <Activity className="w-6 h-6" />,
      items: [
        {
          label: 'Danh sách hoạt động',
          href: '/teacher/activities',
          icon: <BookOpen className="w-5 h-5" />,
        },
        {
          label: 'Tạo hoạt động mới',
          href: '/teacher/activities',
          icon: <Activity className="w-5 h-5" />,
        },
        {
          label: 'Theo dõi duyệt',
          href: '/teacher/approvals',
          icon: <Clock className="w-5 h-5" />,
          badge: stats?.pending_approval
            ? { count: stats.pending_approval, color: 'bg-yellow-500' }
            : undefined,
        },
      ],
    },
    {
      title: 'Học viên',
      icon: <Users className="w-6 h-6" />,
      items: [
        {
          label: 'Danh sách lớp',
          href: '/teacher/classes',
          icon: <Users className="w-5 h-5" />,
        },
        {
          label: 'Dấu danh',
          href: '/teacher/attendance',
          icon: <CheckCircle className="w-5 h-5" />,
        },
        {
          label: 'Báo cáo',
          href: '/teacher/reports/participation',
          icon: <BarChart3 className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'Thông báo & Giải thưởng',
      icon: <Bell className="w-6 h-6" />,
      items: [
        {
          label: 'Thông báo quảng bá',
          href: '/teacher/notifications/broadcast',
          icon: <Send className="w-5 h-5" />,
        },
        {
          label: 'Đề xuất giải thưởng',
          href: '/teacher/awards/suggestions',
          icon: <Award className="w-5 h-5" />,
        },
        {
          label: 'Thông báo nhận được',
          href: '/teacher/notifications',
          icon: <MessageSquare className="w-5 h-5" />,
          badge: stats?.pending_notifications
            ? { count: stats.pending_notifications, color: 'bg-red-500' }
            : undefined,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">Bảng điều khiển giảng viên</h1>
          <p className="text-blue-100 text-lg">
            Quản lý hoạt động, học viên và thông báo từ một nơi
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Cards */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Tổng hoạt động</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_activities}</p>
                </div>
                <Activity className="w-12 h-12 text-blue-100" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Chờ duyệt</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pending_approval}</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-100" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Đã phê duyệt</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.approved_activities}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-100" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Tổng học viên</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_students}</p>
                </div>
                <Users className="w-12 h-12 text-purple-100" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuSections.map((section) => (
            <div
              key={section.title}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
            >
              {/* Section Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b flex items-center gap-3">
                <div className="text-blue-600">{section.icon}</div>
                <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
              </div>

              {/* Menu Items */}
              <div className="divide-y">
                {section.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="px-6 py-4 hover:bg-blue-50 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-gray-600 group-hover:text-blue-600 transition">
                        {item.icon}
                      </div>
                      <span className="text-gray-700 group-hover:text-blue-600 font-medium transition">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold text-white ${item.badge.color}`}
                        >
                          {item.badge.count}
                        </span>
                      )}
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition opacity-0 group-hover:opacity-100" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-white rounded-lg shadow p-8 border-t-4 border-blue-500">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">⚡ Hành động nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/teacher/activities"
              className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition text-center"
            >
              <div className="text-3xl mb-2">📝</div>
              <p className="font-bold text-blue-900">Tạo hoạt động</p>
            </Link>
            <Link
              href="/teacher/approvals"
              className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg hover:bg-yellow-100 hover:border-yellow-400 transition text-center"
            >
              <div className="text-3xl mb-2">⏳</div>
              <p className="font-bold text-yellow-900">Theo dõi duyệt</p>
            </Link>
            <Link
              href="/teacher/attendance"
              className="p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 hover:border-green-400 transition text-center"
            >
              <div className="text-3xl mb-2">✓</div>
              <p className="font-bold text-green-900">Dấu danh</p>
            </Link>
            <Link
              href="/teacher/notifications/broadcast"
              className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition text-center"
            >
              <div className="text-3xl mb-2">📢</div>
              <p className="font-bold text-purple-900">Gửi thông báo</p>
            </Link>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900 mb-2">Mẹo quản lý hoạt động</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Tạo nháp trước khi gửi duyệt</li>
                  <li>✓ Cập nhật hoạt động bị từ chối để gửi lại</li>
                  <li>✓ Theo dõi trạng thái duyệt thường xuyên</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <Users className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-green-900 mb-2">Quản lý học viên</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✓ Dấu danh với mức độ đạt được</li>
                  <li>✓ Ghi chú riêng tư về học viên</li>
                  <li>✓ Đề xuất giải thưởng xuất sắc</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
