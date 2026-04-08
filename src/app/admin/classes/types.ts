export interface Class {
  id: number;
  name: string;
  grade: string;
  teacher_id?: number;
  teacher_name?: string;
  student_count?: number;
  description?: string;
  created_at: string;
}

export interface Teacher {
  id: number;
  name: string;
  email: string;
}
