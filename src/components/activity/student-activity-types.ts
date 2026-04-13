export interface StudentActivitySummary {
  id: number;
  title: string;
  description: string;
  date_time: string;
  location: string;
  teacher_name: string;
  participant_count: number;
  max_participants: number | null;
  status: string;
  is_registered: boolean;
  registration_status?: string | null;
  participation_source?: string | null;
  is_mandatory?: boolean;
  can_cancel?: boolean;
  applies_to_student?: boolean;
  applicability_scope?: string | null;
  applicability_reason?: string | null;
  activity_type: string | null;
  organization_level: string | null;
}
