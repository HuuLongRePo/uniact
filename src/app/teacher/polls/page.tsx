'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

interface Poll {
  id: number;
  title: string;
  description: string;
  class_name: string;
  status: string;
  response_count: number;
  created_at: string;
  allow_multiple: boolean;
}

interface TeacherClass {
  id: number;
  name: string;
}

type PendingPollAction = { type: 'close' | 'delete'; poll: Poll } | null;

export default function TeacherPollsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingPollAction>(null);

  // Create form state
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'teacher')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchPolls();
      fetchClasses();
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

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes?teacher_id=me');
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
      }
    } catch (e) {
      console.error('Fetch classes error:', e);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    const validOptions = options.filter((o) => o.trim());
    if (!title.trim() || validOptions.length < 2) {
      toast.error('Vui lòng nhập tiêu đề và ít nhất 2 lựa chọn');
      return;
    }

    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          class_id: classId || null,
          allow_multiple: allowMultiple,
          options: validOptions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Tạo poll thành công!');
        setShowCreateForm(false);
        setTitle('');
        setDescription('');
        setClassId('');
        setAllowMultiple(false);
        setOptions(['', '']);
        fetchPolls();
      } else {
        toast.error(data.error || 'Tạo poll thất bại');
      }
    } catch (e) {
      console.error('Create poll error:', e);
      toast.error('Lỗi khi tạo poll');
    }
  };

  const handleClosePoll = async (pollId: number) => {
    try {
      const res = await fetch(`/api/polls/${pollId}?action=close`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đã đóng poll');
        fetchPolls();
      } else {
        toast.error(data.error || 'Đóng poll thất bại');
      }
    } catch (e) {
      console.error('Close poll error:', e);
    }
  };

  const handleDeletePoll = async (pollId: number) => {
    try {
      const res = await fetch(`/api/polls/${pollId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đã xóa poll');
        fetchPolls();
      } else {
        toast.error(data.error || 'Xóa poll thất bại');
      }
    } catch (e) {
      console.error('Delete poll error:', e);
    }
  };

  const confirmConfig =
    pendingAction?.type === 'close'
      ? {
          title: 'Đóng poll',
          message: pendingAction
            ? `Bạn có chắc chắn muốn đóng poll "${pendingAction.poll.title}"? Học viên sẽ không thể bình chọn nữa.`
            : '',
          confirmText: 'Đóng poll',
          variant: 'warning' as const,
        }
      : {
          title: 'Xóa poll',
          message: pendingAction
            ? `Bạn có chắc chắn muốn xóa vĩnh viễn poll "${pendingAction.poll.title}"? Không thể hoàn tác thao tác này.`
            : '',
          confirmText: 'Xóa poll',
          variant: 'danger' as const,
        };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📊 Khảo Sát / Poll</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showCreateForm ? '✕ Hủy' : '➕ Tạo Poll Mới'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Tạo Poll Mới</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Câu hỏi của bạn..."
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thông tin thêm (tùy chọn)"
                className="w-full p-2 border rounded h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Lớp học</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Chọn lớp</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                />
                <span className="text-sm">Cho phép chọn nhiều lựa chọn</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Lựa chọn *</label>
              {options.map((option, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Lựa chọn ${idx + 1}`}
                    className="flex-1 p-2 border rounded"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(idx)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button onClick={handleAddOption} className="text-blue-600 hover:underline text-sm">
                ➕ Thêm lựa chọn
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreatePoll}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ✓ Tạo Poll
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <span>🏫 {poll.class_name || 'Tất cả lớp'}</span>
                  <span>👥 {poll.response_count} phản hồi</span>
                  <span>{new Date(poll.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    poll.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {poll.status === 'active' ? '🟢 Đang mở' : '⚫ Đã đóng'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/teacher/polls/${poll.id}`)}
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm"
              >
                👁️ Xem kết quả
              </button>
              {poll.status === 'active' && (
                <button
                  onClick={() => setPendingAction({ type: 'close', poll })}
                  className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 text-sm"
                >
                  🔒 Đóng poll
                </button>
              )}
              <button
                onClick={() => setPendingAction({ type: 'delete', poll })}
                className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
              >
                🗑️ Xóa
              </button>
            </div>
          </div>
        ))}

        {polls.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">Chưa có poll nào</p>
            <p className="text-sm mt-2">Tạo poll đầu tiên để khảo sát ý kiến học viên</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingAction !== null}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText="Hủy"
        variant={confirmConfig.variant}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (!pendingAction) return;
          if (pendingAction.type === 'close') {
            await handleClosePoll(pendingAction.poll.id);
          } else {
            await handleDeletePoll(pendingAction.poll.id);
          }
          setPendingAction(null);
        }}
      />
    </div>
  );
}
