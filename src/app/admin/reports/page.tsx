'use client';

import Link from 'next/link';

const cards = [
  {
    href: '/admin/reports/scores',
    title: 'Báo cáo điểm',
    desc: 'Tổng hợp điểm theo lớp và theo sinh viên.',
  },
  {
    href: '/admin/reports/teachers',
    title: 'Báo cáo giảng viên',
    desc: 'Thống kê hiệu quả tổ chức hoạt động theo giảng viên.',
  },
  {
    href: '/admin/reports/participation',
    title: 'Báo cáo tham gia',
    desc: 'Theo dõi mức độ tham gia theo lớp và theo mốc thời gian.',
  },
  {
    href: '/admin/reports/activity-statistics',
    title: 'Thống kê hoạt động',
    desc: 'Xem tổng quan số lượng đăng ký, tham gia và điểm trung bình.',
  },
  {
    href: '/admin/reports/custom',
    title: 'Báo cáo tùy chỉnh',
    desc: 'Tự chọn cột dữ liệu và xuất báo cáo CSV theo nhu cầu.',
  },
];

export default function AdminReportsIndexPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Báo cáo quản trị</h1>
        <p className="mt-1 text-gray-600">
          Tổng hợp các nhóm báo cáo quan trọng để theo dõi vận hành hệ thống.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border bg-white p-5 shadow transition hover:shadow-md"
          >
            <div className="text-lg font-semibold">{card.title}</div>
            <div className="mt-2 text-sm text-gray-600">{card.desc}</div>
            <div className="mt-4 text-sm font-medium text-blue-600">Mở báo cáo</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
