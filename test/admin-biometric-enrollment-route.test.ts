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

describe('POST /api/admin/biometrics/students/[id]/enrollment', () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    dbGetMock.mockReset();
    dbRunMock.mockReset();
    ensureStudentBiometricSchemaMock.mockReset();
  });

  it('increments captured sample images and marks training pending', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock
      .mockResolvedValueOnce({ id: 12 })
      .mockResolvedValueOnce({
        student_id: 12,
        enrollment_status: 'captured',
        training_status: 'pending',
        sample_image_count: 3,
        notes: 'Đủ ảnh để chờ training',
      });
    dbRunMock.mockResolvedValue({ changes: 1 });

    const route = await import('../src/app/api/admin/biometrics/students/[id]/enrollment/route');
    const request = new Request('http://localhost/api/admin/biometrics/students/12/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_image_count_delta: 3, notes: 'Đủ ảnh để chờ training' }),
    });

    const response = await route.POST(request, { params: Promise.resolve({ id: '12' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      student_id: 12,
      enrollment_status: 'captured',
      training_status: 'pending',
      sample_image_count: 3,
      notes: 'Đủ ảnh để chờ training',
    });
  });
});
