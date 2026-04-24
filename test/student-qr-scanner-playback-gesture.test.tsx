import React from 'react';
import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentQRScanner } from '@/components/StudentQRScanner';

vi.mock('@/lib/camera-stream', () => ({
  requestPreferredCameraStream: vi.fn(async () => ({
    getTracks: () => [],
  })),
  getCameraAccessErrorMessage: (err: unknown) =>
    err instanceof Error ? err.message : 'Không truy cập được camera.',
  getCameraTroubleshootingSteps: () => ['Tip 1'],
}));

vi.mock('@/lib/qr-scan-decoder', () => ({
  createBarcodeDetectorInstance: () => null,
  decodeQrValueFromSource: vi.fn(async () => null),
  loadJsQrDecoder: vi.fn(async () => null),
}));

describe('StudentQRScanner mobile playback fallback', () => {
  it('shows an explicit enable-camera button when autoplay playback is blocked', async () => {
    const originalPlay = HTMLMediaElement.prototype.play;
    const playMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('Autoplay blocked')))
      .mockImplementation(() => Promise.resolve());
    HTMLMediaElement.prototype.play = playMock as unknown as typeof HTMLMediaElement.prototype.play;

    try {
      render(<StudentQRScanner onScan={vi.fn(async () => undefined)} />);

      await waitFor(() => {
        expect(screen.getByTestId('qr-enable-camera')).toBeInTheDocument();
      });

      // Second attempt should clear the overlay.
      await act(async () => {
        screen.getByTestId('qr-enable-camera').click();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('qr-enable-camera')).toBeNull();
      });
    } finally {
      HTMLMediaElement.prototype.play = originalPlay;
    }
  });

  it('shows deep-link guidance when running in an insecure context', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });

    try {
      render(<StudentQRScanner onScan={vi.fn(async () => undefined)} />);

      await waitFor(() => {
        expect(screen.getByTestId('qr-insecure-context-guide')).toBeInTheDocument();
      });

      expect(screen.getByText(/camera web có thể bị chặn trên HTTP\/LAN/i)).toBeInTheDocument();
      expect(screen.getAllByText(/\/student\/check-in\?s=\.\.\.&t=\.\.\./i).length).toBeGreaterThan(0);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'isSecureContext', originalDescriptor);
      } else {
        delete (window as Window & { isSecureContext?: boolean }).isSecureContext;
      }
    }
  });
});
