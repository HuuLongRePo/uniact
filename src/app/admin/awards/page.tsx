'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type AwardSuggestion = {
  id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  class_name?: string;
  award_type_id: number;
  award_type_name?: string;
  award_min_points?: number;
  score_snapshot?: number;
  suggested_at?: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string | null;
};

export default function AdminAwardsPage() {
  const [suggestions, setSuggestions] = useState<AwardSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>(
    'pending'
  );
  const [note, setNote] = useState<Record<number, string>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch('/api/admin/awards' + qs);
      if (!res.ok) throw new Error('Không thể tải danh sách');
      const json = await res.json();
      setSuggestions(json.suggestions || []);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, 'Lỗi'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const generateSuggestions = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/awards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      if (!res.ok) throw new Error('Không thể tạo đề xuất');
      const json = await res.json();
      toast.success(`Đã tạo ${json.count} đề xuất mới`);
      await fetchSuggestions();
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, 'Lỗi khi tạo đề xuất'));
    } finally {
      setGenerating(false);
    }
  };

  const processSuggestion = async (id: number, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/awards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestion_id: id,
          action,
          note: note[id] || null,
        }),
      });
      if (!res.ok) throw new Error('Không thể thực hiện');
      setNote({ ...note, [id]: '' });
      await fetchSuggestions();
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, 'Lỗi khi thực hiện hành động'));
    }
  };

  const openConfirm = (id: number, action: 'approve' | 'reject') => {
    setConfirmId(id);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmId(null);
    setConfirmAction(null);
  };

  const confirmSuggestion = async () => {
    if (!confirmId || !confirmAction) return;
    await processSuggestion(confirmId, confirmAction);
    closeConfirm();
  };

  const selectedSuggestion = confirmId ? suggestions.find((s) => s.id === confirmId) : null;
  const confirmTitle =
    confirmAction === 'approve'
      ? 'Phê duyệt khen thưởng'
      : confirmAction === 'reject'
        ? 'Từ chối khen thưởng'
        : 'Xác nhận';
  const confirmMessage =
    confirmAction === 'approve'
      ? `Bạn chắc chắn muốn phê duyệt đề xuất "${selectedSuggestion?.award_type_name || `#${selectedSuggestion?.award_type_id ?? ''}`}" cho học viên ${selectedSuggestion?.student_name || `#${selectedSuggestion?.student_id ?? ''}`}?`
      : confirmAction === 'reject'
        ? `Bạn chắc chắn muốn từ chối đề xuất "${selectedSuggestion?.award_type_name || `#${selectedSuggestion?.award_type_id ?? ''}`}" cho học viên ${selectedSuggestion?.student_name || `#${selectedSuggestion?.student_id ?? ''}`}?`
        : '';

  return (
    <div>
      <main className="max-w-5xl mx-auto p-6">
        <ConfirmDialog
          isOpen={confirmOpen}
          title={confirmTitle}
          message={confirmMessage}
          confirmText={confirmAction === 'approve' ? 'Phê duyệt' : 'Từ chối'}
          cancelText="Hủy"
          onCancel={closeConfirm}
          onConfirm={confirmSuggestion}
          variant={confirmAction === 'reject' ? 'danger' : 'info'}
        />

        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Quản lý khen thưởng</h1>
          <Button onClick={generateSuggestions} isLoading={generating} loadingText="Đang tạo...">
            Tạo đề xuất tự động
          </Button>
        </div>

        <div className="mb-4 flex space-x-2">
          <Button
            size="sm"
            variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter('pending')}
          >
            Đang chờ
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'approved' ? 'success' : 'secondary'}
            onClick={() => setStatusFilter('approved')}
          >
            Đã duyệt
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'rejected' ? 'danger' : 'secondary'}
            onClick={() => setStatusFilter('rejected')}
          >
            Đã từ chối
          </Button>
          <Button
            size="sm"
            variant={statusFilter === '' ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter('')}
          >
            Tất cả
          </Button>
        </div>

        {loading && <p>Đang tải...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && suggestions.length === 0 && <p>Chưa có đề xuất nào.</p>}

        <div className="space-y-4 mt-4">
          {suggestions.map((s) => (
            <div key={s.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-lg font-medium">
                    {s.award_type_name || `Danh hiệu #${s.award_type_id}`}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Học viên: {s.student_name || `Mã học viên #${s.student_id}`} ({s.student_email})
                    {s.class_name && ` • Lớp: ${s.class_name}`}
                  </div>
                  <div className="text-sm text-gray-600">
                    Điểm: {s.score_snapshot || 0} / Yêu cầu tối thiểu: {s.award_min_points || 0}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {s.suggested_at && new Date(s.suggested_at).toLocaleString('vi-VN')}
                  </div>
                  {s.note && (
                    <div className="mt-2 text-sm bg-gray-100 p-2 rounded">Ghi chú: {s.note}</div>
                  )}
                  {s.status === 'pending' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Ghi chú (tùy chọn)"
                        value={note[s.id] || ''}
                        onChange={(e) => setNote({ ...note, [s.id]: e.target.value })}
                        className="w-full p-2 border rounded mt-2"
                      />
                    </div>
                  )}
                </div>
                {s.status === 'pending' && (
                  <div className="space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => openConfirm(s.id, 'approve')}
                    >
                      Phê duyệt
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => openConfirm(s.id, 'reject')}>
                      Từ chối
                    </Button>
                  </div>
                )}
                {s.status === 'approved' && (
                  <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded">
                    Đã duyệt
                  </span>
                )}
                {s.status === 'rejected' && (
                  <span className="ml-4 px-3 py-1 bg-red-100 text-red-800 rounded">Đã từ chối</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
