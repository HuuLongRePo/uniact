'use client';

import { StudentSummary } from './types';

interface StatsProps {
  summary: StudentSummary | null;
}

export default function Stats({ summary }: StatsProps) {
  const totalStudents = summary?.total ?? 0;
  const avgPoints = summary?.avg_points ?? 0;
  const totalActivities = summary?.activity_count ?? 0;
  const totalAwards = summary?.award_count ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-600 mb-1">Tổng số học viên</div>
        <div className="text-2xl font-bold text-blue-700">{totalStudents}</div>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="text-sm text-green-600 mb-1">Tổng điểm trung bình</div>
        <div className="text-2xl font-bold text-green-700">{Math.round(avgPoints)}</div>
      </div>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="text-sm text-purple-600 mb-1">Tổng hoạt động</div>
        <div className="text-2xl font-bold text-purple-700">{totalActivities}</div>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="text-sm text-yellow-600 mb-1">Tổng khen thưởng</div>
        <div className="text-2xl font-bold text-yellow-700">{totalAwards}</div>
      </div>
    </div>
  );
}
