'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface Alert {
  id: number;
  type: 'low_attendance' | 'deadline' | 'achievement';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  created_at: string;
}

export default function StudentAlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }
    if (user) fetchAlerts();
  }, [user, authLoading, router]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/student/alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔔 Cảnh Báo & Nhắc Nhở</h1>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">Không có cảnh báo nào</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
                  alert.severity === 'error'
                    ? 'border-red-500'
                    : alert.severity === 'warning'
                      ? 'border-yellow-500'
                      : 'border-blue-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  {alert.severity === 'error' ? (
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  ) : (
                    <Clock className="w-6 h-6 text-yellow-600" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{alert.title}</h3>
                    <p className="text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(alert.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
