'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit2, Save, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface StudentNote {
  id: number;
  student_id: number;
  teacher_id: number;
  content: string;
  category: 'behavior' | 'academic' | 'health' | 'family' | 'other';
  is_confidential: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface Student {
  id: number;
  name: string;
  student_code: string;
  class_name: string;
}

const CATEGORIES = [
  { key: 'behavior', label: '😊 Hành vi', color: 'bg-blue-100 text-blue-700' },
  { key: 'academic', label: '📚 Học tập', color: 'bg-purple-100 text-purple-700' },
  { key: 'health', label: '💪 Sức khỏe', color: 'bg-green-100 text-green-700' },
  { key: 'family', label: '👨‍👩‍👧 Gia đình', color: 'bg-orange-100 text-orange-700' },
  { key: 'other', label: '📝 Khác', color: 'bg-gray-100 text-gray-700' },
];

export default function StudentNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = React.use(params);
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<StudentNote | null>(null);

  // Form state
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<StudentNote['category']>('behavior');
  const [formConfidential, setFormConfidential] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentRes, notesRes] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetch(`/api/students/${studentId}/notes`),
      ]);

      if (!studentRes.ok) throw new Error('Không thể tải thông tin học viên');

      const studentData = await studentRes.json();
      setStudent(studentData.student || studentData.data?.student || studentData);

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || notesData.data?.notes || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!formContent.trim()) {
      toast.error('Vui lòng nhập nội dung ghi chú');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/students/${studentId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formContent,
          category: formCategory,
          is_confidential: formConfidential,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Không thể tạo ghi chú');
      }

      toast.success('Tạo ghi chú thành công');
      setFormContent('');
      setFormCategory('behavior');
      setFormConfidential(false);
      setIsCreating(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Không thể tạo ghi chú');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!formContent.trim()) {
      toast.error('Vui lòng nhập nội dung ghi chú');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/students/${studentId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formContent,
          category: formCategory,
          is_confidential: formConfidential,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Không thể cập nhật ghi chú');
      }

      toast.success('Cập nhật ghi chú thành công');
      setEditingId(null);
      setFormContent('');
      setFormCategory('behavior');
      setFormConfidential(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Không thể cập nhật ghi chú');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    try {
      const response = await fetch(`/api/students/${studentId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Không thể xóa ghi chú');
      }

      toast.success('Xóa ghi chú thành công');
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Không thể xóa ghi chú');
    }
  };

  const startEditing = (note: StudentNote) => {
    setEditingId(note.id);
    setFormContent(note.content);
    setFormCategory(note.category);
    setFormConfidential(note.is_confidential);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormContent('');
    setFormCategory('behavior');
    setFormConfidential(false);
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find((c) => c.key === category);
    return cat?.color || 'bg-gray-100 text-gray-700';
  };

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find((c) => c.key === category);
    return cat?.label || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
            <p className="text-gray-600">Không tìm thấy học viên</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Ghi chú - {student.name}</h1>
          <p className="text-gray-600 mt-2">
            Mã: {student.student_code} | Lớp: {student.class_name}
          </p>
        </div>

        {/* Create Note Form */}
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="mb-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Thêm ghi chú mới
          </button>
        ) : (
          <div className="mb-6 bg-white rounded-lg shadow p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ghi chú mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung *</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Nhập nội dung ghi chú..."
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loại *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as StudentNote['category'])}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={formConfidential}
                      onChange={(e) => setFormConfidential(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">🔐 Bảo mật</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateNote}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Đang lưu...' : 'Lưu ghi chú'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center border border-gray-200">
              <p className="text-gray-600">Chưa có ghi chú nào</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition"
              >
                {editingId === note.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nội dung *
                      </label>
                      <textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Loại *
                        </label>
                        <select
                          value={formCategory}
                          onChange={(e) =>
                            setFormCategory(e.target.value as StudentNote['category'])
                          }
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.key} value={cat.key}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={formConfidential}
                            onChange={(e) => setFormConfidential(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">🔐 Bảo mật</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="flex-1 px-4 py-2 border rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save className="w-5 h-5" />
                        {saving ? 'Đang lưu...' : 'Cập nhật'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(note.category)}`}
                          >
                            {getCategoryLabel(note.category)}
                          </span>
                          {note.is_confidential && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                              🔐 Bảo mật
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => startEditing(note)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setNoteToDelete(note)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>Bởi: {note.created_by}</span>
                      <span>
                        {new Date(note.created_at).toLocaleString('vi-VN')}
                        {note.updated_at !== note.created_at &&
                          ` (cập nhật: ${new Date(note.updated_at).toLocaleString('vi-VN')})`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={noteToDelete !== null}
        title="Xóa ghi chú"
        message={
          noteToDelete
            ? `Bạn có chắc chắn muốn xóa ghi chú "${noteToDelete.content.slice(0, 80)}${noteToDelete.content.length > 80 ? '...' : ''}"?`
            : ''
        }
        confirmText="Xóa ghi chú"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setNoteToDelete(null)}
        onConfirm={async () => {
          if (!noteToDelete) return;
          await handleDeleteNote(noteToDelete.id);
          setNoteToDelete(null);
        }}
      />
    </div>
  );
}
