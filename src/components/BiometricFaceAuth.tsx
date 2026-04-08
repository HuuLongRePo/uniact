'use client';

import { useState, useEffect, useRef } from 'react';
import {
  analyzeLighting,
  autoAdjustBrightness,
  detectBacklight,
  getSuggestions,
  LightingAnalysis,
} from '@/lib/lighting-detector';

interface BiometricFaceAuthProps {
  onSuccess: (token: string) => void;
  onFallback?: (reason: 'camera_error' | 'low_light' | 'no_face' | 'quality_poor') => void;
  onError?: (error: string) => void;
  autoAdjust?: boolean; // Tự động điều chỉnh ánh sáng (mặc định: true)
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

  // Khởi động camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Phân tích lighting liên tục
  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;

    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const analysis = analyzeLighting(videoRef.current);
        setLighting(analysis);

        // Phát hiện backlight
        const backlight = detectBacklight(videoRef.current);
        setHasBacklight(backlight);

        // Trigger fallback nếu ánh sáng quá kém
        if (!analysis.canProceed && onFallback) {
          onFallback('low_light');
        }
      }
    }, 1000); // Kiểm tra mỗi giây

    return () => clearInterval(interval);
  }, [cameraReady, onFallback]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setCameraReady(true);
        setStatus('Camera đã sẵn sàng');

        // Tự động điều chỉnh ánh sáng
        if (autoAdjust) {
          try {
            await autoAdjustBrightness(mediaStream, 120);
            setStatus('✅ Đã tối ưu ánh sáng tự động');
          } catch (err) {
            console.warn('Không thể auto-adjust:', err);
          }
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      const errorMsg =
        error.name === 'NotAllowedError'
          ? 'Bạn đã từ chối quyền truy cập camera'
          : error.name === 'NotFoundError'
            ? 'Không tìm thấy camera trên thiết bị'
            : 'Không thể khởi động camera';

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

    // Kiểm tra lighting trước khi capture
    if (lighting && !lighting.canProceed) {
      setStatus('⚠️ Ánh sáng quá kém, không thể nhận diện');
      onFallback?.('low_light');
      return;
    }

    setAnalyzing(true);
    setStatus('📸 Đang chụp và nhận diện...');

    try {
      // Tạo canvas để capture frame
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Không thể tạo canvas context');

      ctx.drawImage(videoRef.current, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Canvas to blob failed'))),
          'image/jpeg',
          0.95
        );
      });

      // Gửi lên server để nhận diện
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
    } catch (error: any) {
      console.error('Face recognition error:', error);
      setStatus(`❌ ${error.message || 'Lỗi nhận diện'}`);
      onError?.(error.message);
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
    <div className="biometric-face-auth bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">📷</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Nhận diện khuôn mặt</h3>
          <p className="text-sm text-gray-600">Nhìn thẳng vào camera để xác thực</p>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4 p-3 rounded-md text-sm bg-blue-50 text-blue-800 border border-blue-200">
        {status}
      </div>

      {/* Video Preview */}
      <div
        className="relative mb-4 bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: '16/9' }}
      >
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

        {/* Overlay: Face Guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-80 border-4 border-blue-400 rounded-full opacity-50"></div>
        </div>

        {/* Backlight Warning */}
        {hasBacklight && (
          <div className="absolute top-4 left-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-md text-sm font-medium">
            ⚠️ Phát hiện ánh sáng phía sau! Hãy quay mặt về phía nguồn sáng
          </div>
        )}
      </div>

      {/* Lighting Analysis */}
      {lighting && (
        <div className={`mb-4 p-3 rounded-md text-sm ${getLightingColor()}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Độ sáng: {lighting.brightness}/255</span>
            <span className="text-xs uppercase font-bold">{lighting.quality}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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

      {/* Suggestions */}
      {lighting && !lighting.canProceed && (
        <div className="mb-4 p-3 rounded-md text-sm bg-amber-50 text-amber-800 border border-amber-200">
          <p className="font-medium mb-2">💡 Gợi ý cải thiện:</p>
          <ul className="text-xs space-y-1 ml-4">
            {getSuggestions(lighting).map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleCapture}
        disabled={!cameraReady || analyzing || (lighting ? !lighting.canProceed : false) || false}
        className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
          !cameraReady || analyzing || (lighting && !lighting.canProceed)
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {analyzing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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

      {/* Info */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p>✓ Tự động điều chỉnh ánh sáng: {autoAdjust ? 'Bật' : 'Tắt'}</p>
        <p>✓ Độ sáng tối thiểu: 40/255</p>
        <p>✓ Phát hiện backlight: {hasBacklight ? 'Có' : 'Không'}</p>
      </div>
    </div>
  );
}
