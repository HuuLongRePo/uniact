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
type ImageDataLike = Pick<ImageData, 'data' | 'width' | 'height'>;

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

function decodeWithJsQr(
  jsQrDecoder: JsQrDecoder,
  imageData: ImageDataLike,
  inversionAttempts: 'dontInvert' | 'attemptBoth'
) {
  const result = jsQrDecoder(imageData.data, imageData.width, imageData.height, {
    inversionAttempts,
  });

  return normalizeDecodedValue(result?.data);
}

function buildHighContrastImageData(imageData: ImageDataLike): ImageDataLike {
  const next = new Uint8ClampedArray(imageData.data.length);
  const source = imageData.data;
  let luminanceTotal = 0;
  let pixelCount = 0;

  for (let index = 0; index < source.length; index += 4) {
    const luminance = source[index] * 0.299 + source[index + 1] * 0.587 + source[index + 2] * 0.114;
    luminanceTotal += luminance;
    pixelCount += 1;
  }

  const threshold = pixelCount > 0 ? luminanceTotal / pixelCount : 128;

  for (let index = 0; index < source.length; index += 4) {
    const luminance = source[index] * 0.299 + source[index + 1] * 0.587 + source[index + 2] * 0.114;
    const value = luminance >= threshold ? 255 : 0;
    next[index] = value;
    next[index + 1] = value;
    next[index + 2] = value;
    next[index + 3] = 255;
  }

  return {
    data: next,
    width: imageData.width,
    height: imageData.height,
  };
}

function buildResizedImageData(imageData: ImageDataLike, scale: number): ImageDataLike | null {
  if (!(scale > 1)) {
    return null;
  }

  const targetWidth = Math.min(2400, Math.floor(imageData.width * scale));
  const targetHeight = Math.min(2400, Math.floor(imageData.height * scale));
  if (targetWidth <= imageData.width || targetHeight <= imageData.height) {
    return null;
  }

  const source = imageData.data;
  const resized = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const ratioX = imageData.width / targetWidth;
  const ratioY = imageData.height / targetHeight;

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(imageData.height - 1, Math.floor(y * ratioY));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(imageData.width - 1, Math.floor(x * ratioX));
      const sourceOffset = (sourceY * imageData.width + sourceX) * 4;
      const targetOffset = (y * targetWidth + x) * 4;
      resized[targetOffset] = source[sourceOffset];
      resized[targetOffset + 1] = source[sourceOffset + 1];
      resized[targetOffset + 2] = source[sourceOffset + 2];
      resized[targetOffset + 3] = source[sourceOffset + 3];
    }
  }

  return {
    data: resized,
    width: targetWidth,
    height: targetHeight,
  };
}

function buildRotatedImageData(imageData: ImageDataLike, angle: 90 | 180 | 270): ImageDataLike {
  const source = imageData.data;
  const sourceWidth = imageData.width;
  const sourceHeight = imageData.height;
  const rotatedWidth = angle === 180 ? sourceWidth : sourceHeight;
  const rotatedHeight = angle === 180 ? sourceHeight : sourceWidth;
  const rotated = new Uint8ClampedArray(rotatedWidth * rotatedHeight * 4);

  const getSourceOffset = (x: number, y: number) => (y * sourceWidth + x) * 4;
  const getTargetOffset = (x: number, y: number) => (y * rotatedWidth + x) * 4;

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      let targetX = x;
      let targetY = y;

      if (angle === 90) {
        targetX = sourceHeight - 1 - y;
        targetY = x;
      } else if (angle === 180) {
        targetX = sourceWidth - 1 - x;
        targetY = sourceHeight - 1 - y;
      } else if (angle === 270) {
        targetX = y;
        targetY = sourceWidth - 1 - x;
      }

      const sourceOffset = getSourceOffset(x, y);
      const targetOffset = getTargetOffset(targetX, targetY);
      rotated[targetOffset] = source[sourceOffset];
      rotated[targetOffset + 1] = source[sourceOffset + 1];
      rotated[targetOffset + 2] = source[sourceOffset + 2];
      rotated[targetOffset + 3] = source[sourceOffset + 3];
    }
  }

  return {
    data: rotated,
    width: rotatedWidth,
    height: rotatedHeight,
  };
}

function collectAggressiveCandidates(imageData: ImageDataLike) {
  const candidates: ImageDataLike[] = [];
  const maxDimension = Math.max(imageData.width, imageData.height);
  const scale = maxDimension <= 1200 ? 2 : 1.5;

  const pushVariants = (candidate: ImageDataLike) => {
    candidates.push(candidate);
    candidates.push(buildHighContrastImageData(candidate));

    const resized = buildResizedImageData(candidate, scale);
    if (resized) {
      candidates.push(resized);
      candidates.push(buildHighContrastImageData(resized));
    }
  };

  pushVariants(imageData);

  const rotated90 = buildRotatedImageData(imageData, 90);
  const rotated180 = buildRotatedImageData(imageData, 180);
  const rotated270 = buildRotatedImageData(imageData, 270);
  pushVariants(rotated90);
  pushVariants(rotated180);
  pushVariants(rotated270);

  return candidates;
}

function decodeAggressiveWithJsQr(jsQrDecoder: JsQrDecoder, imageData: ImageDataLike): string | null {
  const candidates = collectAggressiveCandidates(imageData);

  for (const candidate of candidates) {
    const decoded =
      decodeWithJsQr(jsQrDecoder, candidate, 'attemptBoth') ||
      decodeWithJsQr(jsQrDecoder, candidate, 'dontInvert');
    if (decoded) {
      return decoded;
    }
  }

  return null;
}

export async function decodeQrValueFromSource({
  source,
  barcodeDetector,
  jsQrDecoder,
  getFallbackImageData,
  aggressive = false,
}: {
  source: ImageBitmapSource;
  barcodeDetector: BarcodeDetectorInstance | null;
  jsQrDecoder: JsQrDecoder | null;
  getFallbackImageData?: () => ImageData | null;
  aggressive?: boolean;
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

  // Some QR codes (especially screenshots/printed) may require inversion attempts.
  const directValue = decodeWithJsQr(jsQrDecoder, imageData, 'dontInvert');
  if (directValue) {
    return directValue;
  }

  const fallbackValue = decodeWithJsQr(jsQrDecoder, imageData, 'attemptBoth');
  if (fallbackValue) {
    return fallbackValue;
  }

  if (!aggressive) {
    return null;
  }

  return decodeAggressiveWithJsQr(jsQrDecoder, imageData);
}
