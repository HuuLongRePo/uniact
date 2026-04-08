export interface Activity {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  teacher_name: string;
  activity_type: string;
  organization_level: string;
  date_time: string;
  end_time: string;
  location: string;
  max_participants: number;
  participant_count: number;
  status: string;
  approval_status: string;
  points: number;
  created_at: string;
}
