'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Calendar,
  User,
  Filter,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Note {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  className: string;
}

export default function TeacherNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');
  const [noteStudentId, setNoteStudentId] = useState<number | null>(null);

  const categories = [
    { value: 'general', label: 'Chung', color: 'bg-gray-100 text-gray-700' },
    { value: 'academic', label: 'Học tập', color: 'bg-blue-100 text-blue-700' },
    { value: 'behavior', label: 'Hành vi', color: 'bg-green-100 text-green-700' },
    { value: 'attendance', label: 'Điểm danh', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'health', label: 'Sức khỏe', color: 'bg-red-100 text-red-700' },
    { value: 'other', label: 'Khác', color: 'bg-purple-100 text-purple-700' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [notesRes, studentsRes] = await Promise.all([
        fetch('/api/teacher/notes'),
        fetch('/api/teacher/students'),
      ]);

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNote() {
    if (!noteContent.trim() || !noteStudentId) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      const method = editingNote ? 'PUT' : 'POST';
      const url = editingNote ? `/api/teacher/notes/${editingNote.id}` : '/api/teacher/notes';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: noteStudentId,
          content: noteContent,
          category: noteCategory,
        }),
      });

      if (res.ok) {
        toast.success(editingNote ? 'Cập nhật ghi chú thành công!' : 'Tạo ghi chú thành công!');
        setShowNoteDialog(false);
        resetNoteForm();
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Lưu ghi chú thất bại');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Lưu ghi chú thất bại');
    }
  }

  async function handleDeleteNote(noteId: number) {
    try {
      const res = await fetch(`/api/teacher/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Xóa ghi chú thành công!');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Xóa ghi chú thất bại');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Xóa ghi chú thất bại');
    }
  }

  function openEditDialog(note: Note) {
    setEditingNote(note);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNoteStudentId(note.studentId);
    setShowNoteDialog(true);
  }

  function openNewDialog() {
    resetNoteForm();
    setShowNoteDialog(true);
  }

  function resetNoteForm() {
    setEditingNote(null);
    setNoteContent('');
    setNoteCategory('general');
    setNoteStudentId(null);
  }

  function getFilteredNotes() {
    let filtered = notes;

    // Filter by student
    if (selectedStudent) {
      filtered = filtered.filter((n) => n.studentId === selectedStudent);
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((n) => n.category === selectedCategory);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter((n) => new Date(n.createdAt) >= filterDate);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (n) =>
          n.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }

  function getCategoryStyle(category: string) {
    const cat = categories.find((c) => c.value === category);
    return cat?.color || 'bg-gray-100 text-gray-700';
  }

  function getCategoryLabel(category: string) {
    const cat = categories.find((c) => c.value === category);
    return cat?.label || category;
  }

  const filteredNotes = getFilteredNotes();

  if (loading) {
    return <LoadingSpinner message="Đang tải ghi chú..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 mb-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-8 h-8 text-blue-600" />
                Quản lý ghi chú sinh viên
              </h1>
              <p className="text-gray-600 mt-1">
                Ghi chú về học tập, hành vi và các thông tin quan trọng khác
              </p>
            </div>
            <button
              onClick={openNewDialog}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Tạo ghi chú mới
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600">Tổng ghi chú</p>
              <p className="text-2xl font-bold text-blue-600">{notes.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600">Sinh viên có ghi chú</p>
              <p className="text-2xl font-bold text-green-600">
                {new Set(notes.map((n) => n.studentId)).size}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-gray-600">Tuần này</p>
              <p className="text-2xl font-bold text-purple-600">
                {
                  notes.filter((n) => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(n.createdAt) >= weekAgo;
                  }).length
                }
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-gray-600">Hôm nay</p>
              <p className="text-2xl font-bold text-yellow-600">
                {
                  notes.filter((n) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return new Date(n.createdAt) >= today;
                  }).length
                }
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Student Filter */}
            <div>
              <select
                value={selectedStudent || ''}
                onChange={(e) => setSelectedStudent(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Tất cả sinh viên</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="week">7 ngày qua</option>
                <option value="month">30 ngày qua</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedStudent || selectedCategory || dateFilter !== 'all' || searchQuery) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Đang lọc:</span>
              {selectedStudent && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1">
                  {students.find((s) => s.id === selectedStudent)?.name}
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="hover:bg-blue-200 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                  {getCategoryLabel(selectedCategory)}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="hover:bg-green-200 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {dateFilter !== 'all' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1">
                  {dateFilter === 'today'
                    ? 'Hôm nay'
                    : dateFilter === 'week'
                      ? '7 ngày'
                      : '30 ngày'}
                  <button
                    onClick={() => setDateFilter('all')}
                    className="hover:bg-purple-200 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setSelectedCategory('');
                  setDateFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Chưa có ghi chú</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedStudent || selectedCategory || dateFilter !== 'all'
                  ? 'Không tìm thấy ghi chú nào với bộ lọc hiện tại'
                  : 'Bắt đầu tạo ghi chú đầu tiên cho sinh viên của bạn'}
              </p>
              {!searchQuery && !selectedStudent && (
                <button
                  onClick={openNewDialog}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Tạo ghi chú mới
                </button>
              )}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-gray-600" />
                      <span className="font-bold text-lg text-gray-800">{note.studentName}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryStyle(note.category)}`}
                      >
                        {getCategoryLabel(note.category)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{note.studentEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditDialog(note)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setNoteToDelete(note)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Tạo: {new Date(note.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  {note.updatedAt !== note.createdAt && (
                    <div className="flex items-center gap-1">
                      <Edit2 className="w-4 h-4" />
                      <span>Sửa: {new Date(note.updatedAt).toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results count */}
        {filteredNotes.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            Hiển thị {filteredNotes.length} / {notes.length} ghi chú
          </div>
        )}
      </div>

      {/* Note Dialog */}
      {showNoteDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  {editingNote ? 'Chỉnh sửa ghi chú' : 'Tạo ghi chú mới'}
                </h3>
                <button
                  onClick={() => setShowNoteDialog(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Chọn sinh viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={noteStudentId || ''}
                  onChange={(e) => setNoteStudentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
                  disabled={!!editingNote}
                >
                  <option value="">-- Chọn sinh viên --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className}) - {s.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Danh mục <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setNoteCategory(cat.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        noteCategory === cat.value
                          ? cat.color + ' ring-2 ring-offset-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung ghi chú <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200"
                  placeholder="Nhập nội dung ghi chú chi tiết..."
                />
                <p className="mt-1 text-xs text-gray-500">{noteContent.length} ký tự</p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-800">
                  💡 <strong>Lưu ý:</strong> Ghi chú sẽ chỉ hiển thị cho giảng viên. Hãy ghi chép
                  đầy đủ thông tin để dễ dàng tra cứu sau này.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
              <button
                onClick={() => setShowNoteDialog(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNote}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-lg transition-all"
              >
                <Save className="w-5 h-5" />
                {editingNote ? 'Cập nhật' : 'Lưu ghi chú'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={noteToDelete !== null}
        title="Xóa ghi chú"
        message={
          noteToDelete
            ? `Bạn có chắc chắn muốn xóa ghi chú của sinh viên "${noteToDelete.studentName}"?`
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
