export const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'admin', label: 'Quản Trị' },
  { value: 'department_head', label: 'Trưởng Khoa' },
  { value: 'vice_department_head', label: 'Phó Trưởng Khoa' },
  { value: 'class_manager', label: 'Cố Vấn Học Tập' },
  { value: 'staff', label: 'Nhân Viên' },
  { value: 'teacher', label: 'Giảng Viên' },
  { value: 'student', label: 'Học Sinh' },
];

export function getRoleLabel(role?: string | null): string {
  if (!role) return '-';
  return ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
}

export function getRoleBadgeClass(role?: string | null): string {
  if (role === 'admin') return 'bg-red-100 text-red-800';
  if (role === 'teacher') return 'bg-blue-100 text-blue-800';
  if (role === 'student') return 'bg-green-100 text-green-800';
  return 'bg-gray-100 text-gray-800';
}
