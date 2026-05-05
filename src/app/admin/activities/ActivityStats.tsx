'use client';

import { Activity } from './types';

interface ActivityStatsProps {
  activities: Activity[];
}

export default function ActivityStats({ activities }: ActivityStatsProps) {
  const now = Date.now();
  const archivedCount = activities.filter((activity) => {
    const activityTime = new Date(activity.date_time).getTime();
    const isPastPublished =
      activity.status === 'published' && Number.isFinite(activityTime) && activityTime <= now;
    return isPastPublished || activity.status === 'completed' || activity.status === 'cancelled';
  }).length;

  const stats = [
    {
      value: activities.length,
      label: 'Tong so',
      tone: 'border-cyan-200 bg-cyan-50 text-cyan-950',
      subTone: 'text-cyan-800',
    },
    {
      value: activities.filter((activity) => activity.status === 'pending').length,
      label: 'Da gui duyet',
      tone: 'border-amber-200 bg-amber-50 text-amber-950',
      subTone: 'text-amber-800',
    },
    {
      value: activities.filter((activity) => activity.status === 'published').length,
      label: 'Da cong bo',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
      subTone: 'text-emerald-800',
    },
    {
      value: activities.filter((activity) => activity.status === 'completed').length,
      label: 'Hoan thanh',
      tone: 'border-blue-200 bg-blue-50 text-blue-950',
      subTone: 'text-blue-800',
    },
    {
      value: archivedCount,
      label: 'Da khep lai',
      tone: 'border-slate-200 bg-slate-50 text-slate-950',
      subTone: 'text-slate-700',
    },
    {
      value: activities.filter((activity) => activity.approval_status === 'rejected').length,
      label: 'Tu choi',
      tone: 'border-rose-200 bg-rose-50 text-rose-950',
      subTone: 'text-rose-800',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className={`rounded-3xl border p-5 shadow-sm ${stat.tone}`}>
          <div className={`text-sm font-medium ${stat.subTone}`}>{stat.label}</div>
          <div className="mt-3 text-3xl font-semibold">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
