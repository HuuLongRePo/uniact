'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';

type ActivityOption = {
  id: number;
  title: string;
  status?: string | null;
  approval_status?: string | null;
  date_time?: string | null;
  max_participants?: number | null;
};

type AttendancePolicyResponse = {
  activity: ActivityOption;
  counts: {
    participation_count: number;
    mandatory_class_count: number;
    voluntary_class_count: number;
  };
  policy: {
    version: string;
    defaultMode: 'manual' | 'qr' | 'face' | 'mixed';
    qrFallback: {
      preset: string;
      responseTimeP95Ms: number;
      queueBacklog: number;
      scanFailureRate: number;
      minSampleSize: number;
      allowTeacherManualOverride: boolean;
    };
    facePilot: {
      eligible: boolean;
      recommendedMode: 'manual' | 'qr' | 'face' | 'mixed';
      preferredPrimaryMethod: 'manual' | 'qr' | 'face';
      reasons: string[];
      teacherManualOverride: boolean;
      minConfidenceScore: number;
      selectionMode: 'heuristic_only' | 'selected_only' | 'selected_or_heuristic';
      selectedByConfig: boolean;
    };
  };
};

type FallbackResponse = {
  activity: Pick<ActivityOption, 'id' | 'title'>;
  metrics: {
    responseTimeP95Ms: number | null;
    queueBacklog: number | null;
    scanFailureRate: number | null;
    sampleSize: number | null;
  };
  fallback: {
    triggered: boolean;
    reasons: string[];
    recommended_target_mode: 'manual' | 'qr' | 'face' | 'mixed';
    teacher_manual_override: boolean;
  };
};

