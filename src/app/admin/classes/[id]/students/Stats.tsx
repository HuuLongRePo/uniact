'use client';

import { Activity, Award, GraduationCap, Users } from 'lucide-react';
import { StudentSummary } from './types';

interface StatsProps {
  summary: StudentSummary | null;
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'cyan' | 'emerald' | 'violet' | 'amber';
}) {
  const toneMap: Record<typeof tone, string> = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneMap[tone]}`}>
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-800">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default function Stats({ summary }: StatsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Tong hoc vien"
        value={String(summary?.total ?? 0)}
        icon={<Users className="h-5 w-5" />}
        tone="cyan"
      />
      <StatCard
        label="Diem trung binh"
        value={new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(
          summary?.avg_points ?? 0
        )}
        icon={<GraduationCap className="h-5 w-5" />}
        tone="emerald"
      />
      <StatCard
        label="Tong hoat dong"
        value={String(summary?.activity_count ?? 0)}
        icon={<Activity className="h-5 w-5" />}
        tone="violet"
      />
      <StatCard
        label="Tong khen thuong"
        value={String(summary?.award_count ?? 0)}
        icon={<Award className="h-5 w-5" />}
        tone="amber"
      />
    </section>
  );
}
