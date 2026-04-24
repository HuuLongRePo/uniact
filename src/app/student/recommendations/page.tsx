'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Sparkles, Calendar, MapPin, Users } from 'lucide-react';
import { formatVietnamDateTime } from '@/lib/timezone';

interface RecommendationActivity {
  id: number;
  title: string;
  date_time: string;
  location: string | null;
  activity_type_name: string | null;
  match_reason?: string;
  reason?: string;
}

export default function RecommendationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<RecommendationActivity[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }
    if (user) fetchRecommendations();
  }, [user, authLoading, router]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/recommendations');
      const data = await res.json();
      setActivities(
        data.recommendations || data.items || data.data?.recommendations || data.data?.items || []
      );
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-yellow-600" />
            Gợi Ý Hoạt Động
          </h1>
          <p className="text-gray-600 mt-2">
            Các hoạt động phù hợp với bạn dựa trên lịch sử tham gia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600">Chưa có gợi ý nào</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => router.push(`/student/activities/${activity.id}`)}
              >
                <div className="flex items-start gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                  <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatVietnamDateTime(activity.date_time, 'date')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{activity.location || 'TBA'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{activity.activity_type_name}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-blue-600 font-medium">
                    {activity.match_reason || activity.reason || 'Phù hợp với sở thích của bạn'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
