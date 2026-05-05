'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  FileText,
  Filter,
  MessageSquare,
  PencilLine,
  Plus,
  Save,
  Search,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime, parseVietnamDate, toVietnamDatetimeLocalValue } from '@/lib/timezone';

interface StudentNote {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  className: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface TeacherStudent {
  id: number;
  name: string;
  email: string;
  class_name?: string;
  className?: string;
}

type TimeFilter = 'all' | 'today' | 'week' | 'month';

interface NoteDraft {
  studentId: string;
  category: string;
  content: string;
}

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Tong quan', tone: 'bg-slate-100 text-slate-700' },
  { value: 'academic', label: 'Hoc tap', tone: 'bg-blue-100 text-blue-700' },
  { value: 'behavior', label: 'Ky luat', tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'attendance', label: 'Diem danh', tone: 'bg-amber-100 text-amber-700' },
  { value: 'health', label: 'Suc khoe', tone: 'bg-rose-100 text-rose-700' },
  { value: 'other', label: 'Khac', tone: 'bg-violet-100 text-violet-700' },
] as const;

const EMPTY_DRAFT: NoteDraft = {
  studentId: '',
  category: 'general',
  content: '',
};

function getNowInVietnam() {
  return parseVietnamDate(toVietnamDatetimeLocalValue(new Date())) ?? new Date();
}

function getStartOfTodayInVietnam() {
  const value = `${toVietnamDatetimeLocalValue(new Date()).slice(0, 10)}T00:00`;
  return parseVietnamDate(value) ?? new Date();
}

function getCategoryMeta(category: string) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category) ?? {
      value: category,
      label: category,
      tone: 'bg-slate-100 text-slate-700',
    }
  );
}

