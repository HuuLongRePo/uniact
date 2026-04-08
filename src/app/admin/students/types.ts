export interface User {
  id: number;
  email: string;
  username?: string;
  name: string;
  role: string;
  class_id?: number;
  class_name?: string;
  student_code?: string;
  is_active?: number | boolean;
  activity_count: number;
  total_points: number;
  created_at: string;
}
