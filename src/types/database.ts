export type UserRole = 'admin' | 'teacher' | 'student';

// 🆕 THÊM MỚI các types cho hệ thống nội bộ
export interface Department {
  id: number;
  name: string;
  code: string;
  manager_id?: number;
  created_at: string;
}

export interface ActivityType {
  id: number;
  name: string;
  base_points: number;
  color: string;
  description?: string;
  created_at: string;
}

export interface OrganizationLevel {
  id: number;
  name: string;
  multiplier: number;
  description?: string;
  created_at: string;
}

export interface Device {
  id: number;
  user_id: number;
  mac_address: string;
  device_name?: string;
  approved: boolean;
  last_seen?: string;
  created_at: string;
}

export interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  updated_by?: number;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  password_hash?: string;
  avatar_url?: string;
  class_id?: number;
  department_id?: number; // 🆕 THÊM department_id
  mac_address?: string; // 🆕 THÊM mac_address
  is_active: boolean; // 🆕 THÊM is_active
  gender?: 'nam' | 'nữ';
  date_of_birth?: string;
  citizen_id?: string;
  province?: string;
  district?: string;
  ward?: string;
  address_detail?: string;
  created_at: string;
}

export interface Class {
  id: number;
  name: string;
  grade: string;
  teacher_id: number;
  description?: string;
  created_at: string;
}

export interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  teacher_id: number;
  max_participants: number;
  class_ids?: number[]; // derived from activity_classes
  status: 'draft' | 'published' | 'rejected' | 'cancelled' | 'completed';
  // 🆕 THÊM các trường mới
  activity_type_id: number;
  organization_level_id: number;
  department_id?: number;
  base_points: number;
  approval_flow: string;
  documents_folder_path?: string;
  // 🆕 Workflow fields
  submitted_at?: string;
  submitted_by?: number;
  approved_by?: number;
  approved_at?: string;
  rejected_reason?: string;
  registration_deadline?: string;
  created_at: string;
}

export interface Participation {
  id: number;
  activity_id: number;
  student_id: number;
  attendance_status: 'registered' | 'attended' | 'absent';
  achievement_level?: 'excellent' | 'good' | 'participated';
  feedback?: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  class_id?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const PLANT_TYPES = {
  creativity: { name: '🎨 Cây Sáng Tạo', color: 'text-purple-500', emoji: '🎨' },
  leadership: { name: '👑 Cây Lãnh Đạo', color: 'text-yellow-500', emoji: '👑' },
  sports: { name: '⚽ Cây Thể Thao', color: 'text-green-500', emoji: '⚽' },
  community: { name: '🤝 Cây Cộng Đồng', color: 'text-blue-500', emoji: '🤝' },
  academic: { name: '📚 Cây Học Thuật', color: 'text-red-500', emoji: '📚' },
} as const;

// Thêm vào cuối file
export interface ClassWithTeacher extends Class {
  teacher_name?: string;
  student_count?: number;
}

export interface ActivityWithTeacher extends Activity {
  teacher_name?: string;
  participant_count?: number;
  available_slots?: number;
}

export interface CreateClassRequest {
  name: string;
  grade: string;
  description?: string;
  teacher_id?: number;
}

export interface CreateActivityRequest {
  title: string;
  description: string;
  date_time: string;
  location: string;
  max_participants: number;
  class_ids: number[];
}

// ----- New types for attendance/QR/scoring/awards -----
export interface QRSession {
  id: number;
  activity_id: number;
  creator_id: number;
  session_token: string;
  expires_at: string;
  created_at: string;
  is_active: number;
  metadata?: string | null;
}

export interface AttendanceRecord {
  id: number;
  qr_session_id?: number | null;
  activity_id: number;
  student_id: number;
  recorded_by?: number | null;
  status: 'present' | 'absent' | 'late' | 'excused';
  method: 'qr' | 'gps' | 'manual';
  device_id?: number | null;
  recorded_at: string;
  location?: string | null;
  note?: string | null;
}

export interface PointCalculation {
  id: number;
  name: string;
  expression: string;
  base_points: number;
  multiplier: number;
  is_active: number;
  created_at: string;
  updated_at?: string | null;
}

export interface StudentScore {
  id: number;
  student_id: number;
  activity_id?: number | null;
  points: number;
  source?: string | null;
  calculated_at: string;
}

export interface AwardType {
  id: number;
  name: string;
  description?: string | null;
  min_points: number;
  created_at: string;
}

export interface StudentAward {
  id: number;
  award_type_id: number;
  student_id: number;
  awarded_by?: number | null;
  awarded_at: string;
  reason?: string | null;
}

export interface AwardSuggestion {
  id: number;
  suggestion_by?: number | null;
  student_id: number;
  award_type_id: number;
  score_snapshot?: number | null;
  suggested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string | null;
}

export interface AuditLog {
  id: number;
  actor_id?: number | null;
  action: string;
  target_table?: string | null;
  target_id?: number | null;
  details?: string | null;
  created_at: string;
}

export interface Alert {
  id: number;
  level: 'info' | 'warning' | 'critical';
  message: string;
  related_table?: string | null;
  related_id?: number | null;
  is_read: number;
  created_at: string;
}

export interface ActivityApproval {
  id: number;
  activity_id: number;
  requested_by?: number | null;
  approver_id?: number | null;
  status: 'requested' | 'approved' | 'rejected';
  note?: string | null;
  requested_at: string;
  decided_at?: string | null;
}