function getResponseList<T>(payload: any, key: string): T[] {
  const value = payload?.data?.[key] ?? payload?.[key];
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(payload: any, fallback: string) {
  return String(payload?.error || payload?.message || fallback);
}

function isWithinTimeRange(value: string, filter: TimeFilter) {
  if (filter === 'all') return true;

  const target = parseVietnamDate(value);
  if (!target) return false;

  if (filter === 'today') {
    return target.getTime() >= getStartOfTodayInVietnam().getTime();
  }

  const compareFrom = getNowInVietnam();
  if (filter === 'week') {
    compareFrom.setDate(compareFrom.getDate() - 7);
  } else {
    compareFrom.setMonth(compareFrom.getMonth() - 1);
  }

  return target.getTime() >= compareFrom.getTime();
}

export default function TeacherStudentNotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<NoteDraft>(EMPTY_DRAFT);
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);
  const [notePendingDelete, setNotePendingDelete] = useState<StudentNote | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
      router.replace('/login');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, router, user]);

  async function fetchData() {
    try {
      setLoading(true);

      const [notesRes, studentsRes] = await Promise.all([
        fetch('/api/teacher/notes'),
        fetch('/api/teacher/students'),
      ]);

      const notesPayload = await notesRes.json().catch(() => null);
      const studentsPayload = await studentsRes.json().catch(() => null);

      if (!notesRes.ok) {
        throw new Error(getErrorMessage(notesPayload, 'Khong the tai so tay hoc vien'));
      }

      if (!studentsRes.ok) {
        throw new Error(getErrorMessage(studentsPayload, 'Khong the tai danh sach hoc vien'));
      }

      setNotes(getResponseList<StudentNote>(notesPayload, 'notes'));
      setStudents(getResponseList<TeacherStudent>(studentsPayload, 'students'));
    } catch (error) {
      console.error('Teacher student notes fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai so tay hoc vien');
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingNote(null);
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  }

  function openEditDialog(note: StudentNote) {
    setEditingNote(note);
    setDraft({
      studentId: String(note.studentId),
      category: note.category || 'general',
      content: note.content || '',
    });
    setEditorOpen(true);
  }

  function closeEditor() {
    if (submitting) return;
    setEditorOpen(false);
    setEditingNote(null);
    setDraft(EMPTY_DRAFT);
  }

  async function handleSaveNote() {
    const trimmedContent = draft.content.trim();
    const studentId = Number(draft.studentId);

    if (!studentId || Number.isNaN(studentId) || !trimmedContent) {
      toast.error('Can chon hoc vien va nhap noi dung ghi chu');
      return;
    }

    try {
      setSubmitting(true);

      const isEditing = Boolean(editingNote);
      const response = await fetch(
        isEditing ? `/api/teacher/notes/${editingNote?.id}` : '/api/teacher/notes',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            category: draft.category,
            content: trimmedContent,
          }),
        }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Khong the luu ghi chu'));
      }

      toast.success(isEditing ? 'Da cap nhat ghi chu' : 'Da tao ghi chu moi');
      closeEditor();
      await fetchData();
    } catch (error) {
      console.error('Teacher student note save error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the luu ghi chu');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteNote() {
    if (!notePendingDelete) return;

    try {
      const response = await fetch(`/api/teacher/notes/${notePendingDelete.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Khong the xoa ghi chu'));
      }

      toast.success('Da xoa ghi chu');
      setNotePendingDelete(null);
      await fetchData();
    } catch (error) {
      console.error('Teacher student note delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the xoa ghi chu');
    }
  }

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchTerm ||
      note.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.className.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStudent = !studentFilter || String(note.studentId) === studentFilter;
    const matchesCategory = !categoryFilter || note.category === categoryFilter;
    const matchesTime = isWithinTimeRange(note.createdAt, timeFilter);

    return matchesSearch && matchesStudent && matchesCategory && matchesTime;
  });

  const notesThisWeek = notes.filter((note) => isWithinTimeRange(note.createdAt, 'week')).length;
  const notesToday = notes.filter((note) => isWithinTimeRange(note.createdAt, 'today')).length;
  const studentsWithNotes = new Set(notes.map((note) => note.studentId)).size;

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai so tay hoc vien..." />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <BookOpen className="h-3.5 w-3.5" />
                Theo doi hoc vien
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">So tay hoc vien</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Luu cac ghi chu van hanh theo hoc tap, diem danh va cac dau hieu can theo doi de
                teacher co lich su lam viec ro rang tren tung hoc vien.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateDialog}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-800"
            >
              <Plus className="h-4 w-4" />
              Them ghi chu
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Tong ghi chu</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{notes.length}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Hoc vien co ghi chu</div>
              <div className="mt-2 text-3xl font-bold text-cyan-700">{studentsWithNotes}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Trong 7 ngay</div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">{notesThisWeek}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Hom nay</div>
              <div className="mt-2 text-3xl font-bold text-amber-600">{notesToday}</div>
            </div>
          </div>

          <div className="content-card p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block text-sm font-medium text-slate-700">
                <Search className="mr-1 inline h-4 w-4" />
                Tim kiem
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ten, email, lop hoac noi dung..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <User className="mr-1 inline h-4 w-4" />
                Hoc vien
                <select
                  value={studentFilter}
                  onChange={(event) => setStudentFilter(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Tat ca hoc vien</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <Filter className="mr-1 inline h-4 w-4" />
                Danh muc
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">Tat ca danh muc</option>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <CalendarDays className="mr-1 inline h-4 w-4" />
                Thoi gian
                <select
                  value={timeFilter}
                  onChange={(event) => setTimeFilter(event.target.value as TimeFilter)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="all">Tat ca thoi gian</option>
                  <option value="today">Hom nay</option>
                  <option value="week">7 ngay qua</option>
                  <option value="month">30 ngay qua</option>
                </select>
              </label>
            </div>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="content-card p-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-14 w-14 text-slate-300" />
              <p className="text-lg font-medium text-slate-700">Chua co ghi chu phu hop bo loc</p>
              <p className="mt-2 text-sm text-slate-500">
                Thu doi bo loc, tim kiem lai hoac tao ghi chu moi cho hoc vien can theo doi.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredNotes.map((note) => {
                const category = getCategoryMeta(note.category);

                return (
                  <article key={note.id} className="content-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-slate-950">{note.studentName}</h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${category.tone}`}
                          >
                            {category.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span>{note.studentEmail}</span>
                          {note.className ? <span>{note.className}</span> : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditDialog(note)}
                          className="rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                          aria-label={`Sua ghi chu ${note.studentName}`}
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotePendingDelete(note)}
                          className="rounded-2xl border border-slate-200 p-2 text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`Xoa ghi chu ${note.studentName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {note.content}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                      <div>Tao luc: {formatVietnamDateTime(note.createdAt)}</div>
                      <div>Cap nhat: {formatVietnamDateTime(note.updatedAt)}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {editorOpen ? (
        <div className="app-modal-backdrop p-4" onClick={closeEditor}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-student-note-editor-title"
            className="app-modal-panel app-modal-panel-scroll w-full max-w-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                    <FileText className="h-3.5 w-3.5" />
                    Note editor
                  </div>
                  <h2 id="teacher-student-note-editor-title" className="mt-3 text-2xl font-semibold text-slate-950">
                    {editingNote ? 'Cap nhat ghi chu hoc vien' : 'Them ghi chu moi'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Chi hien thi nhung truong ma he thong dang luu va truy vet duoc trong lich su.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                  aria-label="Dong form ghi chu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-5 py-6 sm:px-7">
              <label className="block text-sm font-medium text-slate-700">
                <Users className="mr-1 inline h-4 w-4" />
                Hoc vien
                <select
                  value={draft.studentId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, studentId: event.target.value }))
                  }
                  disabled={Boolean(editingNote)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">Chon hoc vien</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                      {student.class_name || student.className ? ` - ${student.class_name || student.className}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <div className="text-sm font-medium text-slate-700">Danh muc</div>
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({ ...current, category: category.value }))
                      }
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        draft.category === category.value
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                <MessageSquare className="mr-1 inline h-4 w-4" />
                Noi dung ghi chu
                <textarea
                  value={draft.content}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, content: event.target.value }))
                  }
                  rows={7}
                  placeholder="Ghi ro tinh huong, buoc xu ly, nguoi can follow-up va moc thoi gian quan trong."
                  className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 leading-6 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                />
              </label>

              <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-900">
                Teacher nen ghi ro boi canh, dau hieu va hanh dong tiep theo. Noi dung nay duoc
                dung de handoff khi lop hoac hoc vien chuyen ca xu ly.
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                Huy
              </button>
              <button
                type="button"
                onClick={() => void handleSaveNote()}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Save className="h-4 w-4" />
                {submitting ? 'Dang luu...' : editingNote ? 'Cap nhat ghi chu' : 'Luu ghi chu'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={notePendingDelete !== null}
        title="Xoa ghi chu hoc vien"
        message={
          notePendingDelete
            ? `Ghi chu cua ${notePendingDelete.studentName} se bi xoa khoi so tay. Ban co chac chan muon tiep tuc?`
            : ''
        }
        confirmText="Xoa ghi chu"
        cancelText="Huy"
        variant="danger"
        onCancel={() => setNotePendingDelete(null)}
        onConfirm={async () => {
          await handleDeleteNote();
        }}
      />
    </div>
  );
}
