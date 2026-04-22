import { beforeEach, describe, expect, it, vi } from 'vitest';

function setSecureContext(value: boolean) {
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value,
  });
}

function setMediaDevices(value: MediaDevices | undefined) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value,
  });
}

function setUserAgent(value: string) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value,
  });
}

describe('camera-stream helper', () => {
  beforeEach(() => {
    vi.resetModules();
    setSecureContext(true);
    setMediaDevices({
      getUserMedia: vi.fn(),
    } as unknown as MediaDevices);
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  });

  it('returns clear permission message for NotAllowedError', async () => {
    const { getCameraAccessErrorMessage } = await import('../src/lib/camera-stream');
    expect(getCameraAccessErrorMessage({ name: 'NotAllowedError' })).toContain('quyền camera');
  });

  it('returns embedded-browser hint for NotSupportedError in in-app webview', async () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/123.0.0.0 Mobile Safari/537.36 FBAN/FBIOS'
    );

    const { getCameraAccessErrorMessage } = await import('../src/lib/camera-stream');
    expect(getCameraAccessErrorMessage({ name: 'NotSupportedError' })).toContain(
      'trình duyệt nhúng'
    );
  });

  it('throws API support hint when browser does not expose mediaDevices.getUserMedia', async () => {
    setSecureContext(true);
    setMediaDevices(undefined);

    const { requestPreferredCameraStream } = await import('../src/lib/camera-stream');
    await expect(requestPreferredCameraStream()).rejects.toThrow(/Camera API|trình duyệt nhúng/i);
  });

  it('throws secure-context hint when secure context is unavailable', async () => {
    setSecureContext(false);
    setMediaDevices({
      getUserMedia: vi.fn(),
    } as unknown as MediaDevices);

    const { requestPreferredCameraStream } = await import('../src/lib/camera-stream');
    await expect(requestPreferredCameraStream()).rejects.toThrow(/camera/i);
  });

  it('returns targeted troubleshooting tips for insecure embedded browser contexts', async () => {
    setSecureContext(false);
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/123.0.0.0 Mobile Safari/537.36 FBAN/FBIOS'
    );

    const { getCameraTroubleshootingSteps } = await import('../src/lib/camera-stream');
    const tips = getCameraTroubleshootingSteps({ name: 'NotSupportedError' });

    expect(tips.join(' ')).toMatch(/HTTPS|localhost/i);
    expect(tips.join(' ')).toMatch(/Chrome|Safari|Edge/i);
  });

  it('returns permission and recovery tips when user denies camera', async () => {
    const { getCameraTroubleshootingSteps } = await import('../src/lib/camera-stream');
    const tips = getCameraTroubleshootingSteps({ name: 'NotAllowedError' });

    expect(tips.join(' ')).toMatch(/quyền Camera|quyền camera/i);
    expect(tips.join(' ')).toMatch(/tải lại trang/i);
  });
});
