'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Clock3, Send, Trash2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatVietnamDateTime } from '@/lib/timezone';

type AwardSuggestion = {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  class_name: string;
  award_type_id: number;
  award_type_name: string;
  award_min_points: number;
  score_snapshot: number;
  status: 'pending' | 'approved' | 'rejected';
  note: string;
  suggested_at: string;
};

type StudentOption = {
  id: number;
  name: string;
  class_name: string;
  total_points: number;
};

type AwardTypeOption = {
  id: number;
  name: string;
  description: string;
  min_points: number;
};

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{hint}</p>
    </div>
  );
}

async function parseJson(response: Response, fallbackMessage: string) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || fallbackMessage);
  }
  return payload;
}

export default function AwardSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<AwardSuggestion[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [awardTypes, setAwardTypes] = useState<AwardTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedAwardTypeId, setSelectedAwardTypeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<AwardSuggestion | null>(null);

  const fetchData = async (nextFilter: typeof filter = filter) => {
    try {
      setLoading(true);

      const [suggestionsResponse, studentsResponse, awardTypesResponse] = await Promise.all([
        fetch(`/api/teacher/award-suggestions?status=${nextFilter === 'all' ? '' : nextFilter}`),
        fetch('/api/teacher/students'),
        fetch('/api/teacher/award-types'),
      ]);

      const [suggestionsPayload, studentsPayload, awardTypesPayload] = await Promise.all([
        parseJson(suggestionsResponse, 'Không thể tải danh sách đề xuất khen thưởng'),
        parseJson(studentsResponse, 'Không thể tải danh sách học viên'),
        parseJson(awardTypesResponse, 'Không thể tải danh sách loại khen thưởng'),
      ]);

      setSuggestions(suggestionsPayload?.data?.suggestions || suggestionsPayload?.suggestions || []);
      setStudents(
        (studentsPayload?.data?.students || studentsPayload?.students || []).map((student: any) => ({
          id: Number(student.id),
          name: String(student.full_name || student.name || ''),
          class_name: String(student.class_name || ''),
          total_points: Number(student.total_points || student.total_score || 0),
        }))
      );
      setAwardTypes(
        (awardTypesPayload?.data?.awardTypes || awardTypesPayload?.awardTypes || []).map(
          (awardType: any) => ({
            id: Number(awardType.id),
            name: String(awardType.name || ''),
            description: String(awardType.description || ''),
            min_points: Number(awardType.min_points || 0),
          })
        )
      );
    } catch (error) {
      console.error('Fetch teacher award suggestions error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu đề xuất khen thưởng'
      );
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(filter);
  }, [filter]);

  const handleCreateSuggestion = async () => {
    const studentId = Number(selectedStudentId);
    const awardTypeId = Number(selectedAwardTypeId);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      toast.error('Hãy chọn học viên');
      return;
    }

    if (!Number.isInteger(awardTypeId) || awardTypeId <= 0) {
      toast.error('Hãy chọn loại khen thưởng');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/teacher/award-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          award_type_id: awardTypeId,
        }),
      });

      const payload = await parseJson(response, 'Không thể tạo đề xuất khen thưởng');
      toast.success(payload?.message || 'Tạo đề xuất khen thưởng thành công');
      setSelectedStudentId('');
      setSelectedAwardTypeId('');
      await fetchData(filter);
    } catch (error) {
      console.error('Create teacher award suggestion error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tạo đề xuất khen thưởng');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSuggestion = async (suggestionId: number) => {
    try {
      const response = await fetch(`/api/teacher/award-suggestions/${suggestionId}`, {
        method: 'DELETE',
      });
      const payload = await parseJson(response, 'Không thể xóa đề xuất khen thưởng');
      toast.success(payload?.message || 'Xóa đề xuất khen thưởng thành công');
      await fetchData(filter);
    } catch (error) {
      console.error('Delete teacher award suggestion error:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể xóa đề xuất khen thưởng');
    }
  };

  const selectedStudent = students.find((student) => String(student.id) === selectedStudentId) || null;
  const selectedAwardType =
    awardTypes.find((awardType) => String(awardType.id) === selectedAwardTypeId) || null;

  const stats = useMemo(
    () => ({
      total: suggestions.length,
      pending: suggestions.filter((suggestion) => suggestion.status === 'pending').length,
      approved: suggestions.filter((suggestion) => suggestion.status === 'approved').length,
      rejected: suggestions.filter((suggestion) => suggestion.status === 'rejected').length,
    }),
    [suggestions]
  );

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Quy trình khen thưởng
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Đề xuất khen thưởng</h1>
              <p className="mt-2 text-sm text-slate-600">
                Giảng viên tạo đề xuất khen thưởng theo loại đã cấu hình sẵn. Biểu mẫu này chỉ gồm các trường backend đang lưu.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
              <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Tổng đề xuất</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</div>
              </div>
              <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Đang chờ</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{stats.pending}</div>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Đã duyệt</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{stats.approved}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Tạo đề xuất mới</h2>
              <p className="mt-2 text-sm text-slate-600">
                Chọn học viên và loại khen thưởng. Điểm snapshot sẽ được backend tự ghi nhận lúc tạo đề xuất.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Học viên</span>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              >
                <option value="">Chọn học viên</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {student.class_name || 'Chưa gán lớp'}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Loại khen thưởng</span>
              <select
                value={selectedAwardTypeId}
                onChange={(event) => setSelectedAwardTypeId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              >
                <option value="">Chọn loại khen thưởng</option>
                {awardTypes.map((awardType) => (
                  <option key={awardType.id} value={awardType.id}>
                    {awardType.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void handleCreateSuggestion()}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send className="h-4 w-4" />
                {saving ? 'Đang tạo...' : 'Tạo đề xuất'}
              </button>
            </div>
          </div>

          {selectedStudent || selectedAwardType ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Học viên đã chọn</div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {selectedStudent ? selectedStudent.name : 'Chưa chọn'}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedStudent
                    ? `${selectedStudent.class_name || 'Chưa gán lớp'} · ${selectedStudent.total_points} điểm`
                    : 'Cần chọn học viên trước khi tạo đề xuất'}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loại khen thưởng</div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {selectedAwardType ? selectedAwardType.name : 'Chưa chọn'}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedAwardType
                    ? `Mốc điểm tối thiểu: ${selectedAwardType.min_points}. ${selectedAwardType.description || 'Không có mô tả bổ sung.'}`
                    : 'Cần chọn loại khen thưởng phù hợp'}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === tab
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab === 'all' && 'Tất cả'}
                {tab === 'pending' && 'Đang chờ'}
                {tab === 'approved' && 'Đã duyệt'}
                {tab === 'rejected' && 'Bị từ chối'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              Đang tải đề xuất khen thưởng...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="Chưa có đề xuất nào"
                hint="Sau khi tao de xuat, danh sach se hien tai day de teacher theo doi tien do duyet."
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {suggestions.map((suggestion) => (
                <article
                  key={suggestion.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                          {suggestion.award_type_name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            suggestion.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : suggestion.status === 'rejected'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {suggestion.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                          {suggestion.status === 'pending' ? <Clock3 className="h-3.5 w-3.5" /> : null}
                          {suggestion.status === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> : null}
                          {suggestion.status === 'approved' && 'Đã duyệt'}
                          {suggestion.status === 'pending' && 'Đang chờ'}
                          {suggestion.status === 'rejected' && 'Bị từ chối'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatVietnamDateTime(suggestion.suggested_at)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{suggestion.student_name}</h3>
                        <span className="text-sm text-slate-500">
                          {suggestion.class_name || 'Chưa gán lớp'}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">
                            {suggestion.student_email || 'Chưa cập nhật'}
                          </div>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score snapshot</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{suggestion.score_snapshot}</div>
                        </div>
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điểm tối thiểu</div>
                          <div className="mt-1 text-sm font-medium text-slate-900">{suggestion.award_min_points}</div>
                        </div>
                      </div>

                      {suggestion.note ? (
                        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                          Ghi chú phê duyệt: {suggestion.note}
                        </div>
                      ) : null}
                    </div>

                    {suggestion.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => setSuggestionToDelete(suggestion)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa đề xuất
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={suggestionToDelete !== null}
        title="Xóa đề xuất khen thưởng"
        message={
          suggestionToDelete
            ? `Bạn có chắc muốn xóa đề xuất "${suggestionToDelete.award_type_name}" cho học viên ${suggestionToDelete.student_name}?`
            : ''
        }
        confirmText="Xóa đề xuất"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setSuggestionToDelete(null)}
        onConfirm={async () => {
          if (!suggestionToDelete) return;
          await handleDeleteSuggestion(suggestionToDelete.id);
          setSuggestionToDelete(null);
        }}
      />
    </div>
  );
}
