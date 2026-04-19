'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  detectSingleEmbedding,
  performLivenessCheck,
  FaceBiometricUnavailableError,
  FACE_BIOMETRIC_RUNTIME_ENABLED,
} from '@/lib/biometrics/face-runtime';

export default function TeacherFaceAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activityId, setActivityId] = useState('94');
  const [studentId, setStudentId] = useState('3004');
  const [confidenceScore, setConfidenceScore] = useState('0.95');
  const [embeddingInput, setEmbeddingInput] = useState('0.1, 0.2, 0.3');
  const [qualityScore, setQualityScore] = useState('75');
  const [livenessScore, setLivenessScore] = useState('0.91');
  const [deviceId, setDeviceId] = useState('cam-a1');
  const [preview, setPreview] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('Trình duyệt không hỗ trợ camera');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    streamRef.current = stream;
  };

  const handleCaptureFromCamera = async () => {
    try {
      if (!FACE_BIOMETRIC_RUNTIME_ENABLED) {
        throw new FaceBiometricUnavailableError();
      }
      setCapturing(true);
      await startCamera();
      if (!videoRef.current) {
        throw new Error('Camera chưa sẵn sàng');
      }

      const result = await detectSingleEmbedding(videoRef.current);
      if (!result) {
        throw new Error('Không thể tạo candidate embedding từ camera');
      }

      const liveness = await performLivenessCheck(videoRef.current, 5, 80);
      setEmbeddingInput(result.embedding.join(', '));
      setQualityScore(String(result.qualityScore));
      setLivenessScore(String(liveness.score));
      toast.success('Đã lấy candidate embedding từ camera');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lấy candidate từ camera');
    } finally {
      setCapturing(false);
    }
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const embedding = embeddingInput
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value));

      const res = await fetch('/api/biometric/candidate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding,
          qualityScore: Number(qualityScore),
          livenessScore: Number(livenessScore),
          deviceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Không thể tạo candidate preview');
      }
      setPreview(data?.data || null);
      setSubmitResult(null);
      setSubmitError(null);
      toast.success('Đã tạo candidate preview');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo candidate preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!preview?.candidate_embedding) {
      toast.error('Hãy tạo candidate preview trước khi gửi face attendance');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/attendance/face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: Number(activityId),
          student_id: Number(studentId),
          confidence_score: Number(confidenceScore),
          device_id: deviceId,
          upstream_verified: false,
          candidate_embedding: preview.candidate_embedding,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || data?.message || 'Không thể gửi face attendance';
        setSubmitError(message);
        throw new Error(message);
      }
      setSubmitResult(data?.data || null);
      setSubmitError(null);
      toast.success('Đã gửi face attendance thành công');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi face attendance');
      setSubmitResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Candidate preview cho face attendance</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tạo payload candidate embedding chuẩn trước khi đẩy sang face attendance runtime.
        </p>
      </div>

      <div className="rounded-lg bg-white shadow p-6 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Camera candidate capture</h2>
            <p className="text-sm text-slate-600">
              Dùng camera để bơm candidate embedding thử nghiệm, vẫn giữ fallback nhập tay để QA.
            </p>
          </div>
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-w-xl">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => void handleCaptureFromCamera()}
            disabled={capturing}
            className="rounded bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:bg-gray-400"
          >
            {capturing ? 'Đang lấy candidate từ camera...' : 'Lấy candidate từ camera'}
          </button>
          {!FACE_BIOMETRIC_RUNTIME_ENABLED ? (
            <p className="text-sm text-amber-700">
              Runtime camera hiện vẫn đang ở chế độ gated, nên đây là groundwork để nối flow thật ở batch sau.
            </p>
          ) : null}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Candidate embedding</label>
          <textarea
            value={embeddingInput}
            onChange={(e) => setEmbeddingInput(e.target.value)}
            rows={4}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity ID</label>
            <input
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confidence score</label>
            <input
              value={confidenceScore}
              onChange={(e) => setConfidenceScore(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quality score</label>
            <input
              value={qualityScore}
              onChange={(e) => setQualityScore(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Liveness score</label>
            <input
              value={livenessScore}
              onChange={(e) => setLivenessScore(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Device ID</label>
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handlePreview()}
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Đang tạo preview...' : 'Tạo candidate preview'}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmitAttendance()}
            disabled={submitting || !preview?.candidate_embedding}
            className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:bg-gray-400"
          >
            {submitting ? 'Đang gửi face attendance...' : 'Gửi face attendance'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-500">Preview status</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">
            {preview ? 'Sẵn sàng gửi verify' : 'Chưa tạo preview'}
          </div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm text-emerald-700">Verification branch</div>
          <div className="mt-2 text-lg font-semibold text-emerald-900">
            {submitResult?.verification_method || preview?.verification_method || 'Chưa có'}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-amber-700">Submit status</div>
          <div className="mt-2 text-lg font-semibold text-amber-900">
            {submitResult ? 'Đã verify' : submitError ? 'Verify thất bại' : 'Chưa submit'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg bg-slate-900 p-6 text-white">
          <h2 className="text-lg font-semibold mb-3">Payload preview</h2>
          {preview ? (
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(preview, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-slate-300">Chưa có candidate preview nào được tạo.</p>
          )}
        </div>

        <div className="rounded-lg bg-emerald-950 p-6 text-white">
          <h2 className="text-lg font-semibold mb-3">Kết quả face attendance</h2>
          {submitResult ? (
            <div className="space-y-4">
              <div className="rounded border border-emerald-800 bg-emerald-900/40 p-4 text-sm">
                <div>Recorded: {String(Boolean(submitResult.recorded))}</div>
                <div>Verification source: {submitResult.verification_source || 'N/A'}</div>
                <div>Verification method: {submitResult.verification_method || 'N/A'}</div>
                <div>Runtime mode: {submitResult.runtime_mode || 'N/A'}</div>
              </div>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(submitResult, null, 2)}
              </pre>
            </div>
          ) : submitError ? (
            <div className="rounded border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
              {submitError}
            </div>
          ) : (
            <p className="text-sm text-emerald-200">Chưa có kết quả submit face attendance.</p>
          )}
        </div>
      </div>
    </main>
  );
}
