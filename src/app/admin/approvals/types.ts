export interface Activity {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  max_participants: number;
  teacher_id: number;
  teacher_name?: string;
  creator_name?: string; // pending endpoint uses this
  status: string;
  approval_status?: string;
  created_at: string;
  participant_count?: number;
}

export interface ApprovalSubmission {
  content: string;
}
