'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { formatVietnamDateTime } from '@/lib/timezone';

interface TeacherStudent {
  id: number;
  name: string;
  email: string;
  class_name?: string;
  className?: string;
}

interface BonusSuggestion {
  id: number;
  student_id: number;
  points: number;
  source_type: string;
  source_id?: number | null;
  evidence_url?: string | null;
  status?: string;
  author_id?: number | null;
  created_at?: string;
}

const SOURCE_TYPES = [
  { value: 'achievement', label: 'Thanh tich / giai thuong' },
  { value: 'activity', label: 'Dong gop hoat dong' },
  { value: 'development', label: 'Tien bo ca nhan' },
  { value: 'social', label: 'Dong gop cong dong' },
  { value: 'special', label: 'Ghi nhan dac biet' },
] as const;

function getResponseList<T>(payload: any, key: string): T[] {
  const value = payload?.data?.[key] ?? payload?.[key];
  return Array.isArray(value) ? value : [];
}

function getErrorMessage(payload: any, fallback: string) {
  return String(payload?.error || payload?.message || fallback);
}

function getStatusMeta(status?: string) {
  switch (status) {
    case 'approved':
      return { label: 'Da duyet', tone: 'bg-emerald-100 text-emerald-800' };
    case 'rejected':
      return { label: 'Tu choi', tone: 'bg-rose-100 text-rose-800' };
    default:
      return { label: 'Cho duyet', tone: 'bg-amber-100 text-amber-800' };
  }
}

