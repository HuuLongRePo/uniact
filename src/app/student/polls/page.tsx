'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

interface Poll {
  id: number;
  title: string;
  description: string;
  class_name: string;
  status: string;
  response_count: number;
  has_voted: number;
  allow_multiple: boolean;
  created_at: string;
}

interface PollDetail {
  poll: {
    id: number;
    title: string;
    description: string;
    allow_multiple: boolean;
    status: string;
  };
  options: Array<{
    id: number;
    option_text: string;
    vote_count: number;
    percentage: string;
  }>;
  total_votes: number;
  user_votes: number[];
  has_voted: boolean;
}

export default function StudentPollsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<PollDetail | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchPolls();
    }
  }, [user, authLoading, router]);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/polls');
      const data = await res.json();
      if (res.ok) {
        setPolls(data.polls || []);
      }
    } catch (e) {
      console.error('Fetch polls error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPoll = async (pollId: number) => {
    try {
      const res = await fetch(`/api/polls/${pollId}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedPoll(data);
        setSelectedOptions(data.user_votes || []);
      }
    } catch (e) {
      console.error('Fetch poll detail error:', e);
    }
  };

  const handleToggleOption = (optionId: number) => {
    if (selectedPoll?.poll.allow_multiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleSubmitVote = async () => {
    if (!selectedPoll || selectedOptions.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 lựa chọn');
      return;
    }

    try {
      const res = await fetch(`/api/polls/${selectedPoll.poll.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_ids: selectedOptions }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đã ghi nhận phản hồi của bạn!');
        setSelectedPoll(null);
        setSelectedOptions([]);
        fetchPolls();
      } else {
        toast.error(data.error || 'Gửi phản hồi thất bại');
      }
    } catch (e) {
      console.error('Submit vote error:', e);
      toast.error('Lỗi khi gửi phản hồi');
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📊 Khảo Sát / Poll</h1>

      {selectedPoll ? (
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={() => {
              setSelectedPoll(null);
              setSelectedOptions([]);
            }}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Quay lại danh sách
          </button>

          <h2 className="text-2xl font-bold mb-2">{selectedPoll.poll.title}</h2>
          {selectedPoll.poll.description && (
            <p className="text-gray-600 mb-4">{selectedPoll.poll.description}</p>
          )}

          {selectedPoll.has_voted ? (
            <div>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <p className="text-green-800 font-medium">✓ Bạn đã tham gia poll này</p>
              </div>

              <h3 className="font-bold mb-3">Kết quả:</h3>
              <div className="space-y-3">
                {selectedPoll.options.map((option) => (
                  <div key={option.id} className="border rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{option.option_text}</div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-blue-600">{option.vote_count}</div>
                        <div className="text-sm text-gray-600">{option.percentage}%</div>
                      </div>
                    </div>
                    <div className="w-full h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          selectedPoll.user_votes.includes(option.id)
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${option.percentage}%` }}
                      />
                    </div>
                    {selectedPoll.user_votes.includes(option.id) && (
                      <p className="text-xs text-green-600 mt-1">✓ Lựa chọn của bạn</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {selectedPoll.poll.allow_multiple && (
                <p className="text-sm text-blue-600 mb-3">* Có thể chọn nhiều lựa chọn</p>
              )}

              <div className="space-y-2 mb-6">
                {selectedPoll.options.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center p-4 border rounded cursor-pointer transition ${
                      selectedOptions.includes(option.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type={selectedPoll.poll.allow_multiple ? 'checkbox' : 'radio'}
                      checked={selectedOptions.includes(option.id)}
                      onChange={() => handleToggleOption(option.id)}
                      className="mr-3"
                    />
                    <span className="font-medium">{option.option_text}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={handleSubmitVote}
                disabled={selectedOptions.length === 0}
                className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                ✓ Gửi phản hồi
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <div key={poll.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{poll.title}</h3>
                  {poll.description && (
                    <p className="text-gray-600 text-sm mt-1">{poll.description}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-sm text-gray-500">
                    <span>🏫 {poll.class_name}</span>
                    <span>👥 {poll.response_count} phản hồi</span>
                    <span>{new Date(poll.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                {poll.has_voted > 0 ? (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                    ✓ Đã vote
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                    Chưa vote
                  </span>
                )}
              </div>

              <button
                onClick={() => handleViewPoll(poll.id)}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
              >
                {poll.has_voted > 0 ? '👁️ Xem kết quả' : '📝 Tham gia poll'}
              </button>
            </div>
          ))}

          {polls.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg">Chưa có poll nào</p>
              <p className="text-sm mt-2">Giảng viên sẽ tạo poll để khảo sát ý kiến</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
