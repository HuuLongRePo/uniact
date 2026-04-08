export interface Student {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  activity_count: number;
  attended_count: number;
  total_points: number;
  award_count: number;
}

export interface StudentSummary {
  total: number;
  activity_count: number;
  attended_count: number;
  total_points: number;
  avg_points: number;
  award_count: number;
}

export interface Class {
  id: number;
  name: string;
  grade?: string;
  teacher_id?: number | null;
  teacher_name?: string | null;
  description?: string | null;
  created_at?: string;
  student_count?: number;
  teachers?: Array<{ id: number; name: string; email: string }>;
}
