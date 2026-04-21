'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  ClipboardCheck,
  Bell,
  AlertTriangle,
  Award,
  Settings,
  Menu,
  X,
  BookOpen,
  Target,
  FileText,
  QrCode,
  Trophy,
  Laptop,
  User,
  School,
  CheckSquare,
  BarChart3,
  Sliders,
  Clock,
  PieChart,
  Palette,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(resolveClientFetchUrl('/api/notifications'));
      const data = await res.json();
      if (res.ok) {
        setUnreadCount(data.meta?.total_unread || 0);
      }
    } catch (error) {
      console.error('Fetch unread count error:', error);
    }
  };

  if (!user) return null;

  const adminNavigation: NavSection[] = [
    {
      title: 'TỔNG QUAN',
      items: [{ label: 'Tổng quan quản trị', href: '/admin/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'NGƯỜI DÙNG & LỚP',
      items: [
        { label: 'Người dùng', href: '/admin/users', icon: Users },
        { label: 'Lớp học', href: '/admin/classes', icon: School },
        { label: 'Import người dùng', href: '/admin/users/import', icon: FileText },
      ],
    },
    {
      title: 'HOẠT ĐỘNG & ĐIỂM DANH',
      items: [
        { label: 'Quản lý hoạt động', href: '/admin/activities', icon: Calendar },
        { label: 'Phê duyệt hoạt động', href: '/admin/approvals', icon: CheckSquare },
        { label: 'Điểm danh', href: '/admin/attendance', icon: UserCheck },
        { label: 'Khung thời gian', href: '/admin/time-slots', icon: Clock },
      ],
    },
    {
      title: 'ĐIỂM, THƯỞNG & XẾP HẠNG',
      items: [
        { label: 'Điểm cá nhân', href: '/admin/scores', icon: BarChart3 },
        { label: 'Bảng xếp hạng', href: '/admin/leaderboard', icon: BarChart3 },
        { label: 'Tính điểm', href: '/admin/scoring', icon: BarChart3 },
        { label: 'Cấu hình tính điểm', href: '/admin/scoring-config', icon: Sliders },
        { label: 'Khen thưởng', href: '/admin/awards', icon: Award },
        { label: 'Loại khen thưởng', href: '/admin/award-types', icon: Trophy },
        { label: 'Duyệt cộng điểm', href: '/admin/bonus-approval', icon: CheckSquare },
        { label: 'Báo cáo cộng điểm', href: '/admin/bonus-reports', icon: FileText },
      ],
    },
    {
      title: 'BÁO CÁO & TRA SOÁT',
      items: [
        { label: 'Báo cáo tham gia', href: '/admin/reports/participation', icon: FileText },
        { label: 'Báo cáo tùy chỉnh', href: '/admin/reports/custom', icon: PieChart },
        { label: 'Thông báo', href: '/admin/notifications', icon: Bell, badge: unreadCount },
        { label: 'Tìm kiếm nâng cao', href: '/admin/search', icon: Users },
        { label: 'Cảnh báo', href: '/admin/alerts', icon: AlertTriangle },
        { label: 'Nhật ký hệ thống', href: '/admin/audit', icon: FileText },
      ],
    },
    {
      title: 'CẤU HÌNH & HỆ THỐNG',
      items: [
        { label: 'Loại hoạt động', href: '/admin/activity-types', icon: BookOpen },
        { label: 'Cấp độ tổ chức', href: '/admin/organization-levels', icon: Target },
        { label: 'Cài đặt QR', href: '/admin/system-config/qr-settings', icon: QrCode },
        {
          label: 'Chính sách điểm danh',
          href: '/admin/system-config/attendance-policy',
          icon: Sliders,
        },
        { label: 'Thiết kế QR', href: '/admin/system-config/qr-design', icon: Palette },
        {
          label: 'Hạn chót phê duyệt',
          href: '/admin/system-config/approval-deadline',
          icon: Clock,
        },
        { label: 'Cấu hình nâng cao', href: '/admin/system-config/advanced', icon: Settings },
        { label: 'Cài đặt hệ thống', href: '/admin/settings', icon: Settings },
        { label: 'Sức khỏe hệ thống', href: '/admin/system-health', icon: BarChart3 },
        { label: 'Sao lưu & Phục hồi', href: '/admin/backup', icon: Database },
      ],
    },
  ];

  const teacherNavigation: NavSection[] = [
    {
      title: 'TỔNG QUAN',
      items: [{ label: 'Tổng quan giảng viên', href: '/teacher/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'QUẢN LÝ HOẠT ĐỘNG',
      items: [
        { label: 'Hoạt động của tôi', href: '/teacher/activities', icon: BookOpen },
        { label: 'Phê duyệt', href: '/teacher/approvals', icon: CheckSquare },
        { label: 'Học viên', href: '/teacher/students', icon: Users },
        { label: 'Lớp học', href: '/teacher/classes', icon: School },
      ],
    },
    {
      title: 'ĐIỂM DANH & ĐÁNH GIÁ',
      items: [
        { label: 'Điểm danh', href: '/teacher/attendance', icon: UserCheck },
        { label: 'Chính sách điểm danh', href: '/teacher/attendance/policy', icon: Sliders },
        { label: 'QR Điểm danh', href: '/teacher/qr', icon: QrCode },
      ],
    },
    {
      title: 'THÔNG BÁO & KHẢO SÁT',
      items: [
        {
          label: 'Hộp thư thông báo',
          href: '/teacher/notifications',
          icon: Bell,
          badge: unreadCount,
        },
        { label: 'Thông báo học viên', href: '/teacher/notify-students', icon: Bell },
        { label: 'Khảo sát', href: '/teacher/polls', icon: ClipboardCheck },
        { label: 'Cảnh báo', href: '/teacher/alerts', icon: AlertTriangle },
      ],
    },
    {
      title: 'BÁO CÁO',
      items: [
        { label: 'Báo cáo tham gia', href: '/teacher/reports/participation', icon: FileText },
      ],
    },
  ];

  const studentNavigation: NavSection[] = [
    {
      title: 'TỔNG QUAN',
      items: [{ label: 'Tổng quan học viên', href: '/student/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'HOẠT ĐỘNG CỦA TÔI',
      items: [
        { label: 'Đăng ký hoạt động', href: '/student/activities', icon: ClipboardCheck },
        { label: 'Hoạt động của tôi', href: '/student/my-activities', icon: BookOpen },
        { label: 'Lịch sử', href: '/student/history', icon: FileText },
      ],
    },
    {
      title: 'ĐIỂM & GIẢI THƯỞNG',
      items: [
        { label: 'Điểm số', href: '/student/points', icon: BarChart3 },
        { label: 'Bảng điểm', href: '/student/scores', icon: BarChart3 },
        { label: 'Bảng xếp hạng', href: '/student/ranking', icon: Trophy },
        { label: 'Phân tích điểm', href: '/student/points', icon: PieChart },
        { label: 'Giải thưởng', href: '/student/awards', icon: Trophy },
      ],
    },
    {
      title: 'TIỆN ÍCH',
      items: [
        { label: 'Lịch sử', href: '/student/history', icon: Clock },
        { label: 'Quét QR', href: '/student/activities', icon: QrCode },
        { label: 'Khảo sát', href: '/student/polls', icon: ClipboardCheck },
        { label: 'Thông báo', href: '/student/notifications', icon: Bell, badge: unreadCount },
        { label: 'Thiết bị', href: '/student/devices', icon: Laptop },
        { label: 'Hồ sơ', href: '/student/profile', icon: User },
      ],
    },
  ];

  const navigation =
    user.role === 'admin'
      ? adminNavigation
      : user.role === 'teacher'
        ? teacherNavigation
        : studentNavigation;

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === path;
    }
    if (path === '/teacher/attendance' && pathname?.startsWith('/teacher/attendance/policy')) {
      return false;
    }
    if (pathname === path) return true;
    if (pathname?.startsWith(path + '/')) return true;
    if (
      path === '/activities' &&
      pathname?.startsWith('/activities') &&
      !pathname.includes('activity-types')
    )
      return true;
    if (path === '/admin/approvals' && pathname?.includes('approvals')) return true;
    return false;
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-lg bg-gray-900 text-white shadow-xl hover:bg-gray-800 active:bg-gray-700 transition-all"
        aria-label="Mở hoặc đóng menu"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        {mobileOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`
          fixed left-0 top-0 h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white
          transition-all duration-300 ease-in-out shadow-2xl
          flex flex-col overflow-y-auto
          ${collapsed ? 'lg:w-20 w-64' : 'w-64'}
          ${mobileOpen ? 'translate-x-0 z-40' : '-translate-x-full lg:translate-x-0 z-40'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
          {!collapsed ? (
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎓</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-blue-400">UniAct</span>
                <span className="text-xs text-gray-400">Cổng Hoạt Động</span>
              </div>
            </div>
          ) : (
            <span className="text-2xl mx-auto">🌿</span>
          )}
        </div>

        {/* User Info */}
        <div className={`px-4 py-4 border-b border-gray-700 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed ? (
            <>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                {user.role === 'admin' && '👑 Quản trị viên'}
                {user.role === 'teacher' && '👨‍🏫 Giảng viên'}
                {user.role === 'student' && '🎓 Học viên'}
              </div>
            </>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold mx-auto">
              {user.name?.charAt(0) || 'U'}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 pb-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {navigation.map((section, idx) => (
            <div key={idx}>
              {!collapsed && section.title && (
                <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center px-3 py-3 rounded-lg transition-all duration-200 min-h-[44px]
                        ${
                          active
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50'
                            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        }
                        ${collapsed ? 'justify-center' : 'justify-start'}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={`${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-700 p-4 space-y-2 bg-gray-900/50">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center px-3 py-3 rounded-lg min-h-[44px]
              text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200
              ${collapsed ? 'justify-center' : 'justify-start'}
            `}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <LogOut className={`${collapsed ? '' : 'mr-3'} h-5 w-5`} />
            {!collapsed && <span className="text-sm font-medium">Đăng xuất</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200"
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </>
  );
}
