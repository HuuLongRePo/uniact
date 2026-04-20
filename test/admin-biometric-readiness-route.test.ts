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
      runtime_mode: 'stubbed',
      model_loading_ready: false,
      model_loading_status: 'idle',
      embedding_detection_ready: false,
      liveness_check_ready: false,
      liveness_status: 'runtime_unavailable',
      attendance_api_accepting_runtime_verification: false,
      face_attendance_route_ready: true,
      training_route_ready: true,
      enrollment_flow_ready: true,
      embedding_storage_ready: true,
      total_students: 1200,
      recommended_next_batch: 'face_runtime_enablement',
    });
  });

  it('reports config-enabled stubbed mode when runtime flag is on', async () => {
    vi.resetModules();
    process.env.ENABLE_FACE_BIOMETRIC_RUNTIME = '1';
    requireApiRoleMock.mockResolvedValue({ id: 1, role: 'admin' });
    dbGetMock.mockResolvedValue({ count: 1200 });

    const route = await import('../src/app/api/admin/biometrics/readiness/route');
    const response = await route.GET(new Request('http://localhost/api/admin/biometrics/readiness'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.readiness).toMatchObject({
      runtime_enabled: true,
      runtime_mode: 'config_enabled_stubbed',
      model_loading_status: 'idle',
      liveness_status: 'runtime_unavailable',
      attendance_api_accepting_runtime_verification: false,
      recommended_next_batch: 'face_runtime_enablement',
    });

    delete process.env.ENABLE_FACE_BIOMETRIC_RUNTIME;
  });
});
