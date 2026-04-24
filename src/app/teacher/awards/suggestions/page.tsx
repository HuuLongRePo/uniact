'use client';

import { useState, useEffect } from 'react';
import { useEffectEventCompat } from '@/lib/useEffectEventCompat';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Trash2, Send, Award, CheckCircle, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatVietnamDateTime } from '@/lib/timezone';

interface AwardSuggestion {
  id: number;
  student_id: number;
  student_name: string;
  student_code: string;
  award_type: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  suggested_by: string;
  suggested_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

interface Student {
  id: number;
  name: string;
  student_code: string;
  class_name: string;
}

const AWARD_TYPES = [
  { key: 'excellence', label: '🏆 Xuất sắc' },
  { key: 'good_student', label: '⭐ Học viên tốt' },
  { key: 'discipline', label: '👮 Kỷ luật tốt' },
  { key: 'volunteer', label: '💚 Tình nguyện viên' },
  { key: 'leadership', label: '👥 Lãnh đạo' },
  { key: 'sports', label: '🏅 Thể thao' },
  { key: 'arts', label: '🎨 Nghệ thuật' },
  { key: 'other', label: '🎯 Khác' },
];

export default function AwardSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<AwardSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<AwardSuggestion | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState({ awardType: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    return 'Đã xảy ra lỗi không xác định';
  };

  const fetchData = useEffectEventCompat(async () => {
    try {
      setLoading(true);
      const [suggestionsRes, studentsRes] = await Promise.all([
        fetch(`/api/teacher/award-suggestions?status=${filter}`),
        fetch('/api/classes/my-students'),
      ]);

      if (!suggestionsRes.ok) throw new Error('Không thể tải danh sách đề xuất');

      const suggestionsData = await suggestionsRes.json();
      setSuggestions(suggestionsData.suggestions || []);

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    fetchData();
  }, [filter, fetchData]);

  const handleCreateSuggestion = async () => {
    if (!selectedStudent) {
      toast.error('Vui lòng chọn học viên');
      return;
    }
    if (!formData.awardType) {
      toast.error('Vui lòng chọn loại giải thưởng');
      return;
    }
    if (!formData.reason.trim()) {
      toast.error('Vui lòng nhập lý do đề xuất');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/teacher/award-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          award_type: formData.awardType,
          reason: formData.reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Không thể tạo đề xuất');
      }

      toast.success('Tạo đề xuất thành công');
      setIsCreating(false);
      setSelectedStudent(null);
      setFormData({ awardType: '', reason: '' });
      fetchData();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSuggestion = async (id: number) => {
    try {
      const response = await fetch(`/api/teacher/award-suggestions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Không thể xóa đề xuất');
      }

      toast.success('Xóa đề xuất thành công');
      fetchData();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Đã phê duyệt';
      case 'pending':
        return 'Chờ phê duyệt';
      case 'rejected':
        return 'Từ chối';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading && !isCreating) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Đề xuất giải thưởng</h1>
          <p className="text-gray-600 mt-2">Đề xuất học viên đáng giành giải thưởng</p>
        </div>

        {/* Create Button */}
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="mb-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-2"
          >
            <Award className="w-5 h-5" />
            Tạo đề xuất mới
          </button>
        ) : (
          <div className="mb-6 bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tạo đề xuất giải thưởng mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Học viên *</label>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => {
                    const student = students.find((s) => s.id === parseInt(e.target.value));
                    setSelectedStudent(student || null);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn học viên --</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.student_code}) - {student.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại giải thưởng *
                </label>
                <select
                  value={formData.awardType}
                  onChange={(e) => setFormData({ ...formData, awardType: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn loại --</option>
                  {AWARD_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do đề xuất *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Nhập lý do và thành tích nổi bật..."
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedStudent(null);
                    setFormData({ awardType: '', reason: '' });
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateSuggestion}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  {saving ? 'Đang tạo...' : 'Tạo đề xuất'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`py-3 px-4 font-medium transition ${
                filter === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'all' && '📋 Tất cả'}
              {tab === 'pending' && '⏳ Chờ duyệt'}
              {tab === 'approved' && '✓ Đã duyệt'}
              {tab === 'rejected' && '✗ Từ chối'}
            </button>
          ))}
        </div>

        {/* Suggestions List */}
        {suggestions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <p className="text-gray-600">Không có đề xuất nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {suggestion.student_name}
                        </h3>
                        <p className="text-sm text-gray-600">Mã: {suggestion.student_code}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {AWARD_TYPES.find((t) => t.key === suggestion.award_type)?.label ||
                          suggestion.award_type}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(suggestion.status)}`}
                      >
                        {getStatusIcon(suggestion.status)}
                        {getStatusLabel(suggestion.status)}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{suggestion.reason}</p>
                  </div>

                  {suggestion.status === 'pending' && (
                    <button
                      onClick={() => setSuggestionToDelete(suggestion)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-gray-500 border-t pt-3 flex justify-between">
                  <span>Đề xuất bởi: {suggestion.suggested_by}</span>
                  <span>{formatVietnamDateTime(suggestion.suggested_at)}</span>
                </div>

                {suggestion.status === 'rejected' && suggestion.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                    <p className="text-sm font-medium text-red-700">Lý do từ chối:</p>
                    <p className="text-sm text-red-600 mt-1">{suggestion.rejection_reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={suggestionToDelete !== null}
        title="Xóa đề xuất giải thưởng"
        message={
          suggestionToDelete
            ? `Bạn có chắc chắn muốn xóa đề xuất dành cho học viên "${suggestionToDelete.student_name}" không?`
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
