'use client';

import { useState } from 'react';
import { Download, Eye, MoreVertical, Pencil, School, Trash2, UserPlus, Users } from 'lucide-react';
import { formatVietnamDateTime } from '@/lib/timezone';
import { Class } from './types';

interface ClassTableProps {
  classes: Class[];
  loading: boolean;
  onView: (cls: Class) => void;
  onViewStudents: (classId: number) => void;
  onExport: (classId: number, className: string) => void;
  onAssignTeacher: (cls: Class) => void;
  onEdit: (cls: Class) => void;
  onDelete: (cls: Class) => void;
}

export default function ClassTable({
  classes,
  loading,
  onView,
  onViewStudents,
  onExport,
  onAssignTeacher,
  onEdit,
  onDelete,
}: ClassTableProps) {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  if (loading && classes.length === 0) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
        Dang tai danh sach lop...
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
        <div className="text-base font-medium text-slate-900">Chua co lop hoc nao</div>
        <p className="mt-2 text-sm text-slate-500">Bat dau bang cach tao lop moi hoac bo loc.</p>
      </div>
    );
  }

  const totalStudents = classes.reduce((sum, item) => sum + Number(item.student_count || 0), 0);

  return (
    <div className="space-y-4">
      {loading && classes.length > 0 && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          Dang cap nhat danh sach lop...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
          <div className="text-sm font-medium text-cyan-800">Tong lop dang hien thi</div>
          <div className="mt-3 text-3xl font-semibold text-cyan-950">{classes.length}</div>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="text-sm font-medium text-emerald-800">Tong hoc vien</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-950">{totalStudents}</div>
        </div>
        <div className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <div className="text-sm font-medium text-violet-800">Da gan GVCN</div>
          <div className="mt-3 text-3xl font-semibold text-violet-950">
            {classes.filter((item) => item.teacher_id).length}
          </div>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="text-sm font-medium text-amber-800">Si so trung binh</div>
          <div className="mt-3 text-3xl font-semibold text-amber-950">
            {Math.round(totalStudents / Math.max(classes.length, 1))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {classes.map((cls) => (
          <div key={cls.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">{cls.name}</div>
                <div className="mt-1 text-sm text-slate-500">Khoi {cls.grade}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === cls.id ? null : cls.id)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                Hoc vien: <span className="font-semibold">{cls.student_count || 0}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                GVCN: <span className="font-semibold">{cls.teacher_name || 'Chua gan'}</span>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tao ngay {formatVietnamDateTime(cls.created_at, 'date')}
            </div>

            {openDropdown === cls.id && (
              <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <button
                  type="button"
                  onClick={() => {
                    onView(cls);
                    setOpenDropdown(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <Eye className="h-4 w-4" />
                  Xem chi tiet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onViewStudents(cls.id);
                    setOpenDropdown(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <Users className="h-4 w-4" />
                  Danh sach hoc vien
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAssignTeacher(cls);
                    setOpenDropdown(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Gan GVCN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExport(cls.id, cls.name);
                    setOpenDropdown(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Xuat CSV
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(cls);
                      setOpenDropdown(null);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-3 py-2 text-sm font-medium text-white"
                  >
                    <Pencil className="h-4 w-4" />
                    Sua
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(cls);
                      setOpenDropdown(null);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-700 px-3 py-2 text-sm font-medium text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xoa
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-sm lg:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Lop hoc
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Khoi
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                GVCN
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Si so
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ngay tao
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Thao tac
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {classes.map((cls) => (
              <tr key={cls.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <button type="button" onClick={() => onView(cls)} className="text-left">
                    <div className="font-semibold text-slate-900">{cls.name}</div>
                    {cls.description ? (
                      <div className="mt-1 line-clamp-1 text-sm text-slate-500">{cls.description}</div>
                    ) : null}
                  </button>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">Khoi {cls.grade}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{cls.teacher_name || 'Chua gan GVCN'}</td>
                <td className="px-4 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => onViewStudents(cls.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-200"
                  >
                    <School className="h-4 w-4" />
                    {cls.student_count || 0}
                  </button>
                </td>
                <td className="px-4 py-4 text-sm text-slate-500">
                  {formatVietnamDateTime(cls.created_at, 'date')}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(cls)}
                      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem
                    </button>
                    <button
                      type="button"
                      onClick={() => onAssignTeacher(cls)}
                      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Gan GVCN
                    </button>
                    <button
                      type="button"
                      onClick={() => onExport(cls.id, cls.name)}
                      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Xuat
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(cls)}
                      className="inline-flex items-center gap-1 rounded-2xl bg-cyan-700 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sua
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(cls)}
                      className="inline-flex items-center gap-1 rounded-2xl bg-rose-700 px-3 py-2 text-xs font-medium text-white hover:bg-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
