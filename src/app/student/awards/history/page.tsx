'use client';

import React, { useState, useEffect } from 'react';
import { Award, Calendar, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AwardRecord {
  id: number;
  awardName: string;
  awardedAt: string;
  points: number;
  reason: string;
  activityTitle?: string;
}

export default function AwardHistoryPage() {
  const router = useRouter();
  const [awards, setAwards] = useState<AwardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    fetchAwardHistory();
  }, []);

  async function fetchAwardHistory() {
    try {
      setLoading(true);
      const res = await fetch('/api/student/awards/history');
      const data = await res.json();
      if (res.ok) {
        setAwards(data.awards || []);
        setTotalPoints(data.totalPoints || 0);
      }
    } catch (error) {
      console.error('Fetch award history error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-yellow-600" />
            <h1 className="text-3xl font-bold text-gray-800">My Award History</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-full">
              <Award className="w-12 h-12" />
            </div>
            <div>
              <p className="text-xl opacity-90">Total Awards Received</p>
              <p className="text-5xl font-bold">{awards.length}</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-lg">
            <TrendingUp className="w-6 h-6" />
            <span>
              Total Points: <span className="font-bold">{totalPoints}</span>
            </span>
          </div>
        </div>

        {/* Awards Timeline */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <p className="p-6 text-gray-500">Loading award history...</p>
          ) : awards.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No awards yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Keep participating in activities to earn awards!
              </p>
            </div>
          ) : (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Award Timeline</h2>
              <div className="space-y-4">
                {awards.map((award, index) => (
                  <div
                    key={award.id}
                    className="relative pl-8 pb-6 border-l-2 border-yellow-300 last:border-l-0 last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-0 w-4 h-4 bg-yellow-500 rounded-full -translate-x-[9px]" />

                    {/* Award Card */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-bold text-lg text-gray-900">{award.awardName}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{award.reason}</p>
                          {award.activityTitle && (
                            <p className="text-xs text-gray-500 italic">
                              Activity: {award.activityTitle}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(award.awardedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
                            +{award.points}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">points</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
