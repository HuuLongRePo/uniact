export type RuntimeQrScanner = {
  start: () => Promise<void>;
  stop: () => void;
  destroy: () => void;
  setInversionMode?: (mode: 'original' | 'invert' | 'both') => void;
};

export type RuntimeQrScannerScanRegion = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  downScaledWidth?: number;
  downScaledHeight?: number;
};

export type RuntimeQrScannerFactory = {
  create: (options: {
    video: HTMLVideoElement;
    onDecode: (rawValue: string) => void;
    onDecodeError?: (error: unknown) => void;
  }) => RuntimeQrScanner;
  scanImage: (
    source: HTMLCanvasElement | HTMLVideoElement,
    options?: {
      scanRegion?: RuntimeQrScannerScanRegion;
      alsoTryWithoutScanRegion?: boolean;
    }
  ) => Promise<string | null>;
};

let runtimeFactoryPromise: Promise<RuntimeQrScannerFactory | null> | null = null;

function extractDecodedText(result: unknown) {
  if (typeof result === 'string') {
    const normalized = result.trim();
    return normalized || null;
  }

  if (
    result &&
    typeof result === 'object' &&
    typeof (result as { data?: unknown }).data === 'string'
  ) {
    const normalized = (result as { data: string }).data.trim();
    return normalized || null;
  }

  return null;
}

export async function loadRuntimeQrScannerFactory(): Promise<RuntimeQrScannerFactory | null> {
  if (!runtimeFactoryPromise) {
    runtimeFactoryPromise = (async () => {
      if (typeof window === 'undefined') {
        return null;
      }

      try {
        const mod = await import('qr-scanner');
        const QrScannerCtor = mod.default;
        const qrEnginePromise = QrScannerCtor.createQrEngine().catch(() => null);

        return {
          create({ video, onDecode, onDecodeError }) {
            const scanner = new QrScannerCtor(
              video,
              (result: unknown) => {
                const decoded = extractDecodedText(result);
                if (decoded) {
                  onDecode(decoded);
                }
              },
              {
                preferredCamera: 'environment',
                maxScansPerSecond: 30,
                calculateScanRegion: (sourceVideo: HTMLVideoElement) => {
                  const sourceWidth = sourceVideo.videoWidth || sourceVideo.clientWidth || 720;
                  const sourceHeight = sourceVideo.videoHeight || sourceVideo.clientHeight || 720;
                  const x = 0;
                  const y = 0;
                  const width = Math.max(1, Math.floor(sourceWidth));
                  const height = Math.max(1, Math.floor(sourceHeight));

                  return {
                    x,
                    y,
                    width,
                    height,
                    downScaledWidth: 960,
                    downScaledHeight: 960,
                  };
                },
                returnDetailedScanResult: true,
                onDecodeError: (error: unknown) => {
                  if (String(error || '').includes('No QR code found')) {
                    return;
                  }
                  onDecodeError?.(error);
                },
              }
            ) as RuntimeQrScanner;

            try {
              scanner.setInversionMode?.('both');
            } catch {}

            return scanner;
          },
          async scanImage(source, options) {
            try {
              const result = await QrScannerCtor.scanImage(source, {
                scanRegion: options?.scanRegion,
                qrEngine: qrEnginePromise,
                alsoTryWithoutScanRegion: options?.alsoTryWithoutScanRegion ?? false,
                returnDetailedScanResult: true,
              });
              return extractDecodedText(result);
            } catch {
              return null;
            }
          },
        };
      } catch {
        return null;
      }
    })();
  }

  return runtimeFactoryPromise;
}
