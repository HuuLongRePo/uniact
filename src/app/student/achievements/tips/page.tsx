'use client';

import React, { useState, useEffect } from 'react';
import { Lightbulb, Target, TrendingUp, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Tip {
  id: string;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
}

interface StudentStats {
  currentPoints: number;
  nextAwardThreshold: number;
  nextAwardName: string;
  activitiesThisMonth: number;
  attendanceRate: number;
}

export default function AchievementTipsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await fetch('/api/student/stats');
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    } finally {
      setLoading(false);
    }
  }

  const tips: Tip[] = [
    {
      id: '1',
      icon: '🎯',
      title: 'Set Clear Goals',
      description:
        'Define your target award and calculate how many activities you need to participate in to reach it.',
      actionLabel: 'View Upcoming Awards',
      actionUrl: '/student/awards/upcoming',
    },
    {
      id: '2',
      icon: '📅',
      title: 'Plan Ahead',
      description:
        'Browse upcoming activities and register early. Activities with QR check-in give bonus points for early arrival.',
      actionLabel: 'Browse Activities',
      actionUrl: '/student/activities',
    },
    {
      id: '3',
      icon: '✅',
      title: 'Maintain Good Attendance',
      description: `Your current attendance rate: ${stats?.attendanceRate?.toFixed(1) || '0'}%. Aim for 90%+ to maximize points from attended activities.`,
      actionLabel: 'View My Registrations',
      actionUrl: '/student/activities/registered',
    },
    {
      id: '4',
      icon: '🏆',
      title: 'Focus on High-Value Activities',
      description:
        'City and National level activities have higher point multipliers. Academic and Environmental activities also give bonus points.',
      actionLabel: 'Filter High-Value Activities',
      actionUrl: '/student/activities',
    },
    {
      id: '5',
      icon: '📊',
      title: 'Track Your Progress',
      description: `You're ${stats?.nextAwardThreshold && stats?.currentPoints ? stats.nextAwardThreshold - stats.currentPoints : 'N/A'} points away from "${stats?.nextAwardName || 'next award'}".`,
      actionLabel: 'View Dashboard',
      actionUrl: '/student/dashboard',
    },
    {
      id: '6',
      icon: '🔔',
      title: 'Enable Notifications',
      description:
        'Turn on activity reminders to never miss a registration deadline. Get notified 1 day before each activity.',
      actionLabel: 'Notification Settings',
      actionUrl: '/student/notifications',
    },
    {
      id: '7',
      icon: '👥',
      title: 'Join Diverse Activities',
      description:
        'Participate in different types of activities (Environmental, Sports, Cultural, etc.) to gain well-rounded achievements.',
      actionLabel: 'Explore Activity Types',
      actionUrl: '/student/activities',
    },
    {
      id: '8',
      icon: '⚡',
      title: 'Stay Active This Month',
      description: `You've participated in ${stats?.activitiesThisMonth || 0} activities this month. Aim for at least 3-5 per month for steady progress.`,
      actionLabel: 'See My Activities',
      actionUrl: '/student/activities/registered',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-800">Achievement Tips & Strategies</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-8 mb-6 shadow-lg">
          <div className="flex items-center gap-4">
            <Target className="w-16 h-16" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Maximize Your Achievement Score</h2>
              <p className="text-lg opacity-90">
                Follow these tips to earn more points and unlock awards faster!
              </p>
            </div>
          </div>
        </div>

        {/* Current Progress */}
        {loading ? (
          <p className="text-gray-500 mb-6">Loading your stats...</p>
        ) : (
          stats && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Your Current Progress
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Current Points</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.currentPoints}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Next Award</p>
                  <p className="text-xl font-bold text-green-600">{stats.nextAwardName}</p>
                  <p className="text-sm text-gray-500">at {stats.nextAwardThreshold} points</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Activities This Month</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.activitiesThisMonth}</p>
                </div>
              </div>
            </div>
          )
        )}

        {/* Tips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tips.map((tip) => (
            <div
              key={tip.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{tip.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{tip.title}</h3>
                  <p className="text-gray-600 mb-4">{tip.description}</p>
                  <button
                    onClick={() => router.push(tip.actionUrl)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    {tip.actionLabel} →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 text-center">
          <Award className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">Ready to Level Up?</h3>
          <p className="mb-4">
            Start participating in activities today and watch your achievements grow!
          </p>
          <button
            onClick={() => router.push('/student/activities')}
            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Browse Activities
          </button>
        </div>
      </div>
    </div>
  );
}
