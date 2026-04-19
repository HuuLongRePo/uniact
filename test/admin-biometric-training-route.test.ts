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

describe('POST /api/admin/biometrics/students/[id]/training', () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    dbGetMock.mockReset();
    dbRunMock.mockReset();
    ensureStudentBiometricSchemaMock.mockReset();
  });

  it('marks training result and upgrades enrollment to ready when trained', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock
      .mockResolvedValueOnce({ id: 12 })
      .mockResolvedValueOnce({ enrollment_status: 'captured', sample_image_count: 5 });
    dbRunMock.mockResolvedValue({ changes: 1 });

    const route = await import('../src/app/api/admin/biometrics/students/[id]/training/route');
    const request = new Request('http://localhost/api/admin/biometrics/students/12/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training_status: 'trained', training_version: '1' }),
    });

    const response = await route.POST(request, { params: Promise.resolve({ id: '12' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      student_id: 12,
      enrollment_status: 'ready',
      training_status: 'trained',
      sample_image_count: 5,
      training_version: '1',
    });
  });
});
