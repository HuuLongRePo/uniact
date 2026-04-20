import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('face runtime adapter seam', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ENABLE_FACE_BIOMETRIC_RUNTIME;
    delete process.env.FACE_BIOMETRIC_RUNTIME_MODE;
  });

  it('defaults to stubbed adapter when runtime env is disabled', async () => {
    const runtime = await import('../src/lib/biometrics/face-runtime');

    expect(runtime.FACE_BIOMETRIC_RUNTIME_ENABLED).toBe(false);
    expect(runtime.FACE_BIOMETRIC_RUNTIME_MODE).toBe('stubbed');
    expect(runtime.getFaceRuntimeAdapter().mode).toBe('stubbed');

    await expect(runtime.loadFaceModels()).resolves.toBeNull();
    await expect(runtime.detectSingleEmbedding()).resolves.toBeNull();

    const liveness = await runtime.performLivenessCheck();
    expect(liveness.passed).toBe(false);
    expect(liveness.details).toContain('Face biometric runtime unavailable');
  });

  it('switches to config-enabled stubbed adapter when env flag is on', async () => {
    process.env.ENABLE_FACE_BIOMETRIC_RUNTIME = 'true';

    const runtime = await import('../src/lib/biometrics/face-runtime');

    expect(runtime.FACE_BIOMETRIC_RUNTIME_ENABLED).toBe(true);
    expect(runtime.FACE_BIOMETRIC_RUNTIME_MODE).toBe('config_enabled_stubbed');
    expect(runtime.getFaceRuntimeAdapter().mode).toBe('config_enabled_stubbed');
  });

  it('keeps runtime_ready reserved behind explicit mode override', async () => {
    process.env.ENABLE_FACE_BIOMETRIC_RUNTIME = 'true';
    process.env.FACE_BIOMETRIC_RUNTIME_MODE = 'runtime_ready';

    const runtime = await import('../src/lib/biometrics/face-runtime');

    expect(runtime.FACE_BIOMETRIC_RUNTIME_MODE).toBe('runtime_ready');
    expect(runtime.getFaceRuntimeAdapter().mode).toBe('runtime_ready');
    runtime.resetFaceModelLoadStateForTests();
    expect(runtime.getFaceModelLoadState()).toMatchObject({ status: 'idle', mode: 'runtime_ready' });
    await expect(runtime.loadFaceModels()).resolves.toBeNull();
    expect(runtime.getFaceModelLoadState()).toMatchObject({ status: 'ready', mode: 'runtime_ready' });
  });

  it('tracks model load state without overclaiming stubbed modes as ready', async () => {
    process.env.ENABLE_FACE_BIOMETRIC_RUNTIME = 'true';

    const runtime = await import('../src/lib/biometrics/face-runtime');

    runtime.resetFaceModelLoadStateForTests();
    expect(runtime.getFaceModelLoadState()).toMatchObject({
      status: 'idle',
      mode: 'config_enabled_stubbed',
      lastError: null,
    });

    await runtime.loadFaceModels();

    expect(runtime.getFaceModelLoadState()).toMatchObject({
      status: 'idle',
      mode: 'config_enabled_stubbed',
      lastError: null,
    });
  });
});
