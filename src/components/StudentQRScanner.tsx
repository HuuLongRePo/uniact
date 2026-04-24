'use client';

import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, CircleAlert, Info, Pause, RotateCcw } from 'lucide-react';
import {
  getCameraAccessErrorMessage,
  getCameraTroubleshootingSteps,
  requestPreferredCameraStream,
} from '@/lib/camera-stream';
import {
  createBarcodeDetectorInstance,
  decodeQrValueFromSource,
  loadJsQrDecoder,
  type BarcodeDetectorInstance,
  type JsQrDecoder,
} from '@/lib/qr-scan-decoder';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

interface Props {
  onScan: (rawValue: string) => Promise<void>;
}

type LoadedQrImageSource = {
  source: ImageBitmapSource;
  width: number;
  height: number;
  dispose: () => void;
};

async function loadQrImageSource(file: File): Promise<LoadedQrImageSource> {
  if (typeof window.createImageBitmap === 'function') {
    const bitmap = await window.createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Không thể mở ảnh QR từ tệp đã chọn.'));
      nextImage.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export function StudentQRScanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRequest = useRef<number | undefined>(undefined);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const jsQrDecoderRef = useRef<JsQrDecoder | null>(null);
  const decoderInitPromiseRef = useRef<Promise<void> | null>(null);
  const submittingRef = useRef(false);
  const processingFrameRef = useRef(false);
  const lastDecodeAtRef = useRef(0);
  const lastScannedRawRef = useRef('');

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [needsPlaybackGesture, setNeedsPlaybackGesture] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraTips, setCameraTips] = useState<string[]>(() => getCameraTroubleshootingSteps());
  const [autoScanSupported, setAutoScanSupported] = useState(false);
  const [insecureContext, setInsecureContext] = useState(false);
  const insecureContextSteps = [
    'Giảng viên mở mã QR hoặc đường link điểm danh trên màn hình lớp.',
    'Học viên dùng app camera/QR bất kỳ để quét mã nếu trình duyệt web không bật được camera.',
    'Mở link /student/check-in?s=...&t=... vừa quét được và đăng nhập đúng tài khoản học viên.',
    'Hệ thống sẽ tự xác thực và điểm danh, không cần quét lại trong web.',
  ];

  function stopScan(nextState: ScanState = 'idle') {
    if (frameRequest.current) {
      cancelAnimationFrame(frameRequest.current);
      frameRequest.current = undefined;
    }

    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((track) => track.stop());

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setNeedsPlaybackGesture(false);
    setScanState(nextState);
  }

  async function ensureDecoderReady() {
    if (!decoderInitPromiseRef.current) {
      decoderInitPromiseRef.current = (async () => {
        detectorRef.current = createBarcodeDetectorInstance();
        if (!detectorRef.current) {
          jsQrDecoderRef.current = await loadJsQrDecoder();
        }

        setAutoScanSupported(Boolean(detectorRef.current || jsQrDecoderRef.current));
      })();
    }

    await decoderInitPromiseRef.current;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setInsecureContext(!window.isSecureContext);
  }, []);

  useEffect(() => {
    let mounted = true;

    void ensureDecoderReady().then(() => {
      if (mounted) {
        void startScan();
      }
    });

    return () => {
      mounted = false;
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScan() {
    await ensureDecoderReady();

    stopScan('idle');
    setNeedsPlaybackGesture(false);
    setError(null);
    setScanState('scanning');
    lastScannedRawRef.current = '';

    try {
      const mediaStream = await requestPreferredCameraStream({
        facingMode: 'environment',
      });
      setCameraTips(getCameraTroubleshootingSteps());

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch {
          // Mobile Safari / embedded browsers may block autoplay even with muted + playsInline.
          // Keep the stream and ask the user to tap once to start playback.
          setNeedsPlaybackGesture(true);
          setScanState('idle');
          return;
        }

        if (detectorRef.current || jsQrDecoderRef.current) {
          frameRequest.current = requestAnimationFrame(tick);
        }
      }
    } catch (err: unknown) {
      setError(getCameraAccessErrorMessage(err));
      setCameraTips(getCameraTroubleshootingSteps(err));
      setScanState('error');
    }
  }

  async function enablePlayback() {
    if (!videoRef.current) return;

    setError(null);
    setNeedsPlaybackGesture(false);
    setScanState('scanning');

    try {
      await videoRef.current.play();
    } catch (err: unknown) {
      setError(getCameraAccessErrorMessage(err));
      setCameraTips(getCameraTroubleshootingSteps(err));
      setNeedsPlaybackGesture(true);
      setScanState('error');
      return;
    }

    if (detectorRef.current || jsQrDecoderRef.current) {
      frameRequest.current = requestAnimationFrame(tick);
    }
  }

  function tick() {
    if (!videoRef.current || !canvasRef.current) {
      frameRequest.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context || video.readyState !== 4) {
      frameRequest.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const shouldDecode = now - lastDecodeAtRef.current >= 240;

    if (shouldDecode && !submittingRef.current && !processingFrameRef.current) {
      lastDecodeAtRef.current = now;
      processingFrameRef.current = true;

      void decodeQrValueFromSource({
        source: canvas,
        barcodeDetector: detectorRef.current,
        jsQrDecoder: jsQrDecoderRef.current,
        getFallbackImageData: () => {
          try {
            return context.getImageData(0, 0, canvas.width, canvas.height);
          } catch {
            return null;
          }
        },
      })
        .then(async (decodedValue) => {
          const firstValue = String(decodedValue || '').trim();
          if (!firstValue || firstValue === lastScannedRawRef.current) {
            return;
          }

          lastScannedRawRef.current = firstValue;
          await submitRawValue(firstValue);
        })
        .catch(() => undefined)
        .finally(() => {
          processingFrameRef.current = false;
        });
    }

    frameRequest.current = requestAnimationFrame(tick);
  }

  async function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!manualToken.trim()) {
      toast.error('Nhập dữ liệu mã QR');
      return;
    }

    await submitRawValue(manualToken.trim());
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    await ensureDecoderReady();

    if (!detectorRef.current && !jsQrDecoderRef.current) {
      toast.error('Trình duyệt không hỗ trợ quét QR từ ảnh. Hãy dùng nhập thủ công.');
      return;
    }

    let loadedImage: LoadedQrImageSource | null = null;

    try {
      setError(null);
      setScanState('scanning');

      loadedImage = await loadQrImageSource(file);
      const decodedValue = await decodeQrValueFromSource({
        source: loadedImage.source,
        barcodeDetector: detectorRef.current,
        jsQrDecoder: jsQrDecoderRef.current,
        aggressive: true,
        getFallbackImageData: () => {
          if (!loadedImage) {
            return null;
          }

          const canvas = document.createElement('canvas');
          canvas.width = loadedImage.width;
          canvas.height = loadedImage.height;

          const context = canvas.getContext('2d');
          if (!context) {
            return null;
          }

          context.drawImage(loadedImage.source as CanvasImageSource, 0, 0, canvas.width, canvas.height);

          try {
            return context.getImageData(0, 0, canvas.width, canvas.height);
          } catch {
            return null;
          }
        },
      });

      const firstValue = String(decodedValue || '').trim();
      if (!firstValue) {
        throw new Error(
          'Không đọc được mã QR từ ảnh. Hãy chọn ảnh rõ nét hơn hoặc dán link/mã QR vào ô nhập thủ công.'
        );
      }

      await submitRawValue(firstValue);
    } catch (err) {
      setScanState('error');
      setError(err instanceof Error ? err.message : 'Không thể quét mã QR từ ảnh');
      toast.error('Không thể quét mã QR từ ảnh');
    } finally {
      loadedImage?.dispose();
    }
  }

  async function submitRawValue(rawValue: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      setScanState('scanning');
      setError(null);
      await onScan(rawValue);
      setLastResult(rawValue);
      stopScan('success');
      toast.success('Điểm danh thành công');
    } catch (err: unknown) {
      setScanState('error');
      setError(err instanceof Error ? err.message : 'Xác thực thất bại');
      toast.error('Mã QR không hợp lệ hoặc đã hết hạn');
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <section className="content-card overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Quét mã QR điểm danh</h2>
          <p className="mt-1 text-sm text-gray-600">
            Học viên dùng camera sau để quét mã QR do giảng viên mở tại lớp.
          </p>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-black/95">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            {needsPlaybackGesture && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-4">
                <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/85 p-4 text-white shadow-xl backdrop-blur">
                  <div className="text-sm font-semibold">Trình duyệt đang chặn bật camera tự động</div>
                  <div className="mt-1 text-xs text-slate-200">
                    Nhấn nút bên dưới để bật camera. Nếu vẫn lỗi, dùng mục "Không dùng được camera?"
                    để tải ảnh QR hoặc nhập thủ công.
                  </div>
                  <button
                    type="button"
                    onClick={() => void enablePlayback()}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    data-testid="qr-enable-camera"
                  >
                    Bật camera
                  </button>
                </div>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {!autoScanSupported && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Trình duyệt hiện tại chưa hỗ trợ quét QR tự động. Bạn vẫn có thể nhập dữ liệu QR thủ
              công ở bên dưới.
            </div>
          )}

          {insecureContext && (
            <div
              className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900"
              data-testid="qr-insecure-context-guide"
            >
              <div className="font-semibold">Camera web có thể bị chặn trên HTTP/LAN</div>
              <p className="mt-1 text-xs leading-5">
                Nếu địa chỉ đang là <code>http://10.x</code>, <code>http://192.168.x.x</code> hoặc
                trình duyệt nhúng, hãy ưu tiên quét QR bằng app camera khác rồi mở đường link điểm
                danh. Link này hỗ trợ tự điểm danh sau khi đăng nhập đúng tài khoản.
              </p>
              <ol className="mt-2 space-y-1 text-xs leading-5">
                {insecureContextSteps.map((step, index) => (
                  <li key={step}>
                    {index + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {scanState === 'success' && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <div className="inline-flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Đã xác thực
              </div>
              <div className="mt-1 break-all">{lastResult.slice(0, 52)}...</div>
            </div>
          )}

          {scanState === 'error' && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <div className="inline-flex items-center gap-2 font-medium">
                <CircleAlert className="h-4 w-4" />
                Lỗi camera hoặc xác thực
              </div>
              <div className="mt-1">{error}</div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void startScan()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4" />
              Quét lại
            </button>
            <button
              type="button"
              onClick={() => stopScan('idle')}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-100 px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Pause className="h-4 w-4" />
              Tạm dừng
            </button>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm text-indigo-900">
            <div className="font-semibold">Không dùng được camera?</div>
            <p className="mt-1 text-xs leading-5">
              Bạn có thể tải ảnh chứa mã QR để hệ thống đọc thay cho camera, hoặc dán dữ liệu QR ở
              khung nhập thủ công. Nếu quét bằng app bên ngoài, dán nguyên link cũng được.
            </p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-300 bg-white px-3.5 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100">
              Tải ảnh QR
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleImageUpload(event)}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            <div className="inline-flex items-center gap-2 font-semibold">
              <Info className="h-4 w-4" />
              Hướng dẫn nhanh khi lỗi camera
            </div>
            <ul className="mt-2 space-y-1">
              {cameraTips.map((tip) => (
                <li key={tip} className="leading-5">
                  • {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="content-card p-4 sm:p-5">
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Nhập dữ liệu thô hoặc link từ mã QR
          </label>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            placeholder='Ví dụ: {"s":123,"t":"qr_token"} hoặc /student/check-in?s=123&t=qr_token'
            value={manualToken}
            onChange={(event) => setManualToken(event.target.value)}
          />
          <button
            type="submit"
            className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Điểm danh thủ công
          </button>
        </form>
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-700">
          QR hợp lệ có thể là JSON ngắn, query string hoặc nguyên đường link
          <code className="mx-1">/student/check-in?s=...&t=...</code>. Nếu giảng viên chiếu QR ở
          chế độ link, học viên chỉ cần mở đúng link đó là đủ.
        </div>
      </section>
    </div>
  );
}
