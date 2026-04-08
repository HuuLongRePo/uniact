'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Target, TrendingUp } from 'lucide-react';

interface UpcomingAward {
  type: string;
  points_needed: number;
  current_points: number;
  progress: number;
  description: string;
}

export default function UpcomingAwardsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [awards, setAwards] = useState<UpcomingAward[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }
    if (user) fetchUpcomingAwards();
  }, [user, authLoading, router]);

  const fetchUpcomingAwards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/awards/upcoming');
      const data = await res.json();
      setAwards(data.awards || []);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🎯 Giải Thưởng Sắp Đạt Được</h1>

        <div className="space-y-4">
          {awards.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Không có giải thưởng sắp đạt được</p>
            </div>
          ) : (
            awards.map((award, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      {award.type}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{award.description}</p>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {award.points_needed - award.current_points}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tiến độ</span>
                    <span>
                      {award.current_points} / {award.points_needed} điểm
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all"
                      style={{ width: `${award.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right">{award.progress}% hoàn thành</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
