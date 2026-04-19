import { describe, expect, it, vi } from 'vitest';

describe('biometric runtime capability', () => {
  it('reports stubbed mode by default', async () => {
    vi.resetModules();
    delete process.env.ENABLE_FACE_BIOMETRIC_RUNTIME;

    const { getFaceRuntimeCapability } = await import('../src/lib/biometrics/runtime-capability');
    expect(getFaceRuntimeCapability()).toMatchObject({
      runtime_enabled: false,
      mode: 'stubbed',
      attendance_api_accepting_runtime_verification: false,
    });
  });

  it('reports config_enabled_stubbed when env flag is on but runtime is not fully wired', async () => {
    vi.resetModules();
    process.env.ENABLE_FACE_BIOMETRIC_RUNTIME = '1';

    const { getFaceRuntimeCapability } = await import('../src/lib/biometrics/runtime-capability');
    expect(getFaceRuntimeCapability()).toMatchObject({
      runtime_enabled: true,
      mode: 'config_enabled_stubbed',
      attendance_api_accepting_runtime_verification: false,
    });

    delete process.env.ENABLE_FACE_BIOMETRIC_RUNTIME;
  });
});
