export interface AuditLog {
  id: number;
  actor_id: number | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  target_table?: string | null;
  target_id?: number | null;
  details?: string | null;
  created_at: string;
}
