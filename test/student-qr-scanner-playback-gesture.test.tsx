import React from 'react';
import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentQRScanner } from '@/components/StudentQRScanner';

vi.mock('@/lib/camera-stream', () => ({
  requestPreferredCameraStream: vi.fn(async () => ({
    getVideoTracks: () => [
      {
        applyConstraints: vi.fn(async () => undefined),
      },
    ],
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

vi.mock('@/lib/zxing-qr-scanner', () => ({
  loadZxingBrowserQrReader: vi.fn(async () => null),
  getZxingResultText: vi.fn(() => null),
}));

vi.mock('@/lib/qr-scanner-runtime', () => ({
  loadRuntimeQrScannerFactory: vi.fn(async () => null),
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

      await act(async () => {
        screen.getByRole('button', { name: /camera/i }).click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('qr-enable-camera')).toBeInTheDocument();
      });

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

  it('shows secure-context guidance when running in an insecure context', async () => {
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

      expect(screen.getByText(/camera web bị chặn trên kết nối không bảo mật/i)).toBeInTheDocument();
      expect(screen.getByText(/hãy mở hệ thống bằng/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quét lại|bật camera|camera/i })).toBeEnabled();
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'isSecureContext', originalDescriptor);
      } else {
        delete (window as Window & { isSecureContext?: boolean }).isSecureContext;
      }
    }
  });
});
