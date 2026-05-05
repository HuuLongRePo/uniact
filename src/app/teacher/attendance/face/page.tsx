'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { PendingAttendanceRoster } from '@/components/attendance/PendingAttendanceRoster';
import {
  detectSingleEmbedding,
  performLivenessCheck,
  FaceBiometricUnavailableError,
  FaceDetectionError,
  FACE_BIOMETRIC_RUNTIME_ENABLED,
} from '@/lib/biometrics/face-runtime';
import { getCameraAccessErrorMessage, requestPreferredCameraStream } from '@/lib/camera-stream';

function getCameraCaptureErrorMessage(error: unknown) {
  if (error instanceof FaceBiometricUnavailableError) {
    return error.message;
  }

  if (error instanceof FaceDetectionError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return getCameraAccessErrorMessage(error) || 'Khong the lay candidate tu camera';
}

function normalizeEmbeddingDraft(input: string): number[] {
  const normalized = input
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));

  if (normalized.length < 3) {
    throw new Error('Candidate embedding qua ngan de tao preview');
  }

  return normalized;
}

function parsePositiveIntegerDraft(input: string): number | null {
  const normalized = Number(input.trim());
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null;
  }
  return normalized;
}

type CandidatePreviewPayload = {
  candidate_embedding: number[];
  quality_score?: number;
  liveness_score?: number;
  verification_method?: string;
  upstream_verified?: boolean;
  [key: string]: unknown;
};

type FaceAttendanceSubmitResult = {
  recorded?: boolean;
  verification_source?: string;
  verification_method?: string;
  runtime_mode?: string;
  [key: string]: unknown;
};

