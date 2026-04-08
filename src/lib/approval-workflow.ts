/**
 * Approval Workflow System - Chain of Responsibility + State Pattern
 *
 * Flexible approval system for awards, activities, and other entities
 * Each approval can go through multiple steps with different approvers
 */

import { dbRun, dbGet, dbAll } from './database';

// ============ STATE PATTERN ============

/**
 * Approval states
 */
export enum ApprovalState {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

/**
 * Interface for approval state behavior
 */
export interface IApprovalState {
  canTransitionTo(newState: ApprovalState): ApprovalState[];
  onEnter(request: ApprovalRequest): Promise<void>;
  onExit(request: ApprovalRequest): Promise<void>;
}

/**
 * Base approval state class
 */
abstract class BaseApprovalState implements IApprovalState {
  abstract canTransitionTo(newState: ApprovalState): ApprovalState[];

  async onEnter(request: ApprovalRequest): Promise<void> {
    // Default: log state change
    console.warn(`Approval ${request.id} entered state: ${this.constructor.name}`);
  }

  async onExit(request: ApprovalRequest): Promise<void> {
    // Default: no action
  }
}

/**
 * Pending state - waiting for first reviewer
 */
class PendingState extends BaseApprovalState {
  canTransitionTo(newState: ApprovalState): ApprovalState[] {
    return [ApprovalState.IN_REVIEW, ApprovalState.CANCELLED];
  }

  async onEnter(request: ApprovalRequest): Promise<void> {
    await super.onEnter(request);
    // Notify first approver
    await dbRun(
      `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
       VALUES (?, 'approval_request', 'Yêu cầu phê duyệt mới', ?, ?, ?)`,
      [
        request.current_approver_id,
        `Bạn có yêu cầu phê duyệt mới: ${request.entity_type}`,
        'approval_requests',
        request.id,
      ]
    );
  }
}

/**
 * In Review state - being reviewed by approver
 */
class InReviewState extends BaseApprovalState {
  canTransitionTo(newState: ApprovalState): ApprovalState[] {
    return [ApprovalState.APPROVED, ApprovalState.REJECTED, ApprovalState.CANCELLED];
  }
}

/**
 * Approved state - final approval
 */
class ApprovedState extends BaseApprovalState {
  canTransitionTo(newState: ApprovalState): ApprovalState[] {
    return []; // Final state - no transitions allowed
  }

  async onEnter(request: ApprovalRequest): Promise<void> {
    await super.onEnter(request);

    // Execute approval action
    await request.executeApproval();

    // Notify requester
    await dbRun(
      `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
       VALUES (?, 'approval_approved', 'Phê duyệt thành công', 'Yêu cầu của bạn đã được phê duyệt', ?, ?)`,
      [request.requester_id, 'approval_requests', request.id]
    );
  }
}

/**
 * Rejected state - approval denied
 */
class RejectedState extends BaseApprovalState {
  canTransitionTo(newState: ApprovalState): ApprovalState[] {
    return [ApprovalState.PENDING]; // Can resubmit
  }

  async onEnter(request: ApprovalRequest): Promise<void> {
    await super.onEnter(request);

    // Notify requester
    await dbRun(
      `INSERT INTO notifications (user_id, type, title, message, related_table, related_id)
       VALUES (?, 'approval_rejected', 'Phê duyệt bị từ chối', ?, ?, ?)`,
      [
        request.requester_id,
        `Yêu cầu của bạn đã bị từ chối: ${request.rejection_reason}`,
        'approval_requests',
        request.id,
      ]
    );
  }
}

/**
 * State factory
 */
class ApprovalStateFactory {
  private static states = new Map<ApprovalState, IApprovalState>([
    [ApprovalState.PENDING, new PendingState()],
    [ApprovalState.IN_REVIEW, new InReviewState()],
    [ApprovalState.APPROVED, new ApprovedState()],
    [ApprovalState.REJECTED, new RejectedState()],
  ]);

