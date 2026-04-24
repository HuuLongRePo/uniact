import { describe, expect, it, vi } from 'vitest';
import type { BarcodeDetectorInstance, JsQrDecoder } from '@/lib/qr-scan-decoder';
import { decodeQrValueFromSource } from '@/lib/qr-scan-decoder';

const fakeSource = {} as ImageBitmapSource;
const fakeImageData = {
  data: new Uint8ClampedArray([0, 0, 0, 255]),
  width: 1,
  height: 1,
} as unknown as ImageData;

describe('qr scan decoder', () => {
  it('returns decoded value from BarcodeDetector when available', async () => {
    const barcodeDetector: BarcodeDetectorInstance = {
      detect: vi.fn(async () => [{ rawValue: '  qr-from-detector  ' }]),
    };

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector,
      jsQrDecoder: null,
    });

    expect(result).toBe('qr-from-detector');
    expect(barcodeDetector.detect).toHaveBeenCalledTimes(1);
  });

  it('falls back to jsQR when BarcodeDetector has no usable result', async () => {
    const barcodeDetector: BarcodeDetectorInstance = {
      detect: vi.fn(async () => [{ rawValue: '' }]),
    };
    const jsQrDecoder = vi.fn(() => ({ data: '  qr-from-jsqr ' })) as unknown as JsQrDecoder;
    const getFallbackImageData = vi.fn(() => fakeImageData);

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector,
      jsQrDecoder,
      getFallbackImageData,
    });

    expect(result).toBe('qr-from-jsqr');
    expect(getFallbackImageData).toHaveBeenCalledTimes(1);
  });

  it('falls back to jsQR when BarcodeDetector throws', async () => {
    const barcodeDetector: BarcodeDetectorInstance = {
      detect: vi.fn(async () => {
        throw new Error('detector failure');
      }),
    };
    const jsQrDecoder = vi.fn(() => ({
      data: 'qr-from-jsqr-after-error',
    })) as unknown as JsQrDecoder;

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector,
      jsQrDecoder,
      getFallbackImageData: () => fakeImageData,
    });

    expect(result).toBe('qr-from-jsqr-after-error');
  });

  it('returns null when no decoder can decode value', async () => {
    const getFallbackImageData = vi.fn(() => fakeImageData);

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector: null,
      jsQrDecoder: null,
      getFallbackImageData,
    });

    expect(result).toBeNull();
    expect(getFallbackImageData).not.toHaveBeenCalled();
  });

  it('uses aggressive jsQR passes for difficult image uploads', async () => {
    const jsQrDecoder = vi
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ data: 'qr-from-aggressive-pass' }) as unknown as JsQrDecoder;

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector: null,
      jsQrDecoder,
      getFallbackImageData: () => fakeImageData,
      aggressive: true,
    });

    expect(result).toBe('qr-from-aggressive-pass');
    expect(jsQrDecoder).toHaveBeenCalledTimes(3);
  });
});
