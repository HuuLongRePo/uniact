'use client';

import { useEffect, useRef, useState } from 'react';
import {
  analyzeLighting,
  autoAdjustBrightness,
  detectBacklight,
  getSuggestions,
  LightingAnalysis,
} from '@/lib/lighting-detector';
import { getCameraAccessErrorMessage, requestPreferredCameraStream } from '@/lib/camera-stream';

interface BiometricFaceAuthProps {
  onSuccess: (token: string) => void;
  onFallback?: (reason: 'camera_error' | 'low_light' | 'no_face' | 'quality_poor') => void;
  onError?: (error: string) => void;
  autoAdjust?: boolean;
}

export default function BiometricFaceAuth({
  onSuccess,
  onFallback,
  onError,
  autoAdjust = true,
}: BiometricFaceAuthProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<string>('Đang khởi động camera...');
  const [lighting, setLighting] = useState<LightingAnalysis | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [hasBacklight, setHasBacklight] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;

    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const analysis = analyzeLighting(videoRef.current);
        setLighting(analysis);

        const backlight = detectBacklight(videoRef.current);
        setHasBacklight(backlight);

        if (!analysis.canProceed && onFallback) {
          onFallback('low_light');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cameraReady, onFallback]);

  const startCamera = async () => {
    try {
      const mediaStream = await requestPreferredCameraStream({
        facingMode: 'user',
        width: 1280,
        height: 720,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setCameraReady(true);
        setStatus('Camera đã sẵn sàng');

        if (autoAdjust) {
          try {
            await autoAdjustBrightness(mediaStream, 120);
            setStatus('✅ Đã tối ưu ánh sáng tự động');
          } catch (err) {
            console.warn('Không thể auto-adjust:', err);
          }
        }
      }
    } catch (error: unknown) {
      console.error('Camera error:', error);
      const errorMsg = getCameraAccessErrorMessage(error);
      setStatus(`❌ ${errorMsg}`);
      onError?.(errorMsg);
      onFallback?.('camera_error');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraReady(false);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !cameraReady) {
      setStatus('❌ Camera chưa sẵn sàng');
      return;
    }

    if (lighting && !lighting.canProceed) {
      setStatus('⚠️ Ánh sáng quá kém, không thể nhận diện');
      onFallback?.('low_light');
      return;
    }

    setAnalyzing(true);
    setStatus('📸 Đang chụp và nhận diện...');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Không thể tạo canvas context');

      ctx.drawImage(videoRef.current, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (nextBlob) => (nextBlob ? resolve(nextBlob) : reject(new Error('Canvas to blob failed'))),
          'image/jpeg',
          0.95
        );
      });

      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');

      const response = await fetch('/api/auth/face-recognition', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Nhận diện thất bại');
      }

      const data = await response.json();

      if (data.token) {
        setStatus('✅ Nhận diện thành công!');
        setTimeout(() => onSuccess(data.token), 500);
      } else {
        setStatus('❌ Không nhận diện được khuôn mặt');
        onFallback?.('no_face');
      }
    } catch (error: unknown) {
      console.error('Face recognition error:', error);
      const message = error instanceof Error ? error.message : 'Lỗi nhận diện';
      setStatus(`❌ ${message}`);
      onError?.(message);
      onFallback?.('quality_poor');
    } finally {
      setAnalyzing(false);
    }
  };

  const getLightingColor = () => {
    if (!lighting) return 'bg-gray-100 text-gray-600';

    switch (lighting.quality) {
      case 'excellent':
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'fair':
        return 'bg-amber-100 text-amber-800';
      case 'poor':
      case 'insufficient':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="biometric-face-auth rounded-lg border-2 border-blue-200 bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center gap-3">
        <div className="text-4xl">📷</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Nhận diện khuôn mặt</h3>
          <p className="text-sm text-gray-600">Nhìn thẳng vào camera để xác thực</p>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        {status}
      </div>

      <div
        className="relative mb-4 overflow-hidden rounded-lg bg-black"
        style={{ aspectRatio: '16/9' }}
      >
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-80 w-64 rounded-full border-4 border-blue-400 opacity-50" />
        </div>

        {hasBacklight && (
          <div className="absolute left-4 right-4 top-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white">
            ⚠️ Phát hiện ánh sáng phía sau. Hãy quay mặt về phía nguồn sáng.
          </div>
        )}
      </div>

      {lighting && (
        <div className={`mb-4 rounded-md p-3 text-sm ${getLightingColor()}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Độ sáng: {lighting.brightness}/255</span>
            <span className="text-xs font-bold uppercase">{lighting.quality}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all ${
                lighting.quality === 'excellent' || lighting.quality === 'good'
                  ? 'bg-green-500'
                  : lighting.quality === 'fair'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${(lighting.brightness / 255) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs">{lighting.recommendation}</p>
        </div>
      )}

      {lighting && !lighting.canProceed && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="mb-2 font-medium">💡 Gợi ý cải thiện:</p>
          <ul className="ml-4 space-y-1 text-xs">
            {getSuggestions(lighting).map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleCapture}
        disabled={!cameraReady || analyzing || (lighting ? !lighting.canProceed : false)}
        className={`w-full rounded-md px-4 py-3 font-medium transition-colors ${
          !cameraReady || analyzing || (lighting && !lighting.canProceed)
            ? 'cursor-not-allowed bg-gray-300 text-gray-500'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {analyzing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Đang phân tích...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="text-xl">📸</span>
            Chụp và xác thực
          </span>
        )}
      </button>

      <div className="mt-4 space-y-1 text-xs text-gray-500">
        <p>✓ Tự động điều chỉnh ánh sáng: {autoAdjust ? 'Bật' : 'Tắt'}</p>
        <p>✓ Độ sáng tối thiểu: 40/255</p>
        <p>✓ Phát hiện backlight: {hasBacklight ? 'Có' : 'Không'}</p>
      </div>
    </div>
  );
}
