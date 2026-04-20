import { describe, expect, it, vi } from 'vitest';

describe('biometric runtime capability', () => {
  it('reports stubbed mode by default', async () => {
    vi.resetModules();
    delete process.env.ENABLE_FACE_BIOMETRIC_RUNTIME;

    const { getFaceRuntimeCapability } = await import('../src/lib/biometrics/runtime-capability');
    expect(getFaceRuntimeCapability()).toMatchObject({
      runtime_enabled: false,
      mode: 'stubbed',
      model_loading_status: 'idle',
      liveness_status: 'runtime_unavailable',
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
      model_loading_status: 'idle',
      liveness_status: 'runtime_unavailable',
      attendance_api_accepting_runtime_verification: false,
    });

    delete process.env.ENABLE_FACE_BIOMETRIC_RUNTIME;
  });

  it('reports runtime_ready mode as not yet verification-ready until model loading is complete', async () => {
    vi.resetModules();
    process.env.ENABLE_FACE_BIOMETRIC_RUNTIME = '1';
    process.env.FACE_BIOMETRIC_RUNTIME_MODE = 'runtime_ready';

    const runtime = await import('../src/lib/biometrics/face-runtime');
    runtime.resetFaceModelLoadStateForTests();
    const { getFaceRuntimeCapability } = await import('../src/lib/biometrics/runtime-capability');

    expect(getFaceRuntimeCapability()).toMatchObject({
      runtime_enabled: true,
      mode: 'runtime_ready',
      model_loading_ready: false,
      model_loading_status: 'idle',
      liveness_status: 'runtime_unavailable',
      attendance_api_accepting_runtime_verification: false,
    });

    await runtime.loadFaceModels();

    expect(getFaceRuntimeCapability()).toMatchObject({
      runtime_enabled: true,
      mode: 'runtime_ready',
      model_loading_ready: true,
      model_loading_status: 'ready',
      embedding_detection_ready: false,
      liveness_check_ready: false,
      liveness_status: 'insufficient_signal',
      attendance_api_accepting_runtime_verification: false,
    });
  });
});
