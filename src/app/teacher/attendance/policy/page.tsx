'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ScanFace, ShieldCheck, TimerReset } from 'lucide-react';
import { resolveClientFetchUrl } from '@/lib/client-fetch-url';
import { FACE_BIOMETRIC_RUNTIME_ENABLED } from '@/lib/biometrics/face-runtime';

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

function normalizeActivity(row: Record<string, unknown>): ActivityOption {
  return {
    id: Number(row.id),
    title: String(row.title ?? 'Hoat dong'),
    status: typeof row.status === 'string' ? row.status : null,
    approval_status: typeof row.approval_status === 'string' ? row.approval_status : null,
    date_time: typeof row.date_time === 'string' ? row.date_time : null,
    max_participants: typeof row.max_participants === 'number' ? row.max_participants : null,
  };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

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
        const response = await fetch(
          resolveClientFetchUrl(`/api/teacher/attendance/pilot-activities${query}`)
        );
        if (!response.ok) {
          throw new Error('Khong the tai danh sach hoat dong pilot');
        }

        const body = await response.json();
        const rawActivities = body?.data?.activities ?? body?.activities ?? [];
        const normalized = Array.isArray(rawActivities)
          ? rawActivities.map((row) => normalizeActivity(row as Record<string, unknown>))
          : [];

        if (cancelled) {
          return;
        }

        setActivities(normalized);
        if (normalized.length === 0) {
          setSelectedActivityId(null);
          return;
        }

        if (
          requestedActivityId &&
          normalized.some((activity) => activity.id === requestedActivityId)
        ) {
          setSelectedActivityId(requestedActivityId);
          return;
        }

        setSelectedActivityId((current) =>
          current && normalized.some((activity) => activity.id === current)
            ? current
            : normalized[0].id
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Khong the tai danh sach hoat dong pilot'
          );
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
      setFallbackData(null);
      return;
    }

    let cancelled = false;

    const loadPolicy = async () => {
      try {
        setLoadingPolicy(true);
        setError(null);
        setFallbackData(null);

        const response = await fetch(
          resolveClientFetchUrl(`/api/activities/${selectedActivityId}/attendance-policy`)
        );
        if (!response.ok) {
          throw new Error('Khong the tai attendance policy');
        }

        const body = await response.json();
        if (!cancelled) {
          setPolicyData((body?.data ?? body) as AttendancePolicyResponse);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Khong the tai attendance policy');
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

  useEffect(() => {
    if (!policyData) {
      return;
    }

    setResponseTimeP95Ms(String(policyData.policy.qrFallback.responseTimeP95Ms));
    setQueueBacklog(String(policyData.policy.qrFallback.queueBacklog));
    setScanFailureRate(String(policyData.policy.qrFallback.scanFailureRate));
    setSampleSize(String(policyData.policy.qrFallback.minSampleSize));
  }, [policyData]);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === selectedActivityId) ?? null,
    [activities, selectedActivityId]
  );

  const evaluateFallback = async () => {
    if (!selectedActivityId) {
      return;
    }

    try {
      setLoadingFallback(true);
      setError(null);

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
        throw new Error('Khong the danh gia QR fallback');
      }

      const body = await response.json();
      setFallbackData((body?.data ?? body) as FallbackResponse);
    } catch (fallbackError) {
      setError(
        fallbackError instanceof Error ? fallbackError.message : 'Khong the danh gia QR fallback'
      );
    } finally {
      setLoadingFallback(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Attendance policy + face pilot
              </div>
              <h1
                className="mt-3 text-3xl font-bold text-slate-900"
                data-testid="attendance-policy-heading"
              >
                Attendance policy / Face pilot
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Teacher dung man nay de xem hoat dong nao du dieu kien pilot face attendance va
                khi nao can fallback tu QR sang mixed hoac manual.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[30rem]">
              <StatCard label="Pilot activities" value={String(activities.length)} />
              <StatCard
                label="Selected activity"
                value={selectedActivity ? `#${selectedActivity.id}` : 'Chua chon'}
              />
              <StatCard
                label="Primary method"
                value={policyData?.policy.facePilot.preferredPrimaryMethod || 'Dang tai'}
              />
            </div>
          </div>
        </section>

        {!FACE_BIOMETRIC_RUNTIME_ENABLED ? (
          <section className="page-surface rounded-[1.75rem] border-amber-200 bg-amber-50 px-5 py-5 sm:px-7">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Face runtime chua bat
            </div>
            <p className="mt-2 text-sm text-amber-900">
              Runtime nhan dien khuon mat hien chua duoc bat trong ban phat hanh nay. Trang nay
              van huu ich de xac nhan readiness, pilot policy va nguong fallback truoc khi mo
              training anh va face attendance production.
            </p>
          </section>
        ) : null}

        {error ? (
          <section className="page-surface rounded-[1.75rem] border-rose-200 bg-rose-50 px-5 py-5 sm:px-7">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              Co loi khi tai policy
            </div>
            <p className="mt-2 text-sm text-rose-800">{error}</p>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)]">
          <div className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Hoat dong pilot</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Chon mot hoat dong de xem readiness cho face pilot va QR fallback.
                </p>
              </div>
              {loadingActivities ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Dang tai...
                </span>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              {activities.map((activity) => {
                const isSelected = activity.id === selectedActivityId;
                return (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => setSelectedActivityId(activity.id)}
                    className={`w-full rounded-[1.25rem] border p-4 text-left transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{activity.title}</div>
                    <div className="mt-2 text-sm text-slate-600">
                      Status: {activity.status || 'unknown'} | Approval:{' '}
                      {activity.approval_status || 'unknown'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Max participants: {activity.max_participants ?? 'N/A'}
                    </div>
                  </button>
                );
              })}

              {!loadingActivities && activities.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  Chua co hoat dong nao de danh gia attendance policy.
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Policy hien tai</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedActivity
                      ? `Activity #${selectedActivity.id} - ${selectedActivity.title}`
                      : 'Chon hoat dong o cot ben trai de xem policy'}
                  </p>
                </div>
                {loadingPolicy ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    Dang tai policy...
                  </span>
                ) : null}
              </div>

              {policyData ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 md:grid-cols-4">
                    <StatCard label="Policy version" value={policyData.policy.version} />
                    <StatCard label="Default mode" value={policyData.policy.defaultMode} />
                    <StatCard
                      label="Recommended mode"
                      value={policyData.policy.facePilot.recommendedMode}
                    />
                    <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Face pilot
                      </div>
                      <div
                        className="mt-2 text-xl font-bold text-slate-900"
                        data-testid="face-pilot-eligibility"
                      >
                        {policyData.policy.facePilot.eligible ? 'Eligible' : 'Not eligible'}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard
                      label="Participation"
                      value={String(policyData.counts.participation_count)}
                    />
                    <StatCard
                      label="Mandatory classes"
                      value={String(policyData.counts.mandatory_class_count)}
                    />
                    <StatCard
                      label="Voluntary classes"
                      value={String(policyData.counts.voluntary_class_count)}
                    />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                        <TimerReset className="h-4 w-4" />
                        QR fallback preset
                      </div>
                      <ul className="mt-3 space-y-1 text-sm text-blue-900">
                        <li>Preset: {policyData.policy.qrFallback.preset}</li>
                        <li>
                          P95 response time: {policyData.policy.qrFallback.responseTimeP95Ms} ms
                        </li>
                        <li>Queue backlog: {policyData.policy.qrFallback.queueBacklog}</li>
                        <li>
                          Scan failure rate:{' '}
                          {formatPercent(policyData.policy.qrFallback.scanFailureRate)}
                        </li>
                        <li>Min sample size: {policyData.policy.qrFallback.minSampleSize}</li>
                        <li>
                          Manual override:{' '}
                          {policyData.policy.qrFallback.allowTeacherManualOverride
                            ? 'Cho phep'
                            : 'Khong'}
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                        <ScanFace className="h-4 w-4" />
                        Face pilot readiness
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <StatCard
                          label="Selection mode"
                          value={policyData.policy.facePilot.selectionMode}
                        />
                        <StatCard
                          label="Selected by config"
                          value={policyData.policy.facePilot.selectedByConfig ? 'Co' : 'Khong'}
                        />
                        <StatCard
                          label="Min confidence"
                          value={policyData.policy.facePilot.minConfidenceScore.toFixed(2)}
                        />
                      </div>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-emerald-900">
                        {policyData.policy.facePilot.reasons.length > 0 ? (
                          policyData.policy.facePilot.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))
                        ) : (
                          <li>Chua du dieu kien pilot theo preset hien tai.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Chon mot hoat dong de xem attendance policy va readiness pilot.
                </div>
              )}
            </section>

            <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-6">
              <div className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <h2 className="text-xl font-semibold">Evaluate QR fallback</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Teacher co the gia lap runtime metrics de xem khi nao nen fallback tu QR sang mixed
                hoac manual theo preset hien tai.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm text-slate-700">
                  P95 response time (ms)
                  <input
                    value={responseTimeP95Ms}
                    onChange={(e) => setResponseTimeP95Ms(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Queue backlog
                  <input
                    value={queueBacklog}
                    onChange={(e) => setQueueBacklog(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Scan failure rate
                  <input
                    value={scanFailureRate}
                    onChange={(e) => setScanFailureRate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Sample size
                  <input
                    value={sampleSize}
                    onChange={(e) => setSampleSize(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void evaluateFallback()}
                  disabled={!selectedActivityId || loadingFallback}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {loadingFallback ? 'Dang danh gia...' : 'Danh gia fallback'}
                </button>
                {selectedActivityId ? (
                  <span className="text-xs text-slate-500">Activity #{selectedActivityId}</span>
                ) : null}
              </div>

              {fallbackData ? (
                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="font-semibold text-slate-900" data-testid="fallback-status">
                    {fallbackData.fallback.triggered ? 'Nên fallback' : 'Chua can auto fallback'}
                  </div>
                  <div className="mt-2 text-slate-600">
                    Recommended target mode: {fallbackData.fallback.recommended_target_mode}
                  </div>
                  <div className="mt-1 text-slate-600">
                    Teacher manual override:{' '}
                    {fallbackData.fallback.teacher_manual_override ? 'Cho phep' : 'Khong'}
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                    {fallbackData.fallback.reasons.length > 0 ? (
                      fallbackData.fallback.reasons.map((reason) => <li key={reason}>{reason}</li>)
                    ) : (
                      <li>Khong co nguong nao vuot preset hien tai.</li>
                    )}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
