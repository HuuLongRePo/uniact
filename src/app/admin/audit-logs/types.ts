export interface AuditLog {
  id: number;
  actor_id: number;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_table: string;
  target_id: number;
  details: string;
  created_at: string;
}
