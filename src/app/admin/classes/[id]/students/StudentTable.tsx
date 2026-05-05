'use client';

import { Student } from './types';

interface StudentTableProps {
  students: Student[];
  loading: boolean;
  page?: number;
  pageSize?: number;
  selectedStudents: Set<number>;
  onToggleSelectAll: () => void;
  onToggleSelectStudent: (studentId: number) => void;
  onView: (student: Student) => void;
  onMove: (student: Student) => void;
  onRemove: (student: Student) => void;
}

function StudentMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export default function StudentTable({
  students,
  loading,
  page = 1,
  pageSize = students.length || 1,
  selectedStudents,
  onToggleSelectAll,
  onToggleSelectStudent,
  onView,
  onMove,
  onRemove,
}: StudentTableProps) {
  const isEmpty = students.length === 0;
  const allSelected = students.length > 0 && selectedStudents.size === students.length;

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
        Dang tai roster hoc vien...
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
        Khong co hoc vien nao trong roster nay.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:hidden">
        {students.map((student, index) => (
          <article key={student.id} className="rounded-3xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  aria-label={`Chon hoc vien ${student.name}`}
                  checked={selectedStudents.has(student.id)}
                  onChange={() => onToggleSelectStudent(student.id)}
                />
                Chon
              </label>
              <div className="text-xs font-medium text-slate-400">
                #{(page - 1) * pageSize + index + 1}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-base font-semibold text-slate-950">{student.name}</div>
              <div className="mt-1 text-sm text-slate-500">{student.email}</div>
              <div className="mt-1 text-sm text-slate-500">
                {student.student_code || 'Chua co ma hoc vien'}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <StudentMetric label="Hoat dong" value={student.activity_count || 0} />
              <StudentMetric label="Co mat" value={student.attended_count || 0} />
              <StudentMetric label="Tong diem" value={student.total_points || 0} />
              <StudentMetric label="Khen thuong" value={student.award_count || 0} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onView(student)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50"
              >
                Chi tiet
              </button>
              <button
                type="button"
                onClick={() => onMove(student)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
              >
                Chuyen lop
              </button>
              <button
                type="button"
                onClick={() => onRemove(student)}
                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
              >
                Xoa khoi lop
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                <input
                  type="checkbox"
                  aria-label="Chon tat ca hoc vien"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">#</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Hoc vien</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Ma</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Hoat dong</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Co mat</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Tong diem</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Tac vu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {students.map((student, index) => (
              <tr key={student.id}>
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    aria-label={`Chon hoc vien ${student.name}`}
                    checked={selectedStudents.has(student.id)}
                    onChange={() => onToggleSelectStudent(student.id)}
                  />
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {(page - 1) * pageSize + index + 1}
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-950">{student.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{student.email}</div>
                </td>
                <td className="px-4 py-4 text-slate-600">{student.student_code || '-'}</td>
                <td className="px-4 py-4 text-right font-medium text-slate-900">
                  {student.activity_count || 0}
                </td>
                <td className="px-4 py-4 text-right font-medium text-slate-900">
                  {student.attended_count || 0}
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {student.total_points || 0}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => onView(student)}
                      className="text-sm font-medium text-cyan-700 hover:text-cyan-800"
                    >
                      Chi tiet
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(student)}
                      className="text-sm font-medium text-violet-700 hover:text-violet-800"
                    >
                      Chuyen lop
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(student)}
                      className="text-sm font-medium text-rose-700 hover:text-rose-800"
                    >
                      Xoa khoi lop
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