  static getState(state: ApprovalState): IApprovalState {
    const stateObj = this.states.get(state);
    if (!stateObj) {
      throw new Error(`Unknown approval state: ${state}`);
    }
    return stateObj;
  }
}

// ============ CHAIN OF RESPONSIBILITY PATTERN ============

/**
 * Approval request data
 */
export interface ApprovalRequest {
  id: number;
  entity_type: string;
  entity_id: number;
  requester_id: number;
  current_approver_id?: number;
  state: ApprovalState;
  rejection_reason?: string;
  executeApproval: () => Promise<void>;
}

/**
 * Abstract approval handler
 */
export abstract class ApprovalHandler {
  protected nextHandler: ApprovalHandler | null = null;

  setNext(handler: ApprovalHandler): ApprovalHandler {
    this.nextHandler = handler;
    return handler;
  }

  async handle(request: ApprovalRequest): Promise<boolean> {
    const canHandle = await this.canHandle(request);

    if (canHandle) {
      const result = await this.process(request);

      if (result && this.nextHandler) {
        // Pass to next handler in chain
        return await this.nextHandler.handle(request);
      }

      return result;
    }

    // Skip to next handler
    if (this.nextHandler) {
      return await this.nextHandler.handle(request);
    }

    return false;
  }

  protected abstract canHandle(request: ApprovalRequest): Promise<boolean>;
  protected abstract process(request: ApprovalRequest): Promise<boolean>;
}

/**
 * Role-based approval handler
 * Checks if current user has required role
 */
export class RoleApprovalHandler extends ApprovalHandler {
  constructor(private requiredRole: string) {
    super();
  }

  protected async canHandle(request: ApprovalRequest): Promise<boolean> {
    const approver = await dbGet('SELECT role FROM users WHERE id = ?', [
      request.current_approver_id,
    ]);
    return approver && approver.role === this.requiredRole;
  }

  protected async process(request: ApprovalRequest): Promise<boolean> {
    console.warn(`Role check passed: ${this.requiredRole}`);
    return true;
  }
}

/**
 * Duplicate approval handler
 * Prevents same user from approving twice
 */
export class DuplicateApprovalHandler extends ApprovalHandler {
  protected async canHandle(request: ApprovalRequest): Promise<boolean> {
    return true; // Always check
  }

  protected async process(request: ApprovalRequest): Promise<boolean> {
    const existing = await dbGet(
      `SELECT id FROM approval_actions 
       WHERE approval_request_id = ? AND approver_id = ?`,
      [request.id, request.current_approver_id]
    );

    if (existing) {
      throw new Error('User has already approved this request');
    }

    return true;
  }
}

/**
 * Business rule handler
 * Validates business-specific rules
 */
export class BusinessRuleHandler extends ApprovalHandler {
  constructor(private validator: (request: ApprovalRequest) => Promise<boolean>) {
    super();
  }

  protected async canHandle(request: ApprovalRequest): Promise<boolean> {
    return true;
  }

