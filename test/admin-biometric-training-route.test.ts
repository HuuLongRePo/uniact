import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiRoleMock = vi.fn();
const dbGetMock = vi.fn();
const dbRunMock = vi.fn();
const ensureStudentBiometricSchemaMock = vi.fn();
const encryptEmbeddingMock = vi.fn();

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

vi.mock('@/lib/biometrics/encryption', () => ({
  encryptEmbedding: encryptEmbeddingMock,
}));

describe('POST /api/admin/biometrics/students/[id]/training', () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    dbGetMock.mockReset();
    dbRunMock.mockReset();
    ensureStudentBiometricSchemaMock.mockReset();
    encryptEmbeddingMock.mockReset();
  });

  it('marks training result and upgrades enrollment to ready when trained', async () => {
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    ensureStudentBiometricSchemaMock.mockResolvedValue(undefined);
    dbGetMock
      .mockResolvedValueOnce({ id: 12 })
      .mockResolvedValueOnce({ enrollment_status: 'captured', sample_image_count: 5 });
    dbRunMock.mockResolvedValue({ changes: 1 });
    encryptEmbeddingMock.mockResolvedValue({ encryptedData: 'cipher', iv: 'iv', salt: 'salt' });

    const route = await import('../src/app/api/admin/biometrics/students/[id]/training/route');
    const request = new Request('http://localhost/api/admin/biometrics/students/12/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training_status: 'trained', training_version: '1', face_embedding: [0.1, 0.2, 0.3] }),
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
      has_face_embedding: true,
    });
  });
});
