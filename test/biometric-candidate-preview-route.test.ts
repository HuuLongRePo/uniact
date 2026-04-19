import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireApiAuthMock = vi.fn();

vi.mock('@/lib/guards', () => ({
  requireApiAuth: requireApiAuthMock,
}));

describe('POST /api/biometric/candidate-preview', () => {
  beforeEach(() => {
    requireApiAuthMock.mockReset();
    requireApiAuthMock.mockResolvedValue({ id: 12, role: 'teacher' });
  });

  it('returns normalized candidate embedding payload for attendance runtime', async () => {
    const route = await import('../src/app/api/biometric/candidate-preview/route');
    const response = await route.POST(
      new Request('http://localhost/api/biometric/candidate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding: [0.1, 0.2, 0.3],
          qualityScore: 75,
          livenessScore: 0.91,
          deviceId: 'cam-a1',
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      candidate_embedding: [0.1, 0.2, 0.3],
      quality_score: 75,
      liveness_score: 0.91,
      device_id: 'cam-a1',
      verification_method: 'candidate_embedding',
      upstream_verified: false,
    });
  });

  it('rejects low quality candidate payloads', async () => {
    const route = await import('../src/app/api/biometric/candidate-preview/route');
    const response = await route.POST(
      new Request('http://localhost/api/biometric/candidate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding: [0.1, 0.2, 0.3],
          qualityScore: 40,
          livenessScore: 0.91,
        }),
      }) as any
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.message).toMatch(/Chất lượng ảnh chưa đủ/i);
  });
});
