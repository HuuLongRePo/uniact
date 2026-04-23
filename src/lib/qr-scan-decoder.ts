import type jsQR from 'jsqr';

export type BarcodeDetectorResult = {
  rawValue?: string | null;
};

export type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

export type JsQrDecoder = typeof jsQR;

let cachedJsQrDecoderPromise: Promise<JsQrDecoder | null> | null = null;

function normalizeDecodedValue(rawValue: unknown): string | null {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  return value ? value : null;
}

export function createBarcodeDetectorInstance(): BarcodeDetectorInstance | null {
  if (typeof window === 'undefined') return null;

  const DetectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;

  if (!DetectorCtor) return null;

  try {
    return new DetectorCtor({ formats: ['qr_code'] });
  } catch {
    try {
      return new DetectorCtor();
    } catch {
      return null;
    }
  }
}

export async function loadJsQrDecoder(): Promise<JsQrDecoder | null> {
  if (!cachedJsQrDecoderPromise) {
    cachedJsQrDecoderPromise = import('jsqr').then((module) => module.default).catch(() => null);
  }

  return cachedJsQrDecoderPromise;
}

export async function decodeQrValueFromSource({
  source,
  barcodeDetector,
  jsQrDecoder,
  getFallbackImageData,
}: {
  source: ImageBitmapSource;
  barcodeDetector: BarcodeDetectorInstance | null;
  jsQrDecoder: JsQrDecoder | null;
  getFallbackImageData?: () => ImageData | null;
}): Promise<string | null> {
  if (barcodeDetector) {
    try {
      const detectorResults = await barcodeDetector.detect(source);
      const fromDetector = normalizeDecodedValue(detectorResults?.[0]?.rawValue);
      if (fromDetector) {
        return fromDetector;
      }
    } catch {
      // Keep fallback path for browsers where BarcodeDetector is flaky.
    }
  }

  if (!jsQrDecoder || !getFallbackImageData) {
    return null;
  }

  const imageData = getFallbackImageData();
  if (!imageData || imageData.data.length === 0) {
    return null;
  }

  const jsQrResult = jsQrDecoder(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  return normalizeDecodedValue(jsQrResult?.data);
}
