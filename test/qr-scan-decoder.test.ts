import { describe, expect, it, vi } from 'vitest';
import type { BarcodeDetectorInstance, JsQrDecoder } from '@/lib/qr-scan-decoder';
import { decodeQrValueFromSource } from '@/lib/qr-scan-decoder';

const fakeSource = {} as ImageBitmapSource;
const fakeImageData = {
  data: new Uint8ClampedArray([0, 0, 0, 255]),
  width: 1,
  height: 1,
} as unknown as ImageData;

const rectangularImageData = {
  data: new Uint8ClampedArray([
    0,
    0,
    0,
    255,
    255,
    255,
    255,
    255,
  ]),
  width: 1,
  height: 2,
} as unknown as ImageData;

const zoomCandidateImageData = {
  data: new Uint8ClampedArray(30 * 30 * 4).fill(255),
  width: 30,
  height: 30,
} as unknown as ImageData;

const offCenterCandidateImageData = (() => {
  const width = 40;
  const height = 40;
  const data = new Uint8ClampedArray(width * height * 4);
  const markerOffset = (3 * width + 1) * 4;
  data[markerOffset] = 77;
  data[markerOffset + 3] = 255;
  return { data, width, height } as unknown as ImageData;
})();

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

  it('uses the first non-empty BarcodeDetector result when leading items are blank', async () => {
    const barcodeDetector: BarcodeDetectorInstance = {
      detect: vi.fn(async () => [{ rawValue: '' }, { rawValue: '  qr-from-second-item ' }]),
    };

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector,
      jsQrDecoder: null,
    });

    expect(result).toBe('qr-from-second-item');
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

  it('tries rotated candidates in aggressive mode for tilted image uploads', async () => {
    const jsQrMock = vi
      .fn((_: Uint8ClampedArray, width: number, height: number) => {
        if (width === 2 && height === 1) {
          return { data: 'qr-from-rotated-or-resized-pass' };
        }
        return null;
      })
      .mockName('jsQrDecoder');
    const jsQrDecoder = jsQrMock as unknown as JsQrDecoder;

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector: null,
      jsQrDecoder,
      getFallbackImageData: () => rectangularImageData,
      aggressive: true,
    });

    expect(result).toBe('qr-from-rotated-or-resized-pass');
    expect(jsQrDecoder).toHaveBeenCalled();
    expect(jsQrMock.mock.calls.some((call) => call[1] === 2 && call[2] === 1)).toBe(true);
  });

  it('tries zoom-cropped candidates in aggressive mode for distant QR frames', async () => {
    const jsQrMock = vi
      .fn((_: Uint8ClampedArray, width: number, height: number) => {
        if (width === 17 && height === 17) {
          return { data: 'qr-from-zoom-crop' };
        }
        return null;
      })
      .mockName('jsQrDecoder');
    const jsQrDecoder = jsQrMock as unknown as JsQrDecoder;

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector: null,
      jsQrDecoder,
      getFallbackImageData: () => zoomCandidateImageData,
      aggressive: true,
    });

    expect(result).toBe('qr-from-zoom-crop');
    expect(jsQrMock.mock.calls.some((call) => call[1] === 17 && call[2] === 17)).toBe(true);
  });

  it('tries shifted crop candidates so off-center QR can still be decoded', async () => {
    const jsQrMock = vi
      .fn((pixels: Uint8ClampedArray, width: number, height: number) => {
        if (width === 35 && height === 35 && pixels[0] === 77) {
          return { data: 'qr-from-shifted-crop' };
        }
        return null;
      })
      .mockName('jsQrDecoder');
    const jsQrDecoder = jsQrMock as unknown as JsQrDecoder;

    const result = await decodeQrValueFromSource({
      source: fakeSource,
      barcodeDetector: null,
      jsQrDecoder,
      getFallbackImageData: () => offCenterCandidateImageData,
      aggressive: true,
    });

    expect(result).toBe('qr-from-shifted-crop');
  });
});
