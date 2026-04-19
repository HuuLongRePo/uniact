import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiRoleMock = vi.fn();
const dbGetMock = vi.fn();
const dbRunMock = vi.fn();
const ensureStudentBiometricSchemaMock = vi.fn();

vi.mock('@/lib/guards', () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock('@/lib/database', () => ({
  dbGet: dbGetMock,
  dbRun: dbRunMock,
}));

vi.mock('@/infrastructure/db/student-biometric-schema', () => ({
  ensureStudentBiometricSchema: ensureStudentBiometricSchemaMock,
}));

describe('PUT /api/admin/biometrics/students/[id]', () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    dbGetMock.mockReset();
    dbRunMock.mockReset();
    ensureStudentBiometricSchemaMock.mockReset();
  });

  it('updates per-student biometric readiness state', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock.mockResolvedValue({ id: 12 });
    dbRunMock.mockResolvedValue({ changes: 1 });

    const route = await import('../src/app/api/admin/biometrics/students/[id]/route');
    const request = new Request('http://localhost/api/admin/biometrics/students/12', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enrollment_status: 'captured',
        training_status: 'pending',
        sample_image_count: 5,
        notes: 'Đã đủ ảnh mẫu để chạy training',
        training_version: '1',
      }),
    });

    const response = await route.PUT(request, { params: Promise.resolve({ id: '12' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      student_id: 12,
      enrollment_status: 'captured',
      training_status: 'pending',
      sample_image_count: 5,
      training_version: '1',
      face_attendance_ready: false,
    });
    expect(dbRunMock).toHaveBeenCalled();
  });
});
