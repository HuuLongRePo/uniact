export interface User {
  id: number;
  email: string;
  username?: string;
  full_name: string;
  role: string;
  student_code?: string;
  phone?: string;
  class_id?: number;
  class_name?: string;
  teaching_class_id?: number | null;
  teaching_class_name?: string | null;
  teacher_rank?: string | null;
  academic_title?: string | null;
  academic_degree?: string | null;
  created_at: string;
  avatar_url?: string;
  gender?: 'nam' | 'nữ' | null;
  date_of_birth?: string | null;
  citizen_id?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  address_detail?: string | null;
  address?: string | null;
  code?: string | null;
  is_active?: number | boolean | null;
}
