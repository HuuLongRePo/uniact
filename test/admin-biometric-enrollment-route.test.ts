import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiRoleMock = vi.fn();
const dbGetMock = vi.fn();
const dbRunMock = vi.fn();
const createAuditLogMock = vi.fn();
const ensureStudentBiometricSchemaMock = vi.fn();

vi.mock('@/lib/guards', () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock('@/lib/database', () => ({
  dbGet: dbGetMock,
  dbRun: dbRunMock,
  dbHelpers: {
    createAuditLog: createAuditLogMock,
  },
}));

vi.mock('@/infrastructure/db/student-biometric-schema', () => ({
  ensureStudentBiometricSchema: ensureStudentBiometricSchemaMock,
}));

describe('POST /api/admin/biometrics/students/[id]/enrollment', () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    dbGetMock.mockReset();
    dbRunMock.mockReset();
    createAuditLogMock.mockReset();
    ensureStudentBiometricSchemaMock.mockReset();
  });

  it('allows admin to increment captured sample images and mark training pending', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock
      .mockResolvedValueOnce({ id: 12 })
      .mockResolvedValueOnce({
        student_id: 12,
        enrollment_status: 'captured',
        training_status: 'pending',
        sample_image_count: 3,
        notes: 'du anh de cho training',
      });
    dbRunMock.mockResolvedValue({ changes: 1 });
    createAuditLogMock.mockResolvedValue(undefined);

    const route = await import('../src/app/api/admin/biometrics/students/[id]/enrollment/route');
    const request = new Request('http://localhost/api/admin/biometrics/students/12/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_image_count_delta: 3, notes: 'du anh de cho training' }),
    });

    const response = await route.POST(request, { params: Promise.resolve({ id: '12' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      student_id: 12,
      enrollment_status: 'captured',
      training_status: 'pending',
      sample_image_count: 3,
      notes: 'du anh de cho training',
    });
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'biometric_enrollment_update',
        actor_id: 1,
      })
    );
  });

  it('allows in-scope teacher to update enrollment for homeroom student', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 7, role: 'teacher' });
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock
      .mockResolvedValueOnce({
        student_id: 12,
        class_id: 5,
        class_name: 'D31A',
        in_scope: 1,
      })
      .mockResolvedValueOnce({
        student_id: 12,
        enrollment_status: 'captured',
        training_status: 'pending',
        sample_image_count: 2,
        notes: null,
      });
    dbRunMock.mockResolvedValue({ changes: 1 });
    createAuditLogMock.mockResolvedValue(undefined);

    const route = await import('../src/app/api/admin/biometrics/students/[id]/enrollment/route');
    const request = new Request('http://localhost/api/admin/biometrics/students/12/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_image_count_delta: 2 }),
    });

    const response = await route.POST(request, { params: Promise.resolve({ id: '12' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'biometric_enrollment_update',
        actor_id: 7,
      })
    );
  });

  it('blocks out-of-scope teacher and returns forbidden', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 7, role: 'teacher' });
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock.mockResolvedValueOnce({
      student_id: 12,
      class_id: 9,
      class_name: 'D31B',
      in_scope: 0,
    });
    createAuditLogMock.mockResolvedValue(undefined);

    const route = await import('../src/app/api/admin/biometrics/students/[id]/enrollment/route');
    const request = new Request('http://localhost/api/admin/biometrics/students/12/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_image_count_delta: 1 }),
    });

    const response = await route.POST(request, { params: Promise.resolve({ id: '12' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(String(body.error || body.message)).toContain('Giang vien chi duoc thao tac khuon mat');
    expect(dbRunMock).not.toHaveBeenCalled();
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'biometric_enrollment_denied_out_of_scope',
        actor_id: 7,
      })
    );
  });
});
