'use client';

import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    startScan();
    return () => {
      if (frameRequest.current) cancelAnimationFrame(frameRequest.current);
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScan() {
    setError(null);
    setScanState('scanning');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
        frameRequest.current = requestAnimationFrame(tick);
      }
    } catch (err: any) {
      setError('Không truy cập được camera');
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
    // Simple luminance sampling: we expect token embedded as text below QR for fallback.
    // Proper decoding would use a library (jsQR / @zxing/browser). Placeholder here.
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
    <div className="space-y-4">
      <div className="rounded border p-4">
        <h2 className="font-semibold mb-2">Quét mã QR điểm danh</h2>
        <video ref={videoRef} className="w-full rounded bg-black" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {scanState === 'success' && (
          <p className="text-green-600 text-sm mt-2">✔ Đã xác thực: {lastResult.slice(0, 16)}...</p>
        )}
        {scanState === 'error' && error && (
          <p className="text-red-600 text-sm mt-2">Lỗi: {error}</p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={startScan}
            className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            Quét lại
          </button>
          <button
            type="button"
            onClick={() => setScanState('idle')}
            className="px-3 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Tạm dừng
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          (Trình quét tối giản - sử dụng mã dự phòng nếu camera không hoạt động)
        </p>
      </div>
      <form onSubmit={handleManualSubmit} className="rounded border p-4 space-y-2">
        <label className="text-sm font-medium">Nhập dữ liệu thô từ mã QR</label>
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder='Ví dụ: {"s":123,"t":"qr_token"}'
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
        />
        <button
          type="submit"
          className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-500"
        >
          Điểm danh thủ công
        </button>
      </form>
    </div>
  );
}
