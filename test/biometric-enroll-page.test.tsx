import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestPreferredCameraStream: vi.fn(),
  getCameraAccessErrorMessage: vi.fn(),
}));

vi.mock('@/lib/biometrics/face-runtime', () => ({
  detectSingleEmbedding: vi.fn(),
  performLivenessCheck: vi.fn(),
  FACE_BIOMETRIC_RUNTIME_ENABLED: false,
  FaceBiometricUnavailableError: class FaceBiometricUnavailableError extends Error {},
}));

vi.mock('@/lib/camera-stream', () => ({
  requestPreferredCameraStream: mocks.requestPreferredCameraStream,
  getCameraAccessErrorMessage: mocks.getCameraAccessErrorMessage,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Biometric enroll page camera bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses shared camera helper and surfaces helper error message', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ templates: [] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    mocks.requestPreferredCameraStream.mockRejectedValueOnce(new Error('camera blocked'));
    mocks.getCameraAccessErrorMessage.mockReturnValueOnce('Thiết bị test không mở được camera');

    const Page = (await import('../src/app/biometric/enroll/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(mocks.requestPreferredCameraStream).toHaveBeenCalledWith({
        facingMode: 'user',
        width: 1280,
        height: 720,
      });
    });

    expect(await screen.findByText('Thiết bị test không mở được camera')).toBeInTheDocument();
  });
});
