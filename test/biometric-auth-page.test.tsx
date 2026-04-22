import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  requestPreferredCameraStream: vi.fn(),
  getCameraAccessErrorMessage: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
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

describe('Biometric auth page camera fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows helper-based camera error when opening camera fails', async () => {
    mocks.requestPreferredCameraStream.mockRejectedValueOnce(new Error('camera unavailable'));
    mocks.getCameraAccessErrorMessage.mockReturnValueOnce('Không thể mở camera kiểm thử');

    const Page = (await import('../src/app/biometric/auth/page')).default;
    render(<Page />);

    const emailInput = screen.getByPlaceholderText('example@domain.com');
    fireEvent.change(emailInput, { target: { value: 'student@test.local' } });

    const form = emailInput.closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mocks.requestPreferredCameraStream).toHaveBeenCalledWith({
        facingMode: 'user',
        width: 1280,
        height: 720,
      });
    });

    expect(await screen.findByText('Không thể mở camera kiểm thử')).toBeInTheDocument();
  });
});
