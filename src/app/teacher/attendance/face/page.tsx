'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function TeacherFaceAttendancePage() {
  const [activityId, setActivityId] = useState('94');
  const [studentId, setStudentId] = useState('3004');
  const [confidenceScore, setConfidenceScore] = useState('0.95');
  const [embeddingInput, setEmbeddingInput] = useState('0.1, 0.2, 0.3');
  const [qualityScore, setQualityScore] = useState('75');
  const [livenessScore, setLivenessScore] = useState('0.91');
  const [deviceId, setDeviceId] = useState('cam-a1');
  const [preview, setPreview] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        throw new Error(data?.error || data?.message || 'Không thể gửi face attendance');
      }
      setSubmitResult(data?.data || null);
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
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(submitResult, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-emerald-200">Chưa có kết quả submit face attendance.</p>
          )}
        </div>
      </div>
    </main>
  );
}
