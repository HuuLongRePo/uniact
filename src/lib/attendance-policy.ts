export type AttendanceMode = 'manual' | 'qr' | 'face' | 'mixed';

export interface AttendancePolicyInput {
  status?: string | null;
  approvalStatus?: string | null;
  maxParticipants?: number | null;
  participationCount?: number | null;
  mandatoryClassCount?: number;
  voluntaryClassCount?: number;
  activityDateTime?: string | null;
}

export interface QrFallbackThresholds {
  preset: 'pilot-default';
  responseTimeP95Ms: number;
  queueBacklog: number;
  scanFailureRate: number;
  minSampleSize: number;
  allowTeacherManualOverride: boolean;
}

export interface FacePilotAssessment {
  eligible: boolean;
  recommendedMode: AttendanceMode;
  preferredPrimaryMethod: 'manual' | 'qr' | 'face';
  reasons: string[];
  teacherManualOverride: boolean;
}

export interface QrRuntimeMetrics {
  responseTimeP95Ms?: number | null;
  queueBacklog?: number | null;
  scanFailureRate?: number | null;
  sampleSize?: number | null;
}

export function getDefaultQrFallbackThresholds(): QrFallbackThresholds {
  return {
    preset: 'pilot-default',
    responseTimeP95Ms: 1500,
    queueBacklog: 25,
    scanFailureRate: 0.12,
    minSampleSize: 20,
    allowTeacherManualOverride: true,
  };
}

function isApprovedOrPublished(input: AttendancePolicyInput) {
  const approvalStatus = String(input.approvalStatus ?? '').toLowerCase();
  const status = String(input.status ?? '').toLowerCase();
  return (
    approvalStatus === 'approved' ||
    approvalStatus === 'published' ||
    status === 'approved' ||
    status === 'published'
  );
}

function hasMandatoryScope(input: AttendancePolicyInput) {
  return Number(input.mandatoryClassCount ?? 0) > 0;
}

function isHighVolume(input: AttendancePolicyInput) {
  const actual = Number(input.participationCount ?? 0);
  const expected = Number(input.maxParticipants ?? 0);
  return actual >= 50 || expected >= 80;
}

export function assessFacePilotEligibility(input: AttendancePolicyInput): FacePilotAssessment {
  const reasons: string[] = [];
  const approved = isApprovedOrPublished(input);
  const mandatory = hasMandatoryScope(input);
  const highVolume = isHighVolume(input);

  if (approved) reasons.push('activity đã được duyệt/publish');
  if (mandatory) reasons.push('có scope bắt buộc');
  if (highVolume) reasons.push('quy mô đủ lớn cho pilot face attendance');

  const eligible = approved && mandatory && highVolume;

  return {
    eligible,
    recommendedMode: 'mixed',
    preferredPrimaryMethod: eligible ? 'face' : 'qr',
    reasons,
    teacherManualOverride: true,
  };
}

export function shouldTriggerQrFallback(
  metrics: QrRuntimeMetrics,
  thresholds: QrFallbackThresholds = getDefaultQrFallbackThresholds()
) {
  const sampleSize = Number(metrics.sampleSize ?? 0);
  if (sampleSize < thresholds.minSampleSize) {
    return {
      triggered: false,
      reasons: ['chưa đủ mẫu để tự động fallback'],
    };
  }

  const reasons: string[] = [];
  if (Number(metrics.responseTimeP95Ms ?? 0) >= thresholds.responseTimeP95Ms) {
    reasons.push('p95 response time vượt ngưỡng');
  }
  if (Number(metrics.queueBacklog ?? 0) >= thresholds.queueBacklog) {
    reasons.push('queue backlog vượt ngưỡng');
  }
  if (Number(metrics.scanFailureRate ?? 0) >= thresholds.scanFailureRate) {
    reasons.push('scan failure rate vượt ngưỡng');
  }

  return {
    triggered: reasons.length > 0,
    reasons,
  };
}

export function buildAttendancePolicy(input: AttendancePolicyInput) {
  const qrFallback = getDefaultQrFallbackThresholds();
  const facePilot = assessFacePilotEligibility(input);

  return {
    version: 'pilot-v1',
    defaultMode: 'mixed' as AttendanceMode,
    qrFallback,
    facePilot,
  };
}