export default function TeacherAttendancePolicyPage() {
  const searchParams = useSearchParams();
  const requestedActivityId = Number(searchParams.get('activityId') || '0') || null;
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [policyData, setPolicyData] = useState<AttendancePolicyResponse | null>(null);
  const [fallbackData, setFallbackData] = useState<FallbackResponse | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [loadingFallback, setLoadingFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [responseTimeP95Ms, setResponseTimeP95Ms] = useState('1700');
  const [queueBacklog, setQueueBacklog] = useState('30');
  const [scanFailureRate, setScanFailureRate] = useState('0.2');
  const [sampleSize, setSampleSize] = useState('25');

  useEffect(() => {
    let cancelled = false;

    const loadActivities = async () => {
      try {
        setLoadingActivities(true);
        setError(null);

        const query = requestedActivityId ? `?activity_id=${requestedActivityId}` : '';
        const response = await fetch(resolveClientFetchUrl(`/api/teacher/attendance/pilot-activities${query}`));
        if (!response.ok) {
          throw new Error('Không tải được danh sách hoạt động');
        }

        const body = await response.json();
        const rawActivities = body?.data?.activities ?? body?.activities ?? [];
        const normalized = rawActivities.map((row: any) => ({
          id: Number(row.id),
          title: row.title,
          status: row.status ?? null,
          approval_status: row.approval_status ?? null,
          date_time: row.date_time ?? null,
          max_participants: row.max_participants ?? null,
        }));

        if (!cancelled) {
          setActivities(normalized);
          if (normalized.length > 0) {
            setSelectedActivityId((current) => {
              if (requestedActivityId && normalized.some((activity) => activity.id === requestedActivityId)) {
                return requestedActivityId;
              }
              return current ?? normalized[0].id;
            });
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu hoạt động');
        }
      } finally {
        if (!cancelled) {
          setLoadingActivities(false);
        }
      }
    };

    void loadActivities();

    return () => {
      cancelled = true;
    };
  }, [requestedActivityId]);

  useEffect(() => {
    if (!selectedActivityId) {
      setPolicyData(null);
      return;
    }

    let cancelled = false;

    const loadPolicy = async () => {
      try {
        setLoadingPolicy(true);
        setFallbackData(null);
        const response = await fetch(
          resolveClientFetchUrl(`/api/activities/${selectedActivityId}/attendance-policy`)
        );
        if (!response.ok) {
          throw new Error('Không tải được attendance policy');
        }
        const body = await response.json();
        if (!cancelled) {
          setPolicyData(body?.data ?? body);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Không tải được attendance policy');
        }
      } finally {
        if (!cancelled) {
          setLoadingPolicy(false);
        }
      }
    };

    void loadPolicy();

    return () => {
      cancelled = true;
    };
  }, [selectedActivityId]);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) ?? null,
    [activities, selectedActivityId]
  );

  const evaluateFallback = async () => {
    if (!selectedActivityId) return;

    try {
      setLoadingFallback(true);
      const response = await fetch(
        resolveClientFetchUrl(`/api/activities/${selectedActivityId}/attendance-policy/fallback`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            responseTimeP95Ms: Number(responseTimeP95Ms),
            queueBacklog: Number(queueBacklog),
            scanFailureRate: Number(scanFailureRate),
            sampleSize: Number(sampleSize),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Không đánh giá được QR fallback');
      }

      const body = await response.json();
      setFallbackData(body?.data ?? body);
    } catch (fallbackError) {
      setError(fallbackError instanceof Error ? fallbackError.message : 'Không đánh giá được fallback');
    } finally {
      setLoadingFallback(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" data-testid="attendance-policy-heading">Attendance Policy / Face Pilot</h1>
        <p className="mt-2 text-sm text-gray-600">
          Xem activity nào đủ điều kiện pilot face attendance và kiểm tra ngưỡng fallback QR theo preset vận hành.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Hoạt động</h2>
            {loadingActivities ? <span className="text-xs text-gray-500">Đang tải…</span> : null}
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto">
            {activities.length === 0 && !loadingActivities ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-sm text-gray-500">
                Chưa có hoạt động nào để đánh giá policy.
              </div>
            ) : null}

            {activities.map((activity) => {
              const isSelected = activity.id === selectedActivityId;
              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => setSelectedActivityId(activity.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{activity.title}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    status: {activity.status ?? 'unknown'} · approval: {activity.approval_status ?? 'unknown'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    max participants: {activity.max_participants ?? '—'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Policy hiện tại</h2>
                <p className="text-sm text-gray-500">
                  {selectedActivity ? `Activity #${selectedActivity.id} — ${selectedActivity.title}` : 'Chưa chọn hoạt động'}
                </p>
              </div>
              {loadingPolicy ? <span className="text-xs text-gray-500">Đang tải policy…</span> : null}
            </div>

            {policyData ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Policy version</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{policyData.policy.version}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Default mode</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">{policyData.policy.defaultMode}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Primary method</div>
                    <div className="mt-1 text-base font-semibold text-gray-900">
                      {policyData.policy.facePilot.preferredPrimaryMethod}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Face pilot</div>
                    <div data-testid="face-pilot-eligibility" className={`mt-1 text-base font-semibold ${policyData.policy.facePilot.eligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {policyData.policy.facePilot.eligible ? 'Eligible' : 'Chưa đủ điều kiện'}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 p-3 text-sm">
                    <div className="text-gray-500">Participation</div>
                    <div className="mt-1 font-semibold text-gray-900">{policyData.counts.participation_count}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 text-sm">
                    <div className="text-gray-500">Mandatory classes</div>
                    <div className="mt-1 font-semibold text-gray-900">{policyData.counts.mandatory_class_count}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 text-sm">
                    <div className="text-gray-500">Voluntary classes</div>
                    <div className="mt-1 font-semibold text-gray-900">{policyData.counts.voluntary_class_count}</div>
                  </div>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="text-sm font-semibold text-blue-900">QR fallback preset</div>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800">
                    <li>preset: {policyData.policy.qrFallback.preset}</li>
                    <li>p95 response time: {policyData.policy.qrFallback.responseTimeP95Ms} ms</li>
                    <li>queue backlog: {policyData.policy.qrFallback.queueBacklog}</li>
                    <li>scan failure rate: {(policyData.policy.qrFallback.scanFailureRate * 100).toFixed(0)}%</li>
                    <li>sample size tối thiểu: {policyData.policy.qrFallback.minSampleSize}</li>
                    <li>manual override: {policyData.policy.qrFallback.allowTeacherManualOverride ? 'cho phép' : 'không'}</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm font-semibold text-emerald-900">Face pilot reasons</div>
                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 text-sm text-emerald-900">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">selection mode</div>
                      <div className="mt-1 font-semibold">{policyData.policy.facePilot.selectionMode}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 text-sm text-emerald-900">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">selected by config</div>
                      <div className="mt-1 font-semibold">{policyData.policy.facePilot.selectedByConfig ? 'có' : 'không'}</div>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white/70 p-3 text-sm text-emerald-900">
                      <div className="text-xs uppercase tracking-wide text-emerald-700">min confidence</div>
                      <div className="mt-1 font-semibold">{policyData.policy.facePilot.minConfidenceScore.toFixed(2)}</div>
                    </div>
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-emerald-800">
                    {policyData.policy.facePilot.reasons.length > 0 ? (
                      policyData.policy.facePilot.reasons.map((reason) => <li key={reason}>{reason}</li>)
                    ) : (
                      <li>Chưa đủ điều kiện pilot theo preset hiện tại.</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 px-3 py-8 text-sm text-gray-500">
                Chọn một hoạt động để xem attendance policy.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Evaluate fallback theo runtime metrics</h2>
              <p className="text-sm text-gray-500">
                Công cụ này giúp teacher/admin ước lượng khi nào nên chuyển từ QR sang mixed/manual theo preset pilot hiện tại.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm text-gray-700">
                p95 response time (ms)
                <input value={responseTimeP95Ms} onChange={(e) => setResponseTimeP95Ms(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="text-sm text-gray-700">
                queue backlog
                <input value={queueBacklog} onChange={(e) => setQueueBacklog(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="text-sm text-gray-700">
                scan failure rate
                <input value={scanFailureRate} onChange={(e) => setScanFailureRate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              <label className="text-sm text-gray-700">
                sample size
                <input value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={evaluateFallback}
                disabled={!selectedActivityId || loadingFallback}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loadingFallback ? 'Đang đánh giá…' : 'Đánh giá fallback'}
              </button>
              {selectedActivityId ? <span className="text-xs text-gray-500">activity #{selectedActivityId}</span> : null}
            </div>

            {fallbackData ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                <div data-testid="fallback-status" className="font-semibold text-gray-900">
                  {fallbackData.fallback.triggered ? 'Nên fallback' : 'Chưa cần auto fallback'}
                </div>
                <div className="mt-1 text-gray-600">
                  recommended target mode: {fallbackData.fallback.recommended_target_mode}
                </div>
                <div className="mt-1 text-gray-600">
                  teacher manual override: {fallbackData.fallback.teacher_manual_override ? 'cho phép' : 'không'}
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                  {fallbackData.fallback.reasons.length > 0 ? (
                    fallbackData.fallback.reasons.map((reason) => <li key={reason}>{reason}</li>)
                  ) : (
                    <li>Không có threshold nào bị vượt trong preset hiện tại.</li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
