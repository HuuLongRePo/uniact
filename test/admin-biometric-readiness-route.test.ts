import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiRoleMock = vi.fn();
const dbGetMock = vi.fn();

vi.mock('@/lib/guards', () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock('@/lib/database', () => ({
  dbGet: dbGetMock,
}));

describe('GET /api/admin/biometrics/readiness', () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    dbGetMock.mockReset();
  });

  it('returns biometric readiness status for admin', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    dbGetMock.mockResolvedValue({ count: 1200 });

    const route = await import('../src/app/api/admin/biometrics/readiness/route');
    const response = await route.GET(new Request('http://localhost/api/admin/biometrics/readiness'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.readiness).toMatchObject({
      runtime_enabled: false,
      face_attendance_route_ready: true,
      training_route_ready: false,
      total_students: 1200,
      recommended_next_batch: 'student_image_enrollment_and_training_groundwork',
    });
  });
});
