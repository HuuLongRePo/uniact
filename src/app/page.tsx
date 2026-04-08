'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Activity, Users, TrendingUp, Shield, Zap, BarChart3, ArrowRight } from 'lucide-react';

// Landing page cho non-authenticated users
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">ANND Activity Hub</span>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Đăng nhập
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Trung tâm hoạt động
              <span className="text-blue-600"> Trường Đại học An ninh nhân dân</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Nền tảng quản lý hoạt động ngoại khóa, rèn luyện và điểm danh chuyên biệt cho Trường
              Đại học An ninh nhân dân - Bộ Công an.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/login"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition flex items-center justify-center gap-2"
              >
                Đăng nhập
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="bg-white rounded-xl shadow-lg p-8 hidden md:block">
            <div className="space-y-4">
              <div className="h-12 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-4">
                <div className="h-8 bg-blue-100 rounded" />
                <div className="h-8 bg-indigo-100 rounded" />
                <div className="h-8 bg-purple-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Tính năng chính</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Activity,
                title: 'Quản lý hoạt động',
                description:
                  'Tổ chức và quản lý hoạt động rèn luyện, học tập, thực địa theo quy trình của nhà trường',
              },
              {
                icon: Users,
                title: 'Điểm danh học viên',
                description:
                  'Điểm danh tự động qua QR code, webcam hoặc thiết bị nhận diện sinh trắc học',
              },
              {
                icon: TrendingUp,
                title: 'Tính điểm tự động',
                description:
                  'Tự động tính điểm rèn luyện, học tập và xếp hạng theo quy chế đào tạo',
              },
              {
                icon: Shield,
                title: 'An toàn nội bộ',
                description:
                  'Hệ thống triển khai trên mạng nội bộ, đảm bảo an ninh thông tin theo quy định',
              },
              {
                icon: Zap,
                title: 'Xử lý nhanh',
                description:
                  'Tối ưu hóa cho môi trường mạng LAN, truy cập nhanh chóng từ mọi thiết bị',
              },
              {
                icon: BarChart3,
                title: 'Báo cáo toàn diện',
                description: 'Báo cáo đầy đủ cho Ban Giám hiệu, các phòng chức năng theo định kỳ',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-8 border border-gray-200 rounded-lg hover:shadow-lg transition"
              >
                <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">Hệ thống quản lý hoạt động ANND</h2>
        <p className="text-xl text-gray-600 mb-8">
          Giải pháp nội bộ cho Trường Đại học An ninh nhân dân - Bộ Công an
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
          >
            Đăng nhập hệ thống
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>
            &copy; 2025 Trường Đại học An ninh nhân dân - Bộ Công an. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center mt-4 text-sm">
            <span className="text-gray-400">
              Hệ thống nội bộ - Chỉ dành cho cán bộ và học viên ANND
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
