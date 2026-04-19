import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiRoleMock = vi.fn();
const dbAllMock = vi.fn();

vi.mock('@/lib/guards', () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock('@/lib/database', () => ({
  dbAll: dbAllMock,
}));

describe('GET /api/admin/biometrics/students', () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    dbAllMock.mockReset();
  });

  it('returns per-student biometric readiness rows', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    dbAllMock.mockResolvedValue([
      { id: 12, name: 'Nguyễn Văn A', email: 'a@student.edu.vn', student_code: 'SV001', class_name: 'CNTT K18A' },
    ]);

    const route = await import('../src/app/api/admin/biometrics/students/route');
    const response = await route.GET(new Request('http://localhost/api/admin/biometrics/students'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.summary).toMatchObject({ total: 1, ready_count: 0, missing_count: 1 });
    expect(body.data.students[0]).toMatchObject({
      id: 12,
      biometric_readiness: {
        enrollment_status: 'missing',
        training_status: 'not_started',
        face_attendance_ready: false,
      },
    });
  });
});
