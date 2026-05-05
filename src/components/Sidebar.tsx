'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Database,
  FileText,
  Laptop,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  PieChart,
  QrCode,
  ScanFace,
  School,
  Search,
  Settings,
  Sliders,
  Sparkles,
  Target,
  Trophy,
  User,
  UserCheck,
  Users,
  X,
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

const SIDEBAR_EXPANDED_WIDTH = '18rem';
const SIDEBAR_COLLAPSED_WIDTH = '5.5rem';

function dedupeNavigation(sections: NavSection[]): NavSection[] {
  return sections
    .map((section) => {
      const seen = new Set<string>();
      const items = section.items.filter((item) => {
        if (seen.has(item.href)) return false;
        seen.add(item.href);
        return true;
      });
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    void fetchUnreadCount();
    const interval = setInterval(() => {
      void fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      '--app-sidebar-current-width',
      collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
    );
    root.style.setProperty('--app-mobile-nav-offset', user ? '6.5rem' : '0rem');

    return () => {
      root.style.removeProperty('--app-sidebar-current-width');
      root.style.removeProperty('--app-mobile-nav-offset');
    };
  }, [collapsed, user]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  async function fetchUnreadCount() {
    try {
      const res = await fetch(resolveClientFetchUrl('/api/notifications'));
      const data = await res.json();
      if (res.ok) {
        setUnreadCount(data.meta?.total_unread || data.data?.meta?.total_unread || 0);
      }
    } catch (error) {
      console.error('Fetch unread count error:', error);
    }
  }

  if (!user) return null;

  const adminNavigation = dedupeNavigation([
    {
      title: 'Tổng quan',
      items: [{ label: 'Bảng điều khiển', href: '/admin/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Vận hành hằng ngày',
      items: [
        { label: 'Quản lý hoạt động', href: '/admin/activities', icon: BookOpen },
        { label: 'Phê duyệt hoạt động', href: '/admin/approvals', icon: CheckSquare },
        { label: 'Điểm danh', href: '/admin/attendance', icon: UserCheck },
        { label: 'Thông báo', href: '/admin/notifications', icon: Bell, badge: unreadCount },
        { label: 'Cảnh báo', href: '/admin/alerts', icon: AlertTriangle },
      ],
    },
    {
      title: 'Người dùng và lớp học',
      items: [
        { label: 'Học viên', href: '/admin/students', icon: School },
        { label: 'Giảng viên', href: '/admin/teachers', icon: User },
        { label: 'Người dùng', href: '/admin/users', icon: Users },
        { label: 'Lớp học', href: '/admin/classes', icon: School },
        { label: 'Nhập người dùng', href: '/admin/users/import', icon: FileText },
      ],
    },
    {
      title: 'Điểm và xếp hạng',
      items: [
        { label: 'Điểm học viên', href: '/admin/scores', icon: BarChart3 },
        { label: 'Bảng xếp hạng', href: '/admin/leaderboard', icon: Trophy },
        { label: 'Bảng điểm tổng hợp', href: '/admin/scoreboard', icon: PieChart },
        { label: 'Tính điểm', href: '/admin/scoring', icon: CheckSquare },
        { label: 'Cấu hình tính điểm', href: '/admin/scoring-config', icon: Sliders },
        { label: 'Khen thưởng', href: '/admin/awards', icon: Award },
        { label: 'Loại khen thưởng', href: '/admin/award-types', icon: Trophy },
        { label: 'Duyệt cộng điểm', href: '/admin/bonus-approval', icon: CheckSquare },
        { label: 'Báo cáo cộng điểm', href: '/admin/bonus-reports', icon: FileText },
      ],
    },
    {
      title: 'Báo cáo và phân tích',
      items: [
        { label: 'Báo cáo tổng quan', href: '/admin/reports', icon: FileText },
        { label: 'Báo cáo hoạt động', href: '/admin/reports/activity-statistics', icon: PieChart },
        { label: 'Báo cáo điểm số', href: '/admin/reports/scores', icon: BarChart3 },
        { label: 'Báo cáo giảng viên', href: '/admin/reports/teachers', icon: Users },
        { label: 'Tìm kiếm nâng cao', href: '/admin/search', icon: Search },
      ],
    },
    {
      title: 'Cấu hình và hệ thống',
      items: [
        { label: 'Mẫu hoạt động', href: '/admin/activity-templates', icon: Sparkles },
        { label: 'Loại hoạt động', href: '/admin/activity-types', icon: Target },
        { label: 'Khung thời gian', href: '/admin/time-slots', icon: Clock },
        { label: 'Cấp độ tổ chức', href: '/admin/organization-levels', icon: Target },
        { label: 'Chính sách điểm danh', href: '/admin/system-config/attendance-policy', icon: Sliders },
        { label: 'Nhật ký hệ thống', href: '/admin/audit', icon: FileText },
        { label: 'Nhật ký chi tiết', href: '/admin/audit-logs', icon: FileText },
        { label: 'Cài đặt QR', href: '/admin/system-config/qr-settings', icon: QrCode },
        { label: 'Thiết kế QR', href: '/admin/system-config/qr-design', icon: Palette },
        { label: 'Hạn chót phê duyệt', href: '/admin/system-config/approval-deadline', icon: Clock },
        { label: 'Sinh trắc học', href: '/admin/biometrics', icon: ScanFace },
        { label: 'Sức khỏe hệ thống', href: '/admin/system-health', icon: BarChart3 },
        { label: 'Cài đặt hệ thống', href: '/admin/settings', icon: Settings },
        { label: 'Cấu hình nâng cao', href: '/admin/system-config/advanced', icon: Sliders },
        { label: 'Sao lưu và phục hồi', href: '/admin/backup', icon: Database },
      ],
    },
  ]);

  const teacherNavigation = dedupeNavigation([
    {
      title: 'Tổng quan',
      items: [{ label: 'Bảng điều khiển', href: '/teacher/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Vận hành hằng ngày',
      items: [
        { label: 'Điểm danh', href: '/teacher/attendance', icon: UserCheck },
        { label: 'Mở QR điểm danh', href: '/teacher/qr', icon: QrCode },
        { label: 'Điểm danh khuôn mặt', href: '/teacher/attendance/face', icon: ScanFace },
        { label: 'Hoạt động của tôi', href: '/teacher/activities', icon: BookOpen },
        { label: 'Học viên', href: '/teacher/students', icon: Users },
        { label: 'Lớp học', href: '/teacher/classes', icon: School },
        { label: 'Phê duyệt', href: '/teacher/approvals', icon: CheckSquare },
      ],
    },
    {
      title: 'Tương tác học viên',
      items: [
        { label: 'Thông báo', href: '/teacher/notifications', icon: Bell, badge: unreadCount },
        { label: 'Gửi theo học viên', href: '/teacher/notify-students', icon: Bell },
        { label: 'Gửi theo lớp khối', href: '/teacher/notifications/broadcast', icon: Bell },
        { label: 'Khảo sát', href: '/teacher/polls', icon: ClipboardCheck },
        { label: 'Cảnh báo', href: '/teacher/alerts', icon: AlertTriangle },
        { label: 'Sổ tay học viên', href: '/teacher/students/notes', icon: FileText },
      ],
    },
    {
      title: 'Báo cáo và đề xuất',
      items: [
        { label: 'Báo cáo tham gia', href: '/teacher/reports/participation', icon: FileText },
        { label: 'Báo cáo điểm danh', href: '/teacher/reports/attendance', icon: PieChart },
        { label: 'Báo cáo theo lớp', href: '/teacher/reports/class-stats', icon: BarChart3 },
        { label: 'Đề xuất khen thưởng', href: '/teacher/awards/suggestions', icon: Award },
        { label: 'Đề xuất cộng điểm', href: '/teacher/bonus-proposal', icon: BarChart3 },
      ],
    },
    {
      title: 'Cài đặt và sinh trắc học',
      items: [
        { label: 'Chính sách điểm danh', href: '/teacher/attendance/policy', icon: Sliders },
        { label: 'Sinh trắc học', href: '/teacher/biometrics', icon: ScanFace },
        { label: 'Lịch sử gửi', href: '/teacher/notifications/history', icon: Clock },
        { label: 'Cài đặt thông báo', href: '/teacher/notifications/settings', icon: Settings },
      ],
    },
  ]);

  const studentNavigation = dedupeNavigation([
    {
      title: 'Dùng hằng ngày',
      items: [
        { label: 'Quét QR điểm danh', href: '/student/check-in', icon: QrCode },
        { label: 'Hoạt động của tôi', href: '/student/my-activities', icon: BookOpen },
        { label: 'Thông báo', href: '/student/notifications', icon: Bell, badge: unreadCount },
        { label: 'Cảnh báo', href: '/student/alerts', icon: AlertTriangle },
        { label: 'Khảo sát', href: '/student/polls', icon: ClipboardCheck },
        { label: 'Bảng điều khiển', href: '/student/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Điểm số và thành tích',
      items: [
        { label: 'Điểm rèn luyện', href: '/student/points', icon: BarChart3 },
        { label: 'Bảng điểm', href: '/student/scores', icon: PieChart },
        { label: 'Bảng xếp hạng', href: '/student/ranking', icon: Trophy },
        { label: 'Lịch sử tham gia', href: '/student/history', icon: Clock },
        { label: 'Giải thưởng', href: '/student/awards', icon: Award },
        { label: 'Giải thưởng sắp diễn ra', href: '/student/awards/upcoming', icon: Sparkles },
        { label: 'Lịch sử giải thưởng', href: '/student/awards/history', icon: Clock },
        { label: 'Mẹo thành tích', href: '/student/achievements/tips', icon: Sparkles },
      ],
    },
    {
      title: 'Khám phá hoạt động',
      items: [
        { label: 'Khám phá hoạt động', href: '/student/activities', icon: Sparkles },
        { label: 'Gợi ý hoạt động', href: '/student/recommendations', icon: Target },
      ],
    },
    {
      title: 'Tài khoản',
      items: [
        { label: 'Hồ sơ cá nhân', href: '/student/profile', icon: User },
        { label: 'Thiết bị đăng nhập', href: '/student/devices', icon: Laptop },
      ],
    },
  ]);

  const navigation =
    user.role === 'admin' ? adminNavigation : user.role === 'teacher' ? teacherNavigation : studentNavigation;

  const isActive = (path: string) => {
    if (pathname === path) return true;
    if (path === '/teacher/attendance' && pathname?.startsWith('/teacher/attendance/policy')) return false;
    if (path === '/teacher/attendance' && pathname?.startsWith('/teacher/attendance/face')) return false;
    if (path === '/admin/settings' && pathname?.startsWith('/admin/system-config')) return false;
    return Boolean(pathname?.startsWith(`${path}/`));
  };

  async function handleLogout() {
    setMobileOpen(false);
    await logout();
  }

  const roleLabel = user.role === 'admin' ? 'Quản trị viên' : user.role === 'teacher' ? 'Giảng viên' : 'Học viên';

  return (
    <>
      <button
        onClick={() => setMobileOpen((current) => !current)}
        className={`fixed top-4 z-[55] rounded-2xl border p-3 text-white shadow-2xl backdrop-blur transition-colors xl:hidden ${
          mobileOpen
            ? 'border-cyan-300/40 bg-slate-900/95 shadow-cyan-900/30'
            : 'border-white/20 bg-slate-950/90 shadow-slate-950/30'
        }`}
        aria-label="Mở hoặc đóng điều hướng"
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
        data-testid="mobile-sidebar-toggle"
        style={{
          minWidth: '48px',
          minHeight: '48px',
          right: 'max(0.875rem, env(safe-area-inset-right))',
          top: 'max(0.875rem, env(safe-area-inset-top))',
        }}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm xl:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        data-testid="app-sidebar"
        className={`fixed left-0 top-0 z-40 flex h-screen w-[18rem] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_34%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(15,23,42,0.94))] text-white shadow-2xl shadow-slate-950/30 transition-all duration-300 ease-out ${
          collapsed ? 'xl:w-[5.5rem]' : 'xl:w-[18rem]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}`}
        style={
          {
            '--sidebar-expanded-width': SIDEBAR_EXPANDED_WIDTH,
            '--sidebar-collapsed-width': SIDEBAR_COLLAPSED_WIDTH,
            paddingTop: 'max(0px, env(safe-area-inset-top) - 0.25rem)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          } as React.CSSProperties
        }
      >
        <div className="border-b border-white/10 px-4 py-5">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-emerald-400 text-lg font-semibold text-slate-950 shadow-lg shadow-cyan-500/20">
                  UA
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold tracking-[0.04em]">UniAct</div>
                  <div className="truncate text-xs text-slate-300">Cổng điều phối hoạt động và điểm danh</div>
                </div>
              </div>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-emerald-400 text-lg font-semibold text-slate-950 shadow-lg shadow-cyan-500/20">
                UA
              </div>
            )}
          </div>
        </div>

        <div className={`border-b border-white/10 px-4 py-4 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed ? (
            <div className="rounded-2xl border border-white/10 bg-white/6 p-3 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-sm font-semibold text-white">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                  <p className="truncate text-xs text-slate-300">{user.email}</p>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/12 px-2.5 py-1 text-xs font-medium text-emerald-200">
                {roleLabel}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12 text-sm font-semibold text-white">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {navigation.map((section) => (
            <section key={section.title ?? section.items[0]?.href}>
              {!collapsed && section.title && (
                <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {section.title}
                </h3>
              )}

              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex min-h-[46px] items-center rounded-2xl border px-3 py-3 transition-all duration-200 ${
                        active
                          ? 'border-cyan-300/40 bg-gradient-to-r from-cyan-400/18 via-sky-400/14 to-emerald-400/14 text-white shadow-lg shadow-cyan-950/20'
                          : 'border-transparent text-slate-200 hover:border-white/8 hover:bg-white/8 hover:text-white'
                      } ${collapsed ? 'justify-center' : 'justify-start'}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={`${collapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
                          active ? 'text-cyan-200' : 'text-slate-300 group-hover:text-white'
                        }`}
                      />
                      {!collapsed && (
                        <>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="ml-3 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm shadow-rose-950/30">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 bg-slate-950/30 p-4 backdrop-blur">
          <button
            onClick={handleLogout}
            className={`flex min-h-[46px] w-full items-center rounded-2xl border border-transparent px-3 py-3 text-slate-200 transition-all duration-200 hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-100 ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
            title={collapsed ? 'Đăng xuất' : undefined}
          >
            <LogOut className={`${collapsed ? '' : 'mr-3'} h-5 w-5`} />
            {!collapsed && <span className="text-sm font-medium">Đăng xuất</span>}
          </button>

          <button
            onClick={() => setCollapsed((current) => !current)}
            className="hidden min-h-[42px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300 transition-all duration-200 hover:bg-white/10 hover:text-white xl:flex"
            title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>
    </>
  );
}
