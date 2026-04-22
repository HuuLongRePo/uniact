'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Activity, Users, TrendingUp, Shield, Zap, BarChart3, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Activity,
    title: 'Quản lý hoạt động',
    description:
      'Tổ chức và theo dõi hoạt động rèn luyện, học tập, thực địa theo quy trình nội bộ.',
  },
  {
    icon: Users,
    title: 'Điểm danh học viên',
    description:
      'Giảng viên mở QR điểm danh, học viên quét trực tiếp trên điện thoại hoặc máy tính bảng.',
  },
  {
    icon: TrendingUp,
    title: 'Tính điểm tự động',
    description: 'Tự động tổng hợp điểm rèn luyện và dữ liệu xếp hạng theo kỳ.',
  },
  {
    icon: Shield,
    title: 'An toàn nội bộ',
    description: 'Thiết kế cho môi trường mạng nội bộ với kiểm soát truy cập theo vai trò.',
  },
  {
    icon: Zap,
    title: 'Xử lý nhanh',
    description: 'Tối ưu cho thiết bị phổ thông, phản hồi nhanh trong giờ cao điểm.',
  },
  {
    icon: BarChart3,
    title: 'Báo cáo toàn diện',
    description: 'Theo dõi tiến độ hoạt động, điểm danh, điểm số và kết quả theo lớp.',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const dashboardUrl =
        user.role === 'admin'
          ? '/admin/dashboard'
          : user.role === 'teacher'
            ? '/teacher/dashboard'
            : '/student/dashboard';
      router.push(dashboardUrl);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={shellBackgroundStyle}>
        <div className="animate-spin">
          <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen" style={shellBackgroundStyle}>
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{
          borderColor: 'var(--app-border-default)',
          background: 'color-mix(in srgb, var(--app-surface-base) 90%, rgba(255,255,255,0.15) 10%)',
        }}
      >
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            <span className="text-lg font-bold sm:text-xl" style={textStrongStyle}>
              ANND Activity Hub
            </span>
          </div>
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Đăng nhập
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-8 lg:py-16">
          <div className="space-y-6">
            <div
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
              style={accentPillStyle}
            >
              Nền tảng nội bộ ANND
            </div>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl" style={textStrongStyle}>
              Trung tâm hoạt động
              <span style={{ color: 'var(--app-link)' }}> Trường Đại học An ninh nhân dân</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 sm:text-lg" style={textDefaultStyle}>
              Hệ thống quản lý hoạt động ngoại khóa, đăng ký, điểm danh, chấm điểm và thông báo dành
              cho học viên, giảng viên và quản trị viên.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Đăng nhập hệ thống
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: 'Auth', label: 'Xác thực vai trò' },
                { value: 'QR', label: 'Điểm danh thời gian thực' },
                { value: 'Score', label: 'Tổng hợp điểm tự động' },
              ].map((item) => (
                <div
                  key={item.value}
                  className="content-card rounded-2xl border border-gray-200 p-3"
                  style={metricCardStyle}
                >
                  <div className="text-xs uppercase tracking-wide" style={textMutedStyle}>
                    {item.value}
                  </div>
                  <div className="mt-1 text-sm font-medium" style={textDefaultStyle}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside
            className="content-card rounded-3xl border border-gray-200 p-5 shadow-lg sm:p-6"
            style={sidePanelStyle}
          >
            <div className="space-y-4 rounded-2xl border border-blue-200 p-4" style={accentBlockStyle}>
              <div className="h-11 rounded-xl bg-gradient-to-r from-blue-200 to-indigo-200" />
              <div className="space-y-2">
                <div className="h-3 rounded bg-blue-200/70" />
                <div className="h-3 w-10/12 rounded bg-blue-200/60" />
                <div className="h-3 w-8/12 rounded bg-blue-200/50" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 p-3" style={metricCardStyle}>
                <p className="text-xs" style={textMutedStyle}>
                  Luồng chính
                </p>
                <p className="mt-1 text-sm font-semibold" style={textStrongStyle}>
                  Đăng ký → Điểm danh
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 p-3" style={metricCardStyle}>
                <p className="text-xs" style={textMutedStyle}>
                  Thông báo
                </p>
                <p className="mt-1 text-sm font-semibold" style={textStrongStyle}>
                  Realtime theo actor
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div
            className="rounded-3xl border border-gray-200 p-5 shadow-sm backdrop-blur-xl sm:p-7"
            style={featureShellStyle}
          >
            <h2 className="text-3xl font-bold sm:text-4xl" style={textStrongStyle}>
              Tính năng chính
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="content-card rounded-2xl border border-gray-200 p-5 transition-colors hover:bg-gray-50"
                  style={cardSurfaceStyle}
                >
                  <feature.icon className="h-10 w-10 text-blue-600" />
                  <h3 className="mt-4 text-xl font-semibold" style={textStrongStyle}>
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6" style={textDefaultStyle}>
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        className="border-t py-8"
        style={{
          borderColor: 'var(--app-border-default)',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--app-surface-base) 92%, transparent 8%), var(--app-surface-base))',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center text-sm sm:px-6 lg:px-8" style={textDefaultStyle}>
          <p>© 2026 Trường Đại học An ninh nhân dân - Bộ Công an. Tất cả quyền được bảo lưu.</p>
          <p className="mt-2 text-xs" style={textMutedStyle}>
            Hệ thống nội bộ dành cho cán bộ và học viên ANND
          </p>
        </div>
      </footer>
    </div>
  );
}

const shellBackgroundStyle = {
  background:
    'radial-gradient(circle at 8% 8%, color-mix(in srgb, var(--app-accent-subtle-bg) 85%, transparent 15%) 0%, transparent 44%), linear-gradient(160deg, color-mix(in srgb, var(--app-shell-bg-start) 90%, #ffffff 10%) 0%, var(--app-shell-bg-end) 100%)',
};

const textStrongStyle = {
  color: 'var(--app-text-strong)',
};

const textDefaultStyle = {
  color: 'var(--app-text-default)',
};

const textMutedStyle = {
  color: 'var(--app-text-muted)',
};

const accentPillStyle = {
  color: 'var(--app-accent-subtle-text)',
  border: '1px solid color-mix(in srgb, var(--app-link) 25%, transparent)',
  background:
    'linear-gradient(120deg, color-mix(in srgb, var(--app-accent-subtle-bg) 92%, transparent), color-mix(in srgb, var(--app-accent-subtle-bg-hover) 74%, transparent))',
};

const cardSurfaceStyle = {
  background: 'color-mix(in srgb, var(--app-surface-base) 94%, transparent)',
};

const metricCardStyle = {
  background: 'color-mix(in srgb, var(--app-surface-elevated) 78%, transparent)',
};

const sidePanelStyle = {
  background:
    'linear-gradient(170deg, color-mix(in srgb, var(--app-surface-base) 90%, transparent), color-mix(in srgb, var(--app-surface-elevated) 88%, transparent))',
};

const accentBlockStyle = {
  background:
    'linear-gradient(130deg, color-mix(in srgb, var(--app-accent-subtle-bg) 84%, transparent), color-mix(in srgb, var(--app-surface-base) 88%, transparent))',
};

const featureShellStyle = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--app-surface-base) 95%, transparent), color-mix(in srgb, var(--app-surface-elevated) 90%, transparent))',
};