type ActivityParticipant = {
  id: number;
  student_id: number;
  student_name: string;
  student_code?: string;
  class_name?: string;
  attendance_status: 'registered' | 'attended' | 'absent';
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'emerald' | 'amber';
}) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-700'
        : 'border-blue-100 bg-blue-50 text-blue-700';

  return (
    <div className={`rounded-[1.5rem] border p-4 shadow-sm ${toneClasses}`}>
      <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function TeacherFaceAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activityId, setActivityId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [confidenceScore, setConfidenceScore] = useState('0.95');
  const [embeddingInput, setEmbeddingInput] = useState('0.1, 0.2, 0.3');
  const [qualityScore, setQualityScore] = useState('75');
  const [livenessScore, setLivenessScore] = useState('0.91');
  const [deviceId, setDeviceId] = useState('cam-a1');
  const [preview, setPreview] = useState<CandidatePreviewPayload | null>(null);
  const [submitResult, setSubmitResult] = useState<FaceAttendanceSubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [participants, setParticipants] = useState<ActivityParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const refreshParticipants = async (targetActivityId = activityId, silent = false) => {
    const normalizedActivityId = parsePositiveIntegerDraft(targetActivityId);
    if (!normalizedActivityId) {
      setParticipants([]);
      setParticipantsError(null);
      setParticipantsLoading(false);
      return;
    }

    try {
      if (!silent) {
        setParticipantsLoading(true);
      }
      setParticipantsError(null);

      const res = await fetch(`/api/activities/${normalizedActivityId}/participants`);
      if (!res.ok) {
        throw new Error('Khong the tai danh sach hoc vien tham gia');
      }

      const data = await res.json();
      setParticipants(data.participations || data.data?.participations || []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Khong the tai danh sach hoc vien tham gia';
      setParticipantsError(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      if (!silent) {
        setParticipantsLoading(false);
      }
    }
  };

  useEffect(() => {
    const normalizedActivityId = parsePositiveIntegerDraft(activityId);
    setParticipantsError(null);
    setSubmitError(null);
    setSubmitResult(null);

    if (!normalizedActivityId) {
      setParticipants([]);
      setParticipantsLoading(false);
      setStudentId('');
      return;
    }

    void refreshParticipants(activityId);
  }, [activityId]);

  useEffect(() => {
    if (participants.length === 0) {
      return;
    }

    const hasCurrentStudent = participants.some(
      (participant) => String(participant.student_id) === studentId
    );
    if (hasCurrentStudent) {
      return;
    }

    const preferredParticipant =
      participants.find((participant) => participant.attendance_status === 'registered') ??
      participants[0];
    setStudentId(String(preferredParticipant.student_id));
  }, [participants, studentId]);

  useEffect(() => {
    if (!submitResult) return;

    const interval = setInterval(() => {
      void refreshParticipants(activityId, true);
    }, 5000);

    return () => clearInterval(interval);
  }, [submitResult, activityId]);

  const startCamera = async () => {
    const stream = await requestPreferredCameraStream({
      facingMode: 'user',
      width: 1280,
      height: 720,
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
        throw new Error('Camera chua san sang');
      }

      const result = await detectSingleEmbedding(videoRef.current);
      if (!result) {
        throw new FaceDetectionError(
          'NO_FACE_DETECTED',
          'Khong phat hien duoc khuon mat nao de tao candidate embedding'
        );
      }

      if (result.landmarks?.positions && result.landmarks.positions.length > 120) {
        throw new FaceDetectionError(
          'MULTIPLE_FACES_DETECTED',
          'Phat hien nhieu khuon mat, hay chi giu mot nguoi trong khung hinh'
        );
      }

      if (result.detection?.box?.width && result.detection.box.width < 80) {
        throw new FaceDetectionError(
          'LOW_IMAGE_QUALITY',
          'Khuon mat qua nho de tao candidate embedding on dinh'
        );
      }

      const liveness = await performLivenessCheck(videoRef.current, 5, 80);
      if (result.qualityScore < 60) {
        throw new Error('Anh tu camera chua du ro de tao candidate embedding');
      }
      if (liveness.status === 'runtime_unavailable') {
        throw new FaceBiometricUnavailableError(
          liveness.details?.[0] || 'Liveness runtime hien chua kha dung de tao candidate embedding'
        );
      }

      if (!liveness.passed || liveness.status === 'insufficient_signal' || liveness.score < 0.7) {
        throw new Error(
          liveness.details?.[0] || 'Liveness check tu camera chua du de tao candidate embedding'
        );
      }

      setEmbeddingInput(result.embedding.join(', '));
      setQualityScore(String(result.qualityScore));
      setLivenessScore(String(liveness.score));
      toast.success('Da lay candidate embedding tu camera');
    } catch (error) {
      toast.error(getCameraCaptureErrorMessage(error));
    } finally {
      setCapturing(false);
    }
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const embedding = normalizeEmbeddingDraft(embeddingInput);

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
        throw new Error(data?.error || data?.message || 'Khong the tao candidate preview');
      }
      setPreview(data?.data || null);
      setSubmitResult(null);
      setSubmitError(null);
      toast.success('Da tao candidate preview');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong the tao candidate preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!preview?.candidate_embedding) {
      toast.error('Hay tao candidate preview truoc khi gui face attendance');
      return;
    }

    const normalizedActivityId = parsePositiveIntegerDraft(activityId);
    if (!normalizedActivityId) {
      toast.error('Hay nhap Activity ID hop le de tai roster');
      return;
    }

    const normalizedStudentId = parsePositiveIntegerDraft(studentId);
    if (!normalizedStudentId) {
      toast.error('Hay chon hoc vien muc tieu truoc khi gui face attendance');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await fetch('/api/attendance/face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: normalizedActivityId,
          student_id: normalizedStudentId,
          confidence_score: Number(confidenceScore),
          device_id: deviceId,
          upstream_verified: false,
          candidate_embedding: preview.candidate_embedding,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || data?.message || 'Khong the gui face attendance';
        setSubmitError(message);
        throw new Error(message);
      }
      setSubmitResult(data?.data || null);
      setSubmitError(null);
      void refreshParticipants(activityId);
      toast.success('Da gui face attendance thanh cong');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Khong the gui face attendance');
      setSubmitResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  const previewState = preview ? 'San sang gui verify' : 'Chua tao preview';
  const verificationBranch =
    submitResult?.verification_method || preview?.verification_method || 'Chua co';
  const submitState = submitResult ? 'Da verify' : submitError ? 'Verify that bai' : 'Chua submit';
  const normalizedActivityId = parsePositiveIntegerDraft(activityId);
  const selectedParticipant = participants.find(
    (participant) => String(participant.student_id) === studentId
  );

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                Candidate preview + face attendance
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Diem danh khuon mat</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Day la man van hanh de tao candidate embedding, preview payload va day sang route
                face attendance theo dung quy trinh kiem tra liveness.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[28rem]">
              <SummaryCard label="Preview" value={previewState} tone="blue" />
              <SummaryCard label="Verify branch" value={verificationBranch} tone="emerald" />
              <SummaryCard label="Submit" value={submitState} tone="amber" />
            </div>
          </div>
        </section>

        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-violet-800">
                  <Sparkles className="h-4 w-4" />
                  Quy tac nhan dien khuon mat
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-violet-900">
                  <li>Chi giu mot khuon mat trong khung hinh cho moi lan capture.</li>
                  <li>Neu anh mo, khuon mat qua nho hoac liveness thap, he thong se tu choi preview.</li>
                  <li>
                    Khoi hoc vien chua diem danh ben duoi giup giang vien goi ten va xu ly bo sung.
                  </li>
                </ul>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Camera candidate capture</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Dung camera de lay candidate embedding thu nghiem. Van giu fallback nhap tay de QA.
                  </p>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-black aspect-video max-w-3xl">
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCaptureFromCamera()}
                    disabled={capturing}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Camera className="h-4 w-4" />
                    {capturing ? 'Dang lay candidate tu camera...' : 'Lay candidate tu camera'}
                  </button>
                  {!FACE_BIOMETRIC_RUNTIME_ENABLED ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Runtime camera hien dang o che do gated. Man nay van huu ich de QA payload va closeout.
                    </div>
                  ) : null}
                </div>
              </div>

                <div className="grid gap-4 lg:grid-cols-2">
                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Candidate embedding</span>
                  <textarea
                    value={embeddingInput}
                    onChange={(e) => setEmbeddingInput(e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Activity ID</span>
                  <input
                    value={activityId}
                    onChange={(e) => setActivityId(e.target.value)}
                    placeholder="Vi du: 94"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Student ID</span>
                  <input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Chon tu roster hoac nhap tay"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Chon hoc vien tu roster
                  </span>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={!normalizedActivityId || participantsLoading || participants.length === 0}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      {!normalizedActivityId
                        ? 'Nhap Activity ID truoc de tai roster'
                        : participantsLoading
                          ? 'Dang tai roster...'
                          : participants.length === 0
                            ? 'Chua co hoc vien trong roster'
                            : 'Chon hoc vien muc tieu'}
                    </option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.student_id}>
                        {participant.student_name} - {participant.student_code || `ID ${participant.student_id}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Confidence score</span>
                  <input
                    value={confidenceScore}
                    onChange={(e) => setConfidenceScore(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Quality score</span>
                  <input
                    value={qualityScore}
                    onChange={(e) => setQualityScore(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Liveness score</span>
                  <input
                    value={livenessScore}
                    onChange={(e) => setLivenessScore(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Device ID</span>
                  <input
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Roster readiness</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Nhap Activity ID hop le de tai roster, sau do chon hoc vien truoc khi gui verify.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshParticipants(activityId)}
                    disabled={!normalizedActivityId || participantsLoading}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {participantsLoading ? 'Dang tai roster...' : 'Tai lai roster'}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Activity
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {normalizedActivityId ? `#${normalizedActivityId}` : 'Chua chon'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Roster
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{participants.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hoc vien muc tieu
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedParticipant ? selectedParticipant.student_name : studentId || 'Chua chon'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <ScanFace className="h-4 w-4" />
                  {loading ? 'Dang tao preview...' : 'Tao candidate preview'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitAttendance()}
                  disabled={submitting || !preview?.candidate_embedding}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {submitting ? 'Dang gui face attendance...' : 'Gui face attendance'}
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <section className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                <h2 className="text-lg font-semibold">Payload preview</h2>
                {preview ? (
                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(preview, null, 2)}
                  </pre>
                ) : (
                  <p className="mt-4 text-sm text-slate-300">
                    Chua co candidate preview nao duoc tao.
                  </p>
                )}
              </section>

              <section className="rounded-[1.5rem] border border-emerald-300 bg-emerald-950 p-5 text-white shadow-sm">
                <h2 className="text-lg font-semibold">Ket qua face attendance</h2>
                {submitResult ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-emerald-800 bg-emerald-900/40 p-4 text-sm">
                      <div>Recorded: {String(Boolean(submitResult.recorded))}</div>
                      <div>Verification source: {submitResult.verification_source || 'N/A'}</div>
                      <div>Verification method: {submitResult.verification_method || 'N/A'}</div>
                      <div>Runtime mode: {submitResult.runtime_mode || 'N/A'}</div>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(submitResult, null, 2)}
                    </pre>
                  </div>
                ) : submitError ? (
                  <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-950/40 p-4 text-sm text-rose-200">
                    {submitError}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-emerald-200">Chua co ket qua submit face attendance.</p>
                )}
              </section>

              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">Huong dan van hanh</h2>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
                  <li>Tao preview truoc, kiem tra payload roi moi gui face attendance.</li>
                  <li>Neu confidence thap hoac liveness fail, can capture lai ngay tren camera.</li>
                  <li>Sau khi submit thanh cong, doi chieu roster ben duoi de xu ly hoc vien con sot.</li>
                </ul>
              </section>
            </div>
          </div>
        </section>

        <PendingAttendanceRoster
          participants={participants}
          loading={participantsLoading}
          error={participantsError}
          title={
            normalizedActivityId
              ? `Hoc vien chua diem danh - hoat dong ${normalizedActivityId}`
              : 'Hoc vien chua diem danh'
          }
        />

        {submitError ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              Verify that bai
            </div>
            <p className="mt-2 text-sm text-rose-800">{submitError}</p>
          </section>
        ) : submitResult ? (
          <section className="page-surface rounded-[1.75rem] border-emerald-200 bg-emerald-50 px-5 py-5 sm:px-7">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Da verify
            </div>
            <p className="mt-2 text-sm text-emerald-800">
              Face attendance da duoc gui thanh cong. Hay doi chieu them voi roster chua diem danh.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
