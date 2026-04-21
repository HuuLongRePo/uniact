'use client';

import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, CircleAlert, Pause, RotateCcw } from 'lucide-react';
import { getCameraAccessErrorMessage, requestPreferredCameraStream } from '@/lib/camera-stream';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

interface Props {
  onScan: (rawValue: string) => Promise<void>;
}

// Lightweight wrapper around native getUserMedia; we avoid adding new deps.
// The parent page receives the raw QR payload and is responsible for parsing it.
// Fallback manual input provided below.
export function StudentQRScanner({ onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [manualToken, setManualToken] = useState('');
  const [lastResult, setLastResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const frameRequest = useRef<number | undefined>(undefined);

  function stopScan() {
    if (frameRequest.current) {
      cancelAnimationFrame(frameRequest.current);
      frameRequest.current = undefined;
    }

    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((track) => track.stop());

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScanState('idle');
  }

  useEffect(() => {
    startScan();
    return () => {
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScan() {
    stopScan();
    setError(null);
    setScanState('scanning');

    try {
      const mediaStream = await requestPreferredCameraStream({
        facingMode: 'environment',
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => undefined);
        frameRequest.current = requestAnimationFrame(tick);
      }
    } catch (err: unknown) {
      setError(getCameraAccessErrorMessage(err));
      setScanState('error');
    }
  }

  function tick() {
    if (!videoRef.current || !canvasRef.current) {
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

    // Proper QR decode can be plugged here later (jsQR / @zxing/browser).
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

  async function submitRawValue(rawValue: string) {
    try {
      setScanState('scanning');
      await onScan(rawValue);
      setLastResult(rawValue);
      setScanState('success');
      toast.success('Điểm danh thành công');
    } catch (err: any) {
      setScanState('error');
      setError(err?.message || 'Xác thực thất bại');
      toast.error('Mã QR không hợp lệ hoặc đã hết hạn');
    }
  }

  return (
    <div className="space-y-5">
      <section className="content-card overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Quét mã QR điểm danh</h2>
          <p className="mt-1 text-sm text-gray-600">
            Ứng dụng ưu tiên camera sau trên điện thoại để quét nhanh và ổn định hơn.
          </p>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black/95">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          </div>
          <canvas ref={canvasRef} className="hidden" />

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
              onClick={startScan}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4" />
              Quét lại
            </button>
            <button
              type="button"
              onClick={stopScan}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-100 px-3.5 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
            >
              <Pause className="h-4 w-4" />
              Tạm dừng
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Nếu camera bị từ chối quyền hoặc thiết bị không nhận diện được, bạn có thể nhập dữ liệu
            QR thủ công ở phần bên dưới.
          </p>
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
