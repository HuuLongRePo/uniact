'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface HealthData {
  database: {
    size_mb: string;
    table_count: number;
  };
  users: {
    total: number;
    students: number;
    teachers: number;
    admins: number;
    new_24h: number;
  };
  activities: {
    total: number;
    planned: number;
    ongoing: number;
    completed: number;
    cancelled: number;
    new_24h: number;
  };
  participations: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    new_24h: number;
  };
  attendance: {
    total: number;
    attended: number;
    absent: number;
    new_24h: number;
    rate: string;
  };
  classes: {
    total: number;
  };
  awards: {
    total: number;
  };
  system: {
    uptime_hours: number;
    memory: {
      heap_used_mb: string;
      heap_total_mb: string;
    };
    node_version: string;
    platform: string;
  };
  top_activities: Array<{
    title: string;
    status: string;
    participation_count: number;
  }>;
  recent_errors: Array<{
    action: string;
    details: string;
    created_at: string;
  }>;
  timestamp: string;
}

export default function SystemHealthPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchHealth();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/system-health');
      const healthData = await res.json();
      if (res.ok) {
        setData(healthData);
      }
    } catch (e) {
      console.error('Fetch health error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (loading && !data)) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🏥 Tình Trạng Hệ Thống</h1>
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Tự động làm mới (10s)</span>
          </label>
          <button
            onClick={fetchHealth}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="text-blue-800 text-sm font-medium">Database</div>
              <div className="text-2xl font-bold text-blue-900">{data.database.size_mb} MB</div>
              <div className="text-xs text-blue-700">{data.database.table_count} tables</div>
            </div>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <div className="text-green-800 text-sm font-medium">Uptime</div>
              <div className="text-2xl font-bold text-green-900">
                {data.system.uptime_hours.toFixed(1)}h
              </div>
              <div className="text-xs text-green-700">{data.system.platform}</div>
            </div>
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
              <div className="text-purple-800 text-sm font-medium">Memory</div>
              <div className="text-2xl font-bold text-purple-900">
                {data.system.memory.heap_used_mb} MB
              </div>
              <div className="text-xs text-purple-700">/ {data.system.memory.heap_total_mb} MB</div>
            </div>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <div className="text-orange-800 text-sm font-medium">Node.js</div>
              <div className="text-xl font-bold text-orange-900">{data.system.node_version}</div>
              <div className="text-xs text-orange-700">
                Last update: {new Date(data.timestamp).toLocaleTimeString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Entity Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">👥 Users ({data.users.total})</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Students</span>
                  <span className="font-bold">{data.users.students}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Teachers</span>
                  <span className="font-bold">{data.users.teachers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Admins</span>
                  <span className="font-bold">{data.users.admins}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-green-600 text-sm">New (24h)</span>
                  <span className="font-bold text-green-600">+{data.users.new_24h}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">🎯 Activities ({data.activities.total})</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Planned</span>
                  <span className="font-bold">{data.activities.planned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ongoing</span>
                  <span className="font-bold text-green-600">{data.activities.ongoing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-bold">{data.activities.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cancelled</span>
                  <span className="font-bold text-red-600">{data.activities.cancelled}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-green-600 text-sm">New (24h)</span>
                  <span className="font-bold text-green-600">+{data.activities.new_24h}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">✅ Attendance ({data.attendance.total})</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Attended</span>
                  <span className="font-bold text-green-600">{data.attendance.attended}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Absent</span>
                  <span className="font-bold text-red-600">{data.attendance.absent}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-blue-600">Attendance Rate</span>
                  <span className="font-bold text-blue-600">{data.attendance.rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600 text-sm">New (24h)</span>
                  <span className="font-bold text-green-600">+{data.attendance.new_24h}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">
                📝 Participations ({data.participations.total})
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-yellow-600">Pending</span>
                  <span className="font-bold text-yellow-600">{data.participations.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Approved</span>
                  <span className="font-bold text-green-600">{data.participations.approved}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Rejected</span>
                  <span className="font-bold text-red-600">{data.participations.rejected}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-green-600 text-sm">New (24h)</span>
                  <span className="font-bold text-green-600">+{data.participations.new_24h}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">🏫 Classes & Awards</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <span className="font-medium">Total Classes</span>
                  <span className="text-2xl font-bold text-blue-600">{data.classes.total}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                  <span className="font-medium">Total Awards</span>
                  <span className="text-2xl font-bold text-yellow-600">{data.awards.total}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">🔝 Top Activities</h2>
              <div className="space-y-2">
                {data.top_activities.slice(0, 5).map((act, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex justify-between items-start">
                      <span className="truncate flex-1 mr-2">
                        {idx + 1}. {act.title}
                      </span>
                      <span className="font-bold text-blue-600">{act.participation_count}</span>
                    </div>
                  </div>
                ))}
                {data.top_activities.length === 0 && (
                  <p className="text-gray-500 text-sm">No activities yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Errors */}
          {data.recent_errors.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4 text-red-600">⚠️ Recent Errors</h2>
              <div className="space-y-2">
                {data.recent_errors.map((err, idx) => (
                  <div key={idx} className="border-l-4 border-red-500 pl-3 py-2 bg-red-50">
                    <div className="font-medium text-red-800">{err.action}</div>
                    <div className="text-sm text-red-600">{err.details}</div>
                    <div className="text-xs text-red-500">
                      {new Date(err.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
