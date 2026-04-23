'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { formatVietnamDateTime, toVietnamDatetimeLocalValue } from '@/lib/timezone';

interface PollDetail {
  poll: {
    id: number;
    title: string;
    description: string;
    class_name: string;
    creator_name: string;
    status: string;
    allow_multiple: boolean;
    created_at: string;
  };
  options: Array<{
    id: number;
    option_text: string;
    vote_count: number;
    percentage: string;
  }>;
  total_votes: number;
  has_voted: boolean;
}

export default function PollDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PollDetail | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && params.id) {
      fetchPollDetail();
    }
  }, [user, authLoading, router, params.id]);

  const fetchPollDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/polls/${params.id}`);
      const pollData = await res.json();
      if (res.ok) {
        setData(pollData);
      } else {
        toast.error(pollData.error || 'Không thể tải poll');
        router.back();
      }
    } catch (e) {
      console.error('Fetch poll detail error:', e);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;
  if (!data) return <div className="container mx-auto px-4 py-8">Không có dữ liệu</div>;

  const maxVotes = Math.max(...data.options.map((o) => o.vote_count), 1);

  const handleExportCSV = () => {
    if (!data) return;

    // Create CSV content
    const headers = ['Lựa Chọn', 'Số Phiếu', 'Phần Trăm'];
    const rows = data.options.map((option) => [
      `"${option.option_text}"`,
      option.vote_count,
      `${option.percentage}%`,
    ]);

    const csv = [
      `"Tiêu Đề Cuộc Khảo Sát","${data.poll.title}"`,
      `"Mô Tả","${data.poll.description || ''}"`,
      `"Lớp","${data.poll.class_name || 'Tất cả lớp'}"`,
      `"Tổng Phiếu","${data.total_votes}"`,
      `"Ngày Tạo","${formatVietnamDateTime(data.poll.created_at)}"`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `poll_${data.poll.id}_${toVietnamDatetimeLocalValue(new Date()).slice(0, 10)}.csv`;
    link.click();
    toast.success('Đã xuất kết quả khảo sát');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline">
        ← Quay lại
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{data.poll.title}</h1>
            {data.poll.description && <p className="text-gray-600 mb-3">{data.poll.description}</p>}
            <div className="flex gap-4 text-sm text-gray-500">
              <span>🏫 {data.poll.class_name || 'Tất cả lớp'}</span>
              <span>👤 Tạo bởi: {data.poll.creator_name}</span>
              <span>📅 {formatVietnamDateTime(data.poll.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${
                data.poll.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {data.poll.status === 'active' ? '🟢 Đang mở' : '⚫ Đã đóng'}
            </span>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Xuất CSV
            </button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded">
          <div className="flex justify-between items-center">
            <span className="font-medium">Tổng số phản hồi:</span>
            <span className="text-2xl font-bold text-blue-600">{data.total_votes}</span>
          </div>
          {data.poll.allow_multiple && (
            <p className="text-xs text-blue-800 mt-2">* Cho phép chọn nhiều lựa chọn</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">📊 Kết quả</h2>

        <div className="space-y-4">
          {data.options.map((option, idx) => (
            <div key={option.id} className="border-l-4 border-blue-500 pl-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="font-medium">
                    {idx + 1}. {option.option_text}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-bold text-blue-600">{option.vote_count} phiếu</div>
                  <div className="text-sm text-gray-600">{option.percentage}%</div>
                </div>
              </div>

              {/* Biểu đồ thanh */}
              <div className="relative w-full h-8 bg-gray-100 rounded overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-500 transition-all"
                  style={{ width: `${option.percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                  {option.vote_count > 0 && `${option.vote_count} (${option.percentage}%)`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.options.length === 0 && (
          <p className="text-gray-500 text-center py-8">Chưa có lựa chọn nào</p>
        )}
      </div>

      {/* Biểu đồ hình tròn đơn giản (text-based) */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">📈 Biểu Đồ Tròn</h2>
        <div className="flex justify-center">
          <div className="w-64 h-64 rounded-full border-8 border-gray-200 flex items-center justify-center relative overflow-hidden">
            {data.options.map((option, idx) => {
              const previousPercentage = data.options
                .slice(0, idx)
                .reduce((sum, opt) => sum + parseFloat(opt.percentage), 0);

              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

              return (
                <div
                  key={option.id}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: `conic-gradient(
                      transparent 0deg ${previousPercentage * 3.6}deg,
                      ${colors[idx % colors.length]} ${previousPercentage * 3.6}deg ${(previousPercentage + parseFloat(option.percentage)) * 3.6}deg,
                      transparent ${(previousPercentage + parseFloat(option.percentage)) * 3.6}deg
                    )`,
                  }}
                />
              );
            })}
            <div className="absolute inset-8 bg-white rounded-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold">{data.total_votes}</div>
                <div className="text-sm text-gray-600">phiếu</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {data.options.map((option, idx) => {
            const colors = [
              'bg-blue-500',
              'bg-green-500',
              'bg-yellow-500',
              'bg-red-500',
              'bg-purple-500',
              'bg-pink-500',
            ];
            return (
              <div key={option.id} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${colors[idx % colors.length]}`} />
                <span className="text-sm truncate">{option.option_text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
