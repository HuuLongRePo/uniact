'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

const reportCards = [
  {
    href: '/admin/reports/scores',
    title: 'Bao cao diem so',
    desc: 'Tong hop phan bo diem, so sanh muc diem va doi soat tong diem toan he thong.',
    tag: 'Scoring',
  },
  {
    href: '/admin/reports/teachers',
    title: 'Bao cao giang vien',
    desc: 'Theo doi khoi luong to chuc hoat dong, muc do tham gia va hieu qua cua tung giang vien.',
    tag: 'Teacher ops',
  },
  {
    href: '/admin/reports/participation',
    title: 'Bao cao tham gia',
    desc: 'Nhin xu huong tham gia theo lop, theo chu ky va cac diem nghen can nhac nho.',
    tag: 'Participation',
  },
  {
    href: '/admin/reports/activity-statistics',
    title: 'Thong ke hoat dong',
    desc: 'Tach ro dang ky, co mat, diem trung binh va suc hut cua tung nhom hoat dong.',
    tag: 'Activity',
  },
  {
    href: '/admin/reports/custom',
    title: 'Bao cao tuy chinh',
    desc: 'Tu chon cot du lieu va xuat CSV cho cac tinh huong doi soat hoac bao cao dot xuat.',
    tag: 'Export',
  },
];

export default function AdminReportsIndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [loading, router, user]);

  if (loading) {
    return <LoadingSpinner message="Dang tai trung tam bao cao..." />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">
              Reports center
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Bao cao quan tri</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Chon nhom bao cao can theo doi de di tu dashboard den man chi tiet nhanh hon, it
              lan lac vao route cu hon.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ve dashboard
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-2xl bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800"
            >
              Cai dat he thong
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700 shadow-sm">
                {card.tag}
              </div>
              <div className="mt-4 text-lg font-semibold text-slate-950">{card.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">{card.desc}</div>
              <div className="mt-4 text-sm font-medium text-cyan-700">Mo bao cao</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
