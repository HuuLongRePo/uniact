export type ZxingScanResultLike = {
  getText?: () => string;
  text?: string;
};

export type ZxingScanControls = {
  stop: () => void | Promise<void>;
};

export type ZxingDecodeCallback = (
  result: ZxingScanResultLike | undefined,
  error: unknown,
  controls: ZxingScanControls
) => void;

export type ZxingBrowserQrReader = {
  decodeFromVideoElement: (
    source: HTMLVideoElement,
    callback: ZxingDecodeCallback
  ) => Promise<ZxingScanControls>;
};

export async function loadZxingBrowserQrReader(): Promise<ZxingBrowserQrReader | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const mod = await import('@zxing/browser');
    const readerOptions = {
      delayBetweenScanAttempts: 80,
      delayBetweenScanSuccess: 350,
      tryPlayVideoTimeout: 3000,
    };

    if (typeof mod.BrowserQRCodeReader === 'function') {
      try {
        return new mod.BrowserQRCodeReader(undefined, readerOptions);
      } catch {}
    }

    if (typeof mod.BrowserMultiFormatReader === 'function') {
      try {
        return new mod.BrowserMultiFormatReader(undefined, readerOptions);
      } catch {}
    }

    return null;
  } catch {
    return null;
  }
}

export function getZxingResultText(result: ZxingScanResultLike | undefined): string | null {
  if (!result) return null;
  if (typeof result.getText === 'function') {
    const value = result.getText();
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  if (typeof result.text === 'string' && result.text.trim()) {
    return result.text.trim();
  }

  return null;
}