export default function TeacherBonusProposalPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<BonusSuggestion[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [points, setPoints] = useState('');
  const [sourceType, setSourceType] = useState('achievement');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
      router.push('/login');
      return;
    }

    if (user) {
      void fetchData();
    }
  }, [authLoading, router, user]);

  async function fetchData() {
    try {
      setLoading(true);
      const [studentsRes, suggestionsRes] = await Promise.all([
        fetch('/api/teacher/students'),
        fetch('/api/bonus?status=pending'),
      ]);

      const studentsPayload = await studentsRes.json().catch(() => null);
      const suggestionsPayload = await suggestionsRes.json().catch(() => null);

      if (!studentsRes.ok) {
        throw new Error(getErrorMessage(studentsPayload, 'Khong the tai danh sach hoc vien'));
      }

      if (!suggestionsRes.ok) {
        throw new Error(getErrorMessage(suggestionsPayload, 'Khong the tai danh sach de xuat'));
      }

      const nextStudents = getResponseList<TeacherStudent>(studentsPayload, 'students');
      const allSuggestions = getResponseList<BonusSuggestion>(suggestionsPayload, 'suggestions');
      const ownSuggestions = allSuggestions.some((item) => item.author_id != null)
        ? allSuggestions.filter((item) => Number(item.author_id) === Number(user?.id))
        : allSuggestions;

      setStudents(nextStudents);
      setPendingSuggestions(
        ownSuggestions.sort((left, right) =>
          String(right.created_at || '').localeCompare(String(left.created_at || ''))
        )
      );
    } catch (error) {
      console.error('Teacher bonus proposal fetch error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the tai de xuat cong diem');
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter((student) => {
    if (!searchTerm) return true;

    const normalized = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(normalized) ||
      student.email.toLowerCase().includes(normalized) ||
      String(student.class_name || student.className || '')
        .toLowerCase()
        .includes(normalized)
    );
  });

  const selectedStudent =
    students.find((student) => String(student.id) === selectedStudentId) ?? null;

  async function handleSubmitProposal() {
    const numericPoints = Number(points);
    if (!selectedStudent || !numericPoints) {
      toast.error('Can chon hoc vien va nhap so diem de xuat');
      return;
    }

    if (!Number.isFinite(numericPoints) || numericPoints <= 0) {
      toast.error('So diem de xuat phai lon hon 0');
      return;
    }

    if (numericPoints > 15) {
      toast.error('So diem de xuat toi da la 15');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          points: numericPoints,
          source_type: sourceType,
          evidence_url: evidenceUrl.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Khong the gui de xuat cong diem'));
      }

      toast.success('Da gui de xuat cong diem');
      setSelectedStudentId('');
      setPoints('');
      setSourceType('achievement');
      setEvidenceUrl('');
      await fetchData();
    } catch (error) {
      console.error('Teacher bonus proposal submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Khong the gui de xuat cong diem');
    } finally {
      setSubmitting(false);
    }
  }

  const totalPendingPoints = pendingSuggestions.reduce(
    (sum, item) => sum + Number(item.points || 0),
    0
  );

  if (authLoading || loading) {
    return <LoadingSpinner message="Dang tai workspace cong diem..." />;
  }

  return (
    <div className="page-shell">
      <section className="page-surface overflow-hidden rounded-[1.75rem]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">
                <Sparkles className="h-3.5 w-3.5" />
                Bonus governance
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">De xuat cong diem</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                Gui de xuat ghi nhan thanh tich cho hoc vien theo dung cac truong backend dang luu
                va dua vao luong phe duyet cua admin.
              </p>
            </div>

            <div className="rounded-3xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              Admin se phe duyet truoc khi diem duoc cong vao ledger cuoi cung.
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Hoc vien co the de xuat</div>
              <div className="mt-2 text-3xl font-bold text-slate-950">{students.length}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">De xuat cho duyet</div>
              <div className="mt-2 text-3xl font-bold text-amber-600">{pendingSuggestions.length}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Tong diem dang cho</div>
              <div className="mt-2 text-3xl font-bold text-cyan-700">{totalPendingPoints}</div>
            </div>
            <div className="content-card p-4">
              <div className="text-sm text-slate-500">Tran de xuat moi lan</div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">15</div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="content-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Chon hoc vien</h2>
                  <p className="text-sm text-slate-500">
                    Tim nhanh theo ten, email hoac lop truoc khi lap de xuat.
                  </p>
                </div>
              </div>

              <label className="mt-5 block text-sm font-medium text-slate-700">
                <Search className="mr-1 inline h-4 w-4" />
                Tim hoc vien
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nhap ten, email hoac lop..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                />
              </label>

              <div className="mt-4 space-y-3">
                {filteredStudents.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                    Khong tim thay hoc vien phu hop.
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(String(student.id))}
                      className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                        selectedStudentId === String(student.id)
                          ? 'border-cyan-300 bg-cyan-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900">{student.name}</div>
                          <div className="mt-1 text-sm text-slate-500">{student.email}</div>
                          {student.class_name || student.className ? (
                            <div className="mt-1 text-sm text-slate-500">
                              {student.class_name || student.className}
                            </div>
                          ) : null}
                        </div>
                        {selectedStudentId === String(student.id) ? (
                          <span className="rounded-full bg-cyan-700 px-3 py-1 text-xs font-semibold text-white">
                            Dang chon
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="content-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Lap de xuat</h2>
                  <p className="text-sm text-slate-500">
                    Chi nhap cac thong tin ma backend dang luu va co the dua vao phan duyet.
                  </p>
                </div>
              </div>

              {selectedStudent ? (
                <div className="mt-5 rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
                  <div className="text-sm font-medium text-cyan-700">Hoc vien dang duoc de xuat</div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{selectedStudent.name}</div>
                  <div className="mt-1 text-sm text-slate-600">{selectedStudent.email}</div>
                  {selectedStudent.class_name || selectedStudent.className ? (
                    <div className="mt-1 text-sm text-slate-600">
                      {selectedStudent.class_name || selectedStudent.className}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Chon hoc vien o cot ben trai de bat dau lap de xuat.
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  So diem de xuat
                  <input
                    type="number"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={points}
                    onChange={(event) => setPoints(event.target.value)}
                    placeholder="Vi du: 5"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Nhom ghi nhan
                  <select
                    value={sourceType}
                    onChange={(event) => setSourceType(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                  >
                    {SOURCE_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block text-sm font-medium text-slate-700">
                Link bang chung
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder="https://example.com/evidence"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-cyan-500"
                />
              </label>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                Form nay khong thu them mo ta noi bo vi route hien tai chua luu truong do. Moi de
                xuat se duoc gui di voi hoc vien, diem, nhom ghi nhan va link bang chung.
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentId('');
                    setPoints('');
                    setSourceType('achievement');
                    setEvidenceUrl('');
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Lam moi form
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitProposal()}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? 'Dang gui...' : 'Gui de xuat'}
                </button>
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <section className="content-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Quy tac de xuat</h2>
                  <p className="text-sm text-slate-500">
                    Nhung diem teacher can nho de tranh gui sai hoac gui thua.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  Moi de xuat toi da 15 diem va van phai qua buoc phe duyet cua admin.
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  Uu tien dinh kem link bang chung khi de xuat cho thanh tich, giai thuong hoac su
                  kien co can xac minh.
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  Neu hoc vien da duoc ghi nhan o workflow khac, can doi soat de tranh cong trung
                  truoc khi gui.
                </div>
              </div>
            </section>

            <section className="content-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">De xuat dang cho duyet</h2>
                  <p className="text-sm text-slate-500">
                    Trang nay chi hien thi de xuat pending cua chinh teacher neu API co tra author.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {pendingSuggestions.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                    Chua co de xuat pending nao.
                  </div>
                ) : (
                  pendingSuggestions.map((suggestion) => {
                    const student =
                      students.find((item) => Number(item.id) === Number(suggestion.student_id)) ?? null;
                    const status = getStatusMeta(suggestion.status);

                    return (
                      <article key={suggestion.id} className="rounded-3xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-lg font-semibold text-slate-950">
                                +{suggestion.points} diem
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${status.tone}`}
                              >
                                {status.label}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-slate-600">
                              {student?.name || `Hoc vien #${suggestion.student_id}`}
                            </div>
                            {student?.class_name || student?.className ? (
                              <div className="mt-1 text-sm text-slate-500">
                                {student?.class_name || student?.className}
                              </div>
                            ) : null}
                            <div className="mt-1 text-sm text-slate-500">
                              Nhom: {suggestion.source_type || 'general'}
                            </div>
                            {suggestion.created_at ? (
                              <div className="mt-1 text-sm text-slate-500">
                                Tao luc: {formatVietnamDateTime(suggestion.created_at)}
                              </div>
                            ) : null}
                          </div>

                          {suggestion.evidence_url ? (
                            <a
                              href={suggestion.evidence_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Mo bang chung
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <div className="mt-5 rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-900">
                Neu backend tra ca de xuat cua teacher khac, page nay se tu loc theo `author_id`
                khi truong do co san de tranh lo thong tin khong can thiet.
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
