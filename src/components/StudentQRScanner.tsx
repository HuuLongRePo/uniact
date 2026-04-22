'use client';

import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, CircleAlert, Info, Pause, RotateCcw } from 'lucide-react';
import {
  getCameraAccessErrorMessage,
  getCameraTroubleshootingSteps,
  requestPreferredCameraStream,
} from '@/lib/camera-stream';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

interface Props {
  onScan: (rawValue: string) => Promise<void>;
}

function createBarcodeDetector(): BarcodeDetectorInstance | null {
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

export function StudentQRScanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRequest = useRef<number | undefined>(undefined);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const submittingRef = useRef(false);
  const processingFrameRef = useRef(false);
  const lastDecodeAtRef = useRef(0);
  const lastScannedRawRef = useRef('');

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [manualToken, setManualToken] = useState('');
  const [lastResult, setLastResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cameraTips, setCameraTips] = useState<string[]>(() => getCameraTroubleshootingSteps());
  const [autoScanSupported, setAutoScanSupported] = useState(false);

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

    setScanState(nextState);
  }

  useEffect(() => {
    detectorRef.current = createBarcodeDetector();
    setAutoScanSupported(Boolean(detectorRef.current));

    void startScan();
    return () => {
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScan() {
    stopScan('idle');
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
        await videoRef.current.play().catch(() => undefined);

        if (detectorRef.current) {
          frameRequest.current = requestAnimationFrame(tick);
        }
      }
    } catch (err: unknown) {
      setError(getCameraAccessErrorMessage(err));
      setCameraTips(getCameraTroubleshootingSteps(err));
      setScanState('error');
    }
  }

  function tick() {
    if (!videoRef.current || !canvasRef.current || !detectorRef.current) {
      frameRequest.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== 4) {
      frameRequest.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const shouldDecode = now - lastDecodeAtRef.current >= 240;

    if (shouldDecode && !submittingRef.current && !processingFrameRef.current) {
      lastDecodeAtRef.current = now;
      processingFrameRef.current = true;

      void detectorRef.current
        .detect(canvas)
        .then(async (results) => {
          const firstValue = String(results?.[0]?.rawValue || '').trim();
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

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    if (!detectorRef.current || typeof window.createImageBitmap !== 'function') {
      toast.error('Trình duyệt không hỗ trợ quét QR từ ảnh. Hãy dùng nhập thủ công.');
      return;
    }

    try {
      setError(null);
      setScanState('scanning');

      const imageBitmap = await window.createImageBitmap(file);
      const results = await detectorRef.current.detect(imageBitmap);
      imageBitmap.close();

      const firstValue = String(results?.[0]?.rawValue || '').trim();
      if (!firstValue) {
        throw new Error('Không đọc được mã QR từ ảnh.');
      }

      await submitRawValue(firstValue);
    } catch (err) {
      setScanState('error');
      setError(err instanceof Error ? err.message : 'Không thể quét mã QR từ ảnh');
      toast.error('Không thể quét mã QR từ ảnh');
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
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black/95">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {!autoScanSupported && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Trình duyệt hiện tại chưa hỗ trợ quét QR tự động. Bạn vẫn có thể nhập dữ liệu QR thủ
              công ở bên dưới.
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
              khung nhập thủ công.
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
            Nhập dữ liệu thô từ mã QR
          </label>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            placeholder='Ví dụ: {"s":123,"t":"qr_token"}'
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
      </section>
    </div>
  );
}
