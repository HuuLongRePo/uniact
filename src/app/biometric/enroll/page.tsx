/**
 * Enhanced Biometric Enrollment Component
 * Supports face and masked face enrollment with quality checks
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  detectSingleEmbedding,
  FaceBiometricUnavailableError,
  FACE_BIOMETRIC_RUNTIME_ENABLED,
  performLivenessCheck,
} from '@/lib/biometrics/face-runtime';
import type { FaceDetectionResult, LivenessCheckResult } from '@/lib/biometrics/face-runtime';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { getCameraAccessErrorMessage, requestPreferredCameraStream } from '@/lib/camera-stream';

type EnrollmentStep = 'camera' | 'capturing' | 'liveness' | 'processing' | 'success' | 'error';

interface BiometricTemplateResponse {
  template_type: string;
}

function resolveErrorMessage(error: unknown) {
  if (error instanceof FaceBiometricUnavailableError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Đã xảy ra lỗi không xác định';
}

export default function EnrollBiometric() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<EnrollmentStep>('camera');
  const [message, setMessage] = useState('Khởi động camera...');
  const [progress, setProgress] = useState(0);
  const [capturedData, setCapturedData] = useState<FaceDetectionResult | null>(null);
  const [livenessResult, setLivenessResult] = useState<LivenessCheckResult | null>(null);
  const [enrolledTemplates, setEnrolledTemplates] = useState<string[]>([]);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [error, setError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const stream = await requestPreferredCameraStream({
        facingMode: 'user',
        width: 1280,
        height: 720,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setMessage('Camera sẵn sàng. Nhấn nút để bắt đầu đăng ký.');
      setStep('camera');
    } catch (err: unknown) {
      setError(getCameraAccessErrorMessage(err));
      setStep('error');
    }
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const loadEnrolledTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/biometric/enroll');
      if (res.ok) {
        const data = await res.json();
        const templates = (data.templates || []) as BiometricTemplateResponse[];
        const types = templates.map((template) => template.template_type);
        setEnrolledTemplates(types);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  useEffect(() => {
    void startCamera();
    void loadEnrolledTemplates();

    return () => {
      stopCamera();
    };
  }, [loadEnrolledTemplates, startCamera]);

  const handleEnroll = async () => {
    if (!videoRef.current) return;

    try {
      if (!FACE_BIOMETRIC_RUNTIME_ENABLED) {
        throw new FaceBiometricUnavailableError();
      }

      setStep('capturing');
      setMessage('Đang chụp khuôn mặt...');
      setProgress(20);

      const result = await detectSingleEmbedding(videoRef.current);

      if (!result) {
        setError('Không phát hiện khuôn mặt. Vui lòng đảm bảo mặt của bạn nằm trong khung hình.');
        setStep('error');
        return;
      }

      if (result.qualityScore < 60) {
        setError(
          `Chất lượng ảnh quá thấp (${result.qualityScore.toFixed(0)}/100). Vui lòng đảm bảo ánh sáng tốt và camera rõ nét.`
        );
        setStep('error');
        return;
      }

      setCapturedData(result);
      setProgress(40);

      setStep('liveness');
      setMessage('Vui lòng nhấp nháy mắt và cử động đầu nhẹ...');
      setProgress(50);

      const liveness = await performLivenessCheck(videoRef.current, 10, 100);
      setLivenessResult(liveness);
      setProgress(70);

      if (!liveness.passed) {
        setError(`Kiểm tra liveness không thành công: ${liveness.details.join(', ')}`);
        setStep('error');
        return;
      }

      setStep('processing');
      setMessage('Đang lưu dữ liệu sinh trắc học...');
      setProgress(80);

      const templateType = result.hasMask ? 'face_masked' : 'face';

      const enrollRes = await fetch('/api/biometric/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType,
          embedding: result.embedding,
          qualityScore: result.qualityScore,
          metadata: {
            hasMask: result.hasMask,
            livenessScore: liveness.score,
            enrolledAt: new Date().toISOString(),
          },
        }),
      });

      if (!enrollRes.ok) {
        const enrollError = (await enrollRes.json()) as { message?: string; error?: string };
        throw new Error(
          enrollError.message || enrollError.error || 'Đăng ký sinh trắc học thất bại'
        );
      }

      setProgress(100);
      setStep('success');
      setMessage(`Đăng ký thành công. Template: ${templateType}`);

      await loadEnrolledTemplates();
    } catch (err: unknown) {
      setError(resolveErrorMessage(err));
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('camera');
    setMessage('Camera sẵn sàng. Nhấn nút để bắt đầu đăng ký.');
    setProgress(0);
    setCapturedData(null);
    setLivenessResult(null);
    setError('');
  };

  const handleDeleteTemplate = async (templateType: string) => {
    try {
      const res = await fetch(`/api/biometric/enroll?type=${templateType}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Đã xóa template');
        await loadEnrolledTemplates();
      } else {
        const deleteError = (await res.json()) as { error?: string };
        toast.error(`Lỗi: ${deleteError.error || 'Không thể xóa template'}`);
      }
    } catch (err: unknown) {
      toast.error(`Lỗi: ${resolveErrorMessage(err)}`);
    }
  };

  const getTemplateLabel = (templateType: string) => {
    switch (templateType) {
      case 'face':
        return 'khuôn mặt thường';
      case 'face_masked':
        return 'khuôn mặt đeo khẩu trang';
      case 'iris_left':
        return 'mắt trái';
      case 'iris_right':
        return 'mắt phải';
      default:
        return templateType;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Đăng ký sinh trắc học khuôn mặt</h1>

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Tính năng đăng ký khuôn mặt hiện đang tạm tắt trong bản phát hành này để đảm bảo an toàn và
        ổn định hệ thống.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {capturedData && (
              <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded text-sm">
                Chất lượng: {capturedData.qualityScore.toFixed(0)}/100
                {capturedData.hasMask && ' (đeo khẩu trang)'}
              </div>
            )}
          </div>

          {step !== 'camera' && step !== 'error' && (
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

          {step === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={handleReset}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Thử lại
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">{message}</p>
              <p className="text-sm text-gray-600 mt-2">
                Độ chính xác: {capturedData?.qualityScore.toFixed(0)}/100 | Liveness:{' '}
                {livenessResult?.score}/100
              </p>
              <button
                onClick={handleReset}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Đăng ký thêm
              </button>
            </div>
          )}

          {step === 'camera' && (
            <button
              onClick={handleEnroll}
              disabled
              className="w-full px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed font-medium"
            >
              Đăng ký khuôn mặt tạm không khả dụng
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Hướng dẫn</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Đảm bảo ánh sáng đủ sáng</li>
              <li>• Đặt mặt chính diện camera</li>
              <li>• Hệ thống sẽ tự động phát hiện khẩu trang</li>
              <li>• Nhấp nháy mắt khi được yêu cầu</li>
              <li>• Cử động đầu nhẹ để xác nhận</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Đã đăng ký</h3>
            {enrolledTemplates.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có template nào</p>
            ) : (
              <div className="space-y-2">
                {enrolledTemplates.map((type) => (
                  <div
                    key={type}
                    className="flex items-center justify-between bg-white p-2 rounded border"
                  >
                    <span className="text-sm font-medium">{getTemplateLabel(type)}</span>
                    <button
                      onClick={() => setTemplateToDelete(type)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {livenessResult && (
            <div
              className={`border rounded-lg p-4 ${
                livenessResult.passed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <h3 className="font-semibold mb-2">Kiểm tra liveness: {livenessResult.score}/100</h3>
              <ul className="text-sm space-y-1">
                {livenessResult.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={templateToDelete !== null}
        title="Xóa mẫu sinh trắc học"
        message={
          templateToDelete
            ? `Bạn có chắc chắn muốn xóa mẫu ${getTemplateLabel(templateToDelete)} không?`
            : ''
        }
        confirmText="Xóa mẫu"
        cancelText="Hủy"
        variant="danger"
        onCancel={() => setTemplateToDelete(null)}
        onConfirm={async () => {
          if (!templateToDelete) return;
          await handleDeleteTemplate(templateToDelete);
          setTemplateToDelete(null);
        }}
      />
    </div>
  );
}
