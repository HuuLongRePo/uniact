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
            <span className="text-lg font-bold text-gray-900 sm:text-xl">ANND Activity Hub</span>
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
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
              Nền tảng nội bộ ANND
            </div>
            <h1 className="text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
              Trung tâm hoạt động
              <span className="text-blue-600"> Trường Đại học An ninh nhân dân</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
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
                >
                  <div className="text-xs uppercase tracking-wide text-gray-500">{item.value}</div>
                  <div className="mt-1 text-sm font-medium text-gray-800">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="content-card rounded-3xl border border-gray-200 p-5 shadow-lg sm:p-6">
            <div className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="h-11 rounded-xl bg-gradient-to-r from-blue-200 to-indigo-200" />
              <div className="space-y-2">
                <div className="h-3 rounded bg-blue-200/70" />
                <div className="h-3 w-10/12 rounded bg-blue-200/60" />
                <div className="h-3 w-8/12 rounded bg-blue-200/50" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white/75 p-3">
                <p className="text-xs text-gray-500">Luồng chính</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">Đăng ký → Điểm danh</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white/75 p-3">
                <p className="text-xs text-gray-500">Thông báo</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">Realtime theo actor</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-7">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Tính năng chính</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="content-card rounded-2xl border border-gray-200 p-5 transition-colors hover:bg-gray-50"
                >
                  <feature.icon className="h-10 w-10 text-blue-600" />
                  <h3 className="mt-4 text-xl font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{feature.description}</p>
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
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-600 sm:px-6 lg:px-8">
          <p>© 2026 Trường Đại học An ninh nhân dân - Bộ Công an. Tất cả quyền được bảo lưu.</p>
          <p className="mt-2 text-xs text-gray-500">
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
