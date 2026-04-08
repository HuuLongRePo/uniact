/**
 * API Guard & Authentication Module
 * Provides role-based access control (RBAC) and authentication middleware
 * for protecting API endpoints.
 *
 * Usage:
 * - `requireApiAuth()` - Verify user is authenticated
 * - `requireApiRole()` - Verify user has specific role(s)
 * - `requireActivityApproved()` - Verify activity is approved for operations
 *
 * @example
 * // In route.ts
 * export async function POST(req: NextRequest) {
 *   const user = await requireApiRole(req, ['admin', 'teacher']);
 *   // User is guaranteed to be admin or teacher
 * }
 */

import { NextRequest } from 'next/server';
import { getUserFromToken } from './auth';
import { User } from '@/types/database';
import { ApiError } from './api-response';
import { getTokenFromRequest } from './session-cookie';

/**
 * Extract and validate user from request token
 * @param req - NextRequest with auth token in Cookie or Authorization header
 * @returns User object if token valid, null if missing or invalid
 * @example
 * const user = await getUserFromRequest(req);
 * if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
 */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const token = getTokenFromRequest(req) || '';
  if (!token) return null;
  const user = await getUserFromToken(token);
  return user;
}

/**
 * Guard: Require authenticated user (page-level)
 * Throws generic Error for SSR/middleware contexts
 * @param req - NextRequest with auth token
 * @returns Authenticated User object
 * @throws Error with message "Chưa đăng nhập" if user not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<User> {
  const user = await getUserFromRequest(req);
  if (!user) throw new Error('Chưa đăng nhập');
  return user;
}

/**
 * Guard: Require authenticated user (API-level)
 * Throws ApiError with HTTP 401 Unauthorized
 * Use in API routes that need authentication
 * @param req - NextRequest with auth token
 * @returns Authenticated User object
 * @throws ApiError.unauthorized() if user not authenticated
 * @example
 * export async function GET(req: NextRequest) {
 *   const user = await requireApiAuth(req);
 *   // User is authenticated, safe to proceed
 * }
 */
export async function requireApiAuth(req: NextRequest): Promise<User> {
  const user = await getUserFromRequest(req);
  if (!user) {
    throw ApiError.unauthorized('Chưa đăng nhập');
  }

  return user;
}

/**
 * Guard: Require authenticated user with specific role(s) (page-level)
 * Throws generic Error for SSR/middleware contexts
 * @param req - NextRequest with auth token
 * @param roles - Array of allowed roles (e.g., ['admin', 'teacher'])
 * @returns Authenticated User if role matches
 * @throws Error with message "Không có quyền truy cập" if role not in allowed list
 * @example
 * const admin = await requireRole(req, ['admin']);
 */
export async function requireRole(req: NextRequest, roles: Array<User['role']>): Promise<User> {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) throw new Error('Không có quyền truy cập');
  return user;
}

/**
 * Guard: Require authenticated user with specific role(s) (API-level)
 * Throws ApiError with HTTP 403 Forbidden if role check fails
 * Use in API routes that require role-based access control
 * @param req - NextRequest with auth token
 * @param roles - Array of allowed roles ('admin', 'teacher', 'student', 'superadmin')
 * @returns Authenticated User if role matches allowed list
 * @throws ApiError.unauthorized() if user not authenticated
 * @throws ApiError.forbidden() if user role not in allowed list
 * @example
 * export async function DELETE(req: NextRequest) {
 *   const user = await requireApiRole(req, ['admin']);
 *   // User is guaranteed to be admin
 * }
 */
export async function requireApiRole(
  req: NextRequest,
  roles: Array<User['role']>
): Promise<User> {
  const user = await requireApiAuth(req);

  if (!roles.includes(user.role)) {
    throw ApiError.forbidden('Không có quyền truy cập');
  }

  return user;
}

/**
 * Guard: Require activity is approved
 * Validates that activity exists and has approval_status === 'approved'
 * Use before allowing any student participation or activity execution
 *
 * @param activityId - ID of activity to validate
 * @throws Error "Không tìm thấy hoạt động" if activity not found
 * @throws Error with approval_status info if activity not approved
 *
 * @example
 * export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
 *   const activityId = parseInt(params.id);
 *   await requireActivityApproved(activityId);
 *   // Activity is approved, safe to process registration
 * }
 */
export async function requireActivityApproved(activityId: number): Promise<void> {
  const { dbGet } = await import('./database');
  const activity = (await dbGet('SELECT id, approval_status FROM activities WHERE id = ?', [
    activityId,
  ])) as { id: number; approval_status: string } | undefined;

  if (!activity) {
    throw new Error('Không tìm thấy hoạt động');
  }

  if (activity.approval_status !== 'approved') {
    throw new Error(
      `Hoạt động cần được duyệt trước khi thực hiện thao tác (hiện tại: ${activity.approval_status})`
    );
  }
}

// note: prefer named exports; no default export to satisfy lint rules
