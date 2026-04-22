'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Activity, ArrowRight, BarChart3, Shield, TrendingUp, Users, Zap } from 'lucide-react';

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
      <div className="landing-shell flex min-h-screen items-center justify-center">
        <div className="animate-spin">
          <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="landing-shell">
      <header className="landing-nav sticky top-0 z-50">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            <span className="landing-text-strong text-lg font-bold sm:text-xl">
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
        <section className="landing-hero mx-auto grid w-full max-w-7xl gap-8 rounded-3xl px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-8 lg:py-10">
          <div className="space-y-6">
            <div
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
              style={{
                color: 'var(--app-accent-subtle-text)',
                border: '1px solid color-mix(in srgb, var(--app-link) 28%, transparent)',
                background: 'var(--app-accent-subtle-bg)',
              }}
            >
              Nền tảng nội bộ ANND
            </div>
            <h1 className="landing-text-strong text-4xl font-bold leading-tight sm:text-5xl">
              Trung tâm hoạt động
              <span className="landing-link" style={{ color: 'var(--app-link)' }}>
                {' '}
                Trường Đại học An ninh nhân dân
              </span>
            </h1>
            <p className="landing-text-default max-w-2xl text-base leading-7 sm:text-lg">
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
                <div key={item.value} className="landing-metric rounded-2xl p-3">
                  <div className="landing-text-muted text-xs uppercase tracking-wide">
                    {item.value}
                  </div>
                  <div className="landing-text-default mt-1 text-sm font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="landing-panel rounded-3xl p-5 sm:p-6">
            <div className="landing-panel-outline space-y-4 rounded-2xl p-4">
              <div className="landing-skeleton h-11 rounded-xl" />
              <div className="space-y-2">
                <div className="landing-skeleton h-3 rounded" />
                <div className="landing-skeleton h-3 w-10/12 rounded" />
                <div className="landing-skeleton h-3 w-8/12 rounded" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="landing-metric rounded-2xl p-3">
                <p className="landing-text-muted text-xs">Luồng chính</p>
                <p className="landing-text-strong mt-1 text-sm font-semibold">
                  Đăng ký → Điểm danh
                </p>
              </div>
              <div className="landing-metric rounded-2xl p-3">
                <p className="landing-text-muted text-xs">Thông báo</p>
                <p className="landing-text-strong mt-1 text-sm font-semibold">
                  Realtime theo actor
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="landing-feature-shell rounded-3xl p-5 shadow-sm backdrop-blur-xl sm:p-7">
            <h2 className="landing-text-strong text-3xl font-bold sm:text-4xl">Tính năng chính</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="landing-feature-card rounded-2xl p-5">
                  <feature.icon className="landing-link h-10 w-10 text-blue-600" />
                  <h3 className="landing-text-strong mt-4 text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="landing-text-default mt-2 text-sm leading-6">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer py-8">
        <div className="landing-text-default mx-auto max-w-7xl px-4 text-center text-sm sm:px-6 lg:px-8">
          <p>© 2026 Trường Đại học An ninh nhân dân - Bộ Công an. Tất cả quyền được bảo lưu.</p>
          <p className="landing-text-muted mt-2 text-xs">
            Hệ thống nội bộ dành cho cán bộ và học viên ANND
          </p>
        </div>
      </footer>
    </div>
  );
}
