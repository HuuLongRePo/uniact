'use client';

import React, { useEffect, useState } from 'react';
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
      title: 'THÔNG BÁO & CẢNH BÁO',
      items: [
        { label: 'Thông báo', href: '/admin/notifications', icon: Bell, badge: unreadCount },
        { label: 'Cảnh báo', href: '/admin/alerts', icon: AlertTriangle },
      ],
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
        { label: 'Tìm kiếm nâng cao', href: '/admin/search', icon: Users },
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
        { label: 'QR điểm danh', href: '/teacher/qr', icon: QrCode },
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
      title: 'THÔNG BÁO & TIỆN ÍCH',
      items: [
        { label: 'Thông báo', href: '/student/notifications', icon: Bell, badge: unreadCount },
        { label: 'Quét QR', href: '/student/activities', icon: QrCode },
        { label: 'Khảo sát', href: '/student/polls', icon: ClipboardCheck },
        { label: 'Thiết bị', href: '/student/devices', icon: Laptop },
        { label: 'Hồ sơ', href: '/student/profile', icon: User },
      ],
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
      items: [{ label: 'Lịch sử', href: '/student/history', icon: Clock }],
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
    ) {
      return true;
    }
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
        className="fixed left-4 top-4 z-50 rounded-lg bg-gray-900 p-3 text-white shadow-xl transition-all hover:bg-gray-800 active:bg-gray-700 lg:hidden"
        aria-label="Mở hoặc đóng menu"
        style={{ minWidth: '44px', minHeight: '44px' }}
      >
        {mobileOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`
          fixed left-0 top-0 z-40 flex h-screen flex-col overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-64 lg:w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-5">
          {!collapsed ? (
            <div className="flex items-center space-x-2">
              <span className="text-2xl">UniAct</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-blue-400">UniAct</span>
                <span className="text-xs text-gray-400">Cổng hoạt động</span>
              </div>
            </div>
          ) : (
            <span className="mx-auto text-2xl">UA</span>
          )}
        </div>

        <div className={`border-b border-gray-700 px-4 py-4 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed ? (
            <>
              <div className="mb-2 flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 font-bold text-white">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{user.name}</p>
                  <p className="truncate text-xs text-gray-400">{user.email}</p>
                </div>
              </div>
              <div className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
                {user.role === 'admin' && 'Quản trị viên'}
                {user.role === 'teacher' && 'Giảng viên'}
                {user.role === 'student' && 'Học viên'}
              </div>
            </>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 font-bold text-white">
              {user.name?.charAt(0) || 'U'}
            </div>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-2 py-4 pb-6">
          {navigation.map((section, idx) => (
            <div key={idx}>
              {!collapsed && section.title && (
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
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
                        flex min-h-[44px] items-center rounded-lg px-3 py-3 transition-all duration-200
                        ${active ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}
                        ${collapsed ? 'justify-center' : 'justify-start'}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={`${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
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

        <div className="flex-shrink-0 space-y-2 border-t border-gray-700 bg-gray-900/50 p-4">
          <button
            onClick={handleLogout}
            className={`
              flex w-full min-h-[44px] items-center rounded-lg px-3 py-3 text-gray-300 transition-all duration-200 hover:bg-red-600/20 hover:text-red-400
              ${collapsed ? 'justify-center' : 'justify-start'}
            `}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <LogOut className={`${collapsed ? '' : 'mr-3'} h-5 w-5`} />
            {!collapsed && <span className="text-sm font-medium">Đăng xuất</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden w-full items-center justify-center rounded-lg px-3 py-2 text-gray-400 transition-all duration-200 hover:bg-gray-700/50 hover:text-white lg:flex"
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </>
  );
}
