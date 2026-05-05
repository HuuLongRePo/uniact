export const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'admin', label: 'Quan tri' },
  { value: 'department_head', label: 'Truong khoa' },
  { value: 'vice_department_head', label: 'Pho truong khoa' },
  { value: 'class_manager', label: 'Co van hoc tap' },
  { value: 'staff', label: 'Nhan vien' },
  { value: 'teacher', label: 'Giang vien' },
  { value: 'student', label: 'Hoc vien' },
];

export function getRoleLabel(role?: string | null): string {
  if (!role) return '-';
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || role;
}

export function getRoleBadgeClass(role?: string | null): string {
  if (role === 'admin') return 'bg-rose-100 text-rose-800';
  if (role === 'teacher') return 'bg-cyan-100 text-cyan-800';
  if (role === 'student') return 'bg-emerald-100 text-emerald-800';
  if (role === 'class_manager') return 'bg-violet-100 text-violet-800';
  return 'bg-slate-100 text-slate-700';
}
