// Workflow engine dùng chung cho các thực thể (hoạt động, duyệt, khen thưởng...)
// Chạy offline, không phụ thuộc dịch vụ ngoài.

export type WorkflowRole = 'admin' | 'teacher' | 'student';

export interface WorkflowContext {
  entity: any;
  actorRole: WorkflowRole;
  actorId: number;
}

export interface TransitionRule<State extends string> {
  from: State;
  to: State;
  roles: WorkflowRole[];
  validate?: (ctx: WorkflowContext) => { valid: boolean; error?: string };
}

export interface TransitionResult<State extends string> {
  ok: boolean;
  from: State;
  to: State;
  error?: string;
}

export class WorkflowEngine<State extends string> {
  constructor(private rules: TransitionRule<State>[]) {}

  getAllowedTargets(current: State, role: WorkflowRole, ctx: WorkflowContext): State[] {
    return this.rules
      .filter(
        (r) =>
          r.from === current && r.roles.includes(role) && (!r.validate || r.validate(ctx).valid)
      )
      .map((r) => r.to);
  }

  canTransition(
    current: State,
    target: State,
    role: WorkflowRole,
    ctx: WorkflowContext
  ): TransitionResult<State> {
    if (current === target) return { ok: true, from: current, to: target };
    const rule = this.rules.find((r) => r.from === current && r.to === target);
    if (!rule)
      return {
        ok: false,
        from: current,
        to: target,
        error: `Không có quy tắc chuyển trạng thái từ ${current} -> ${target}`,
      };
    if (!rule.roles.includes(role))
      return { ok: false, from: current, to: target, error: `Vai trò ${role} không được phép` };
    if (rule.validate) {
      const v = rule.validate(ctx);
      if (!v.valid)
        return { ok: false, from: current, to: target, error: v.error || 'Dữ liệu không hợp lệ' };
    }
    return { ok: true, from: current, to: target };
  }
}

// Activity workflow states reused from activity-workflow.ts
export type ActivityWorkflowState =
  | 'draft'
  | 'pending'
  | 'published'
  | 'registration'
  | 'in_progress'
  | 'evaluating'
  | 'completed'
  | 'cancelled';

export function createActivityWorkflowEngine() {
  const rules: TransitionRule<ActivityWorkflowState>[] = [
    { from: 'draft', to: 'pending', roles: ['teacher'] },
    { from: 'pending', to: 'published', roles: ['admin'] },
    { from: 'pending', to: 'draft', roles: ['admin'] },
    { from: 'published', to: 'registration', roles: ['teacher', 'admin'] },
    {
      from: 'registration',
      to: 'in_progress',
      roles: ['teacher'],
      validate: ({ entity }) => {
        if (!entity.date_time) return { valid: false, error: 'Thiếu ngày giờ hoạt động' };
        const now = new Date();
        const dt = new Date(entity.date_time);
        if (dt.toDateString() !== now.toDateString())
          return { valid: false, error: 'Chỉ bắt đầu đúng ngày diễn ra' };
        return { valid: true };
      },
    },
    { from: 'in_progress', to: 'evaluating', roles: ['teacher'] },
    { from: 'evaluating', to: 'completed', roles: ['teacher', 'admin'] },
    // Cancellation
    { from: 'draft', to: 'cancelled', roles: ['teacher', 'admin'] },
    { from: 'pending', to: 'cancelled', roles: ['admin'] },
    { from: 'published', to: 'cancelled', roles: ['teacher', 'admin'] },
    { from: 'registration', to: 'cancelled', roles: ['teacher', 'admin'] },
    { from: 'in_progress', to: 'cancelled', roles: ['admin'] },
    { from: 'in_progress', to: 'registration', roles: ['admin'] },
  ];
  return new WorkflowEngine<ActivityWorkflowState>(rules);
}

export const activityWorkflowEngine = createActivityWorkflowEngine();
