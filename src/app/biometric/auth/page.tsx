/**
 * Biometric Authentication Page
 * Login using face recognition (supports masked faces)
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  detectSingleEmbedding,
  performLivenessCheck,
  FaceBiometricUnavailableError,
  FACE_BIOMETRIC_RUNTIME_ENABLED,
} from '@/lib/biometrics/face-runtime';
import type { FaceDetectionResult, LivenessCheckResult } from '@/lib/biometrics/face-runtime';

type AuthStep = 'email' | 'camera' | 'capturing' | 'liveness' | 'processing' | 'success' | 'error';

export default function BiometricAuth() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [capturedData, setCapturedData] = useState<FaceDetectionResult | null>(null);
  const [livenessResult, setLivenessResult] = useState<LivenessCheckResult | null>(null);
  const [error, setError] = useState('');
  const [matchDetails, setMatchDetails] = useState<any>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setMessage('Camera sẵn sàng. Nhấn nút để xác thực.');
      setStep('camera');
    } catch (err: any) {
      setError(`Không thể truy cập camera: ${err.message}`);
      setStep('error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Vui lòng nhập email');
      return;
    }
    startCamera();
  };

  const handleAuthenticate = async () => {
    if (!videoRef.current) return;

    try {
      if (!FACE_BIOMETRIC_RUNTIME_ENABLED) {
        throw new FaceBiometricUnavailableError();
      }

      setStep('capturing');
      setMessage('Đang chụp khuôn mặt...');
      setProgress(20);

      // Capture face
      const result = await detectSingleEmbedding(videoRef.current);

      if (!result) {
        setError('Không phát hiện khuôn mặt. Vui lòng đảm bảo mặt của bạn nằm trong khung hình.');
        setStep('error');
        return;
      }

      if (result.qualityScore < 50) {
        setError(
          `Chất lượng ảnh quá thấp (${result.qualityScore.toFixed(0)}/100). Vui lòng đảm bảo ánh sáng tốt.`
        );
        setStep('error');
        return;
      }

      setCapturedData(result);
      setProgress(40);

      // Liveness check
      setStep('liveness');
      setMessage('Vui lòng nhấp nháy mắt và cử động đầu nhẹ...');
      setProgress(50);

      const liveness = await performLivenessCheck(videoRef.current, 10, 100);
      setLivenessResult(liveness);
      setProgress(70);

      // Authenticate (even if liveness fails - let server decide)
      setStep('processing');
      setMessage('Đang xác thực...');
      setProgress(80);

      const templateType = result.hasMask ? 'face_masked' : 'face';

      const authRes = await fetch('/api/biometric/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          embedding: result.embedding,
          templateType,
          hasMask: result.hasMask,
          qualityScore: result.qualityScore,
          livenessCheck: liveness,
        }),
      });

      const authData = await authRes.json();

      if (!authRes.ok) {
        setError(authData.message || authData.error);
        setStep('error');
        return;
      }

      setMatchDetails(authData.matchDetails);
      setProgress(100);
      setStep('success');
      setMessage('✅ Xác thực thành công!');

      // Redirect after 2s
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      if (err instanceof FaceBiometricUnavailableError) {
        setError(err.message);
      } else {
        setError(err.message);
      }
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('email');
    setEmail('');
    setMessage('');
    setProgress(0);
    setCapturedData(null);
    setLivenessResult(null);
    setMatchDetails(null);
    setError('');
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Đăng nhập bằng khuôn mặt</h1>
          <p className="text-gray-600">Hỗ trợ nhận diện khi đeo khẩu trang</p>
        </div>

        {/* Email Input */}
        {step === 'email' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Tính năng đăng nhập bằng khuôn mặt hiện đang tạm tắt trong bản phát hành này để đảm
              bảo an toàn và ổn định hệ thống. Vui lòng dùng đăng nhập bằng mật khẩu.
            </div>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="example@domain.com"
                  required
                />
              </div>
              <button
                type="submit"
                disabled
                className="w-full px-6 py-3 bg-gray-300 text-gray-600 rounded-lg font-medium cursor-not-allowed"
              >
                Xác thực khuôn mặt tạm không khả dụng
              </button>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Đăng nhập bằng mật khẩu
              </button>
            </form>
          </div>
        )}

        {/* Camera View */}
        {step !== 'email' && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {capturedData && (
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded text-sm space-y-1">
                  <div>Chất lượng: {capturedData.qualityScore.toFixed(0)}/100</div>
                  {capturedData.hasMask && <div>😷 Đeo khẩu trang</div>}
                </div>
              )}

              {step === 'camera' && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <button
                    onClick={handleAuthenticate}
                    className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium shadow-lg"
                  >
                    Xác thực ngay
                  </button>
                </div>
              )}
            </div>

            {/* Progress */}
            {step !== 'camera' && step !== 'error' && step !== 'success' && (
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">{message}</p>
              </div>
            )}

            {/* Error */}
            {step === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium mb-2">Xác thực thất bại</p>
                <p className="text-red-700 text-sm mb-4">{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep('camera');
                      setError('');
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Thử lại
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}

            {/* Success */}
            {step === 'success' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                <p className="text-green-800 font-medium text-lg">{message}</p>
                {matchDetails && (
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>Độ khớp: {matchDetails.similarityPercent}%</div>
                    <div>Template: {matchDetails.templateType}</div>
                    {matchDetails.maskMode && <div>😷 Chế độ khẩu trang</div>}
                  </div>
                )}
                <p className="text-sm text-gray-600">Đang chuyển hướng...</p>
              </div>
            )}

            {/* Liveness Details */}
            {livenessResult && step !== 'success' && (
              <div
                className={`border rounded-lg p-4 ${
                  livenessResult.passed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <h3 className="font-semibold text-sm mb-2">
                  Kiểm tra liveness: {livenessResult.score}/100
                  {livenessResult.passed ? ' ✓' : ' ⚠️'}
                </h3>
                <ul className="text-xs space-y-1">
                  {livenessResult.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