  protected async process(request: ApprovalRequest): Promise<boolean> {
    const isValid = await this.validator(request);
    if (!isValid) {
      throw new Error('Business rule validation failed');
    }
    return true;
  }
}

// ============ APPROVAL SERVICE ============

/**
 * Main approval workflow service
 */
export class ApprovalService {
  /**
   * Create approval request
   */
  async createRequest(
    entityType: string,
    entityId: number,
    requesterId: number,
    approverIds: number[]
  ): Promise<number> {
    // Create approval request
    const result = await dbRun(
      `INSERT INTO approval_requests (entity_type, entity_id, requester_id, state, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [entityType, entityId, requesterId, ApprovalState.PENDING]
    );

    const requestId = result.lastID!;

    // Create approval steps
    for (let i = 0; i < approverIds.length; i++) {
      await dbRun(
        `INSERT INTO approval_steps (approval_request_id, step_order, approver_id, status)
         VALUES (?, ?, ?, ?)`,
        [requestId, i + 1, approverIds[i], 'pending']
      );
    }

    // Transition to pending state
    const request: ApprovalRequest = {
      id: requestId,
      entity_type: entityType,
      entity_id: entityId,
      requester_id: requesterId,
      current_approver_id: approverIds[0],
      state: ApprovalState.PENDING,
      executeApproval: async () => {},
    };

    await this.transitionState(request, ApprovalState.PENDING);

    return requestId;
  }

  /**
   * Approve request
   */
  async approve(requestId: number, approverId: number, note?: string): Promise<void> {
    const request = await this.getRequest(requestId);

    // Build approval chain
    const chain = this.buildApprovalChain();

    // Process through chain
    await chain.handle({ ...request, current_approver_id: approverId });

    // Record approval action
    await dbRun(
      `INSERT INTO approval_actions (approval_request_id, approver_id, action, note, created_at)
       VALUES (?, ?, 'approved', ?, datetime('now'))`,
      [requestId, approverId, note]
    );

    // Update step status
    await dbRun(
      `UPDATE approval_steps 
       SET status = 'approved', approved_at = datetime('now')
       WHERE approval_request_id = ? AND approver_id = ?`,
      [requestId, approverId]
    );

    // Check if all steps completed
    const pendingSteps = await dbGet(
      `SELECT COUNT(*) as count FROM approval_steps 
       WHERE approval_request_id = ? AND status = 'pending'`,
      [requestId]
    );

    if (pendingSteps.count === 0) {
      // All approved - transition to approved state
      await this.transitionState(request, ApprovalState.APPROVED);
    } else {
      // Move to next step
      await this.transitionState(request, ApprovalState.IN_REVIEW);
    }
  }

  /**
   * Reject request
   */
  async reject(requestId: number, approverId: number, reason: string): Promise<void> {
    const request = await this.getRequest(requestId);

    // Record rejection
    await dbRun(
      `INSERT INTO approval_actions (approval_request_id, approver_id, action, note, created_at)
       VALUES (?, ?, 'rejected', ?, datetime('now'))`,
      [requestId, approverId, reason]
    );

    // Update request
    await dbRun(
      `UPDATE approval_requests 
       SET state = ?, rejection_reason = ?
       WHERE id = ?`,
      [ApprovalState.REJECTED, reason, requestId]
    );

    await this.transitionState({ ...request, rejection_reason: reason }, ApprovalState.REJECTED);
  }

  /**
   * Build approval handler chain
   */
  private buildApprovalChain(): ApprovalHandler {
    const roleCheck = new RoleApprovalHandler('admin');
    const duplicateCheck = new DuplicateApprovalHandler();

    roleCheck.setNext(duplicateCheck);

    return roleCheck;
  }

  /**
   * Transition approval state
   */
  private async transitionState(request: ApprovalRequest, newState: ApprovalState): Promise<void> {
    const currentState = ApprovalStateFactory.getState(request.state);
    const targetState = ApprovalStateFactory.getState(newState);

    if (!currentState.canTransitionTo(newState)) {
      throw new Error(`Cannot transition from ${request.state} to ${newState}`);
    }

    await currentState.onExit(request);
    await targetState.onEnter(request);

    await dbRun('UPDATE approval_requests SET state = ? WHERE id = ?', [newState, request.id]);
  }

  /**
   * Get approval request
   */
  private async getRequest(requestId: number): Promise<ApprovalRequest> {
    const request = await dbGet('SELECT * FROM approval_requests WHERE id = ?', [requestId]);

    if (!request) {
      throw new Error('Approval request not found');
    }

    return {
      id: request.id,
      entity_type: request.entity_type,
      entity_id: request.entity_id,
      requester_id: request.requester_id,
      state: request.state,
      rejection_reason: request.rejection_reason,
      executeApproval: async () => {
        console.warn(`Executing approval for ${request.entity_type} ID: ${request.entity_id}`);
        switch (request.entity_type) {
          case 'activity':
            await dbRun(`UPDATE activities SET status = 'approved' WHERE id = ?`, [
              request.entity_id,
            ]);
            break;
          case 'student_award':
            await dbRun(`UPDATE student_awards SET status = 'approved' WHERE id = ?`, [
              request.entity_id,
            ]);
            break;
          // Add other entity types here
          default:
            console.warn(`No approval action defined for entity type: ${request.entity_type}`);
        }
      },
    };
  }
}

// Singleton
export const approvalService = new ApprovalService();

// ============ USAGE EXAMPLE ============

/*
// Create approval request for award
const requestId = await approvalService.createRequest(
  'student_award',
  123, // award_id
  456, // requester_id
  [789, 101] // approver_ids (admin, department head)
)

// Approve by first approver
await approvalService.approve(requestId, 789, 'Looks good')

// Approve by second approver (completes workflow)
await approvalService.approve(requestId, 101, 'Approved')
*/
