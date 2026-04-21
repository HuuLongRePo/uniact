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
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError('Trinh duyet khong ho tro camera.');
        setScanState('error');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => undefined);
        frameRequest.current = requestAnimationFrame(tick);
      }
    } catch (err: any) {
      const errorName = String(err?.name || '');
      if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
        setError('Ban da tu choi quyen camera. Hay cap quyen roi thu lai.');
      } else if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') {
        setError('Khong tim thay camera phu hop tren thiet bi.');
      } else {
        setError('Khong truy cap duoc camera.');
      }
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
      toast.error('Nhap du lieu ma QR');
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
      toast.success('Diem danh thanh cong');
    } catch (err: any) {
      setScanState('error');
      setError(err?.message || 'Xac thuc that bai');
      toast.error('Ma QR khong hop le hoac da het han');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded border p-4">
        <h2 className="font-semibold mb-2">Quet ma QR diem danh</h2>
        <video ref={videoRef} className="w-full rounded bg-black" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {scanState === 'success' && (
          <p className="text-green-600 text-sm mt-2">Da xac thuc: {lastResult.slice(0, 24)}...</p>
        )}
        {scanState === 'error' && error && <p className="text-red-600 text-sm mt-2">Loi: {error}</p>}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={startScan}
            className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
          >
            Quet lai
          </button>
          <button
            type="button"
            onClick={stopScan}
            className="px-3 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Tam dung
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Neu camera gap loi, ban co the dung o nhap thu cong ben duoi.
        </p>
      </div>

      <form onSubmit={handleManualSubmit} className="rounded border p-4 space-y-2">
        <label className="text-sm font-medium">Nhap du lieu tho tu ma QR</label>
        <input
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder='Vi du: {"s":123,"t":"qr_token"}'
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
        />
        <button
          type="submit"
          className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-500"
        >
          Diem danh thu cong
        </button>
      </form>
    </div>
  );
}