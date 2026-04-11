export type AttendanceMode = 'manual' | 'qr' | 'face' | 'mixed';
export type FacePilotSelectionMode = 'heuristic_only' | 'selected_only' | 'selected_or_heuristic';

export interface AttendancePolicyInput {
  activityId?: number | null;
  status?: string | null;
  approvalStatus?: string | null;
  maxParticipants?: number | null;
  participationCount?: number | null;
  mandatoryClassCount?: number;
  voluntaryClassCount?: number;
  activityDateTime?: string | null;
}

export interface QrFallbackThresholds {
  preset: string;
  responseTimeP95Ms: number;
  queueBacklog: number;
  scanFailureRate: number;
  minSampleSize: number;
  allowTeacherManualOverride: boolean;
}

export interface FacePilotPolicyConfig {
  selectionMode: FacePilotSelectionMode;
  selectedActivityIds: number[];
  minParticipationCount: number;
  minMaxParticipants: number;
  requireMandatoryScope: boolean;
  requireApprovedOrPublished: boolean;
  teacherManualOverride: boolean;
  minConfidenceScore: number;
}

export interface AttendancePolicyConfig {
  version: string;
  defaultMode: AttendanceMode;
  qrFallback: QrFallbackThresholds;
  facePilot: FacePilotPolicyConfig;
}

export interface FacePilotAssessment {
  eligible: boolean;
  recommendedMode: AttendanceMode;
  preferredPrimaryMethod: 'manual' | 'qr' | 'face';
  reasons: string[];
  teacherManualOverride: boolean;
  minConfidenceScore: number;
  selectionMode: FacePilotSelectionMode;
  selectedByConfig: boolean;
}

export interface QrRuntimeMetrics {
  responseTimeP95Ms?: number | null;
  queueBacklog?: number | null;
  scanFailureRate?: number | null;
  sampleSize?: number | null;
}

export function getDefaultAttendancePolicyConfig(): AttendancePolicyConfig {
  return {
    version: 'pilot-v1',
    defaultMode: 'mixed',
    qrFallback: {
      preset: 'pilot-default',
      responseTimeP95Ms: 1500,
      queueBacklog: 25,
      scanFailureRate: 0.12,
      minSampleSize: 20,
      allowTeacherManualOverride: true,
    },
    facePilot: {
      selectionMode: 'selected_or_heuristic',
      selectedActivityIds: [],
      minParticipationCount: 50,
      minMaxParticipants: 80,
      requireMandatoryScope: true,
      requireApprovedOrPublished: true,
      teacherManualOverride: true,
      minConfidenceScore: 0.82,
    },
  };
}

export function getDefaultQrFallbackThresholds(): QrFallbackThresholds {
  return getDefaultAttendancePolicyConfig().qrFallback;
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

function isHighVolume(input: AttendancePolicyInput, config: AttendancePolicyConfig) {
  const actual = Number(input.participationCount ?? 0);
  const expected = Number(input.maxParticipants ?? 0);
  return (
    actual >= config.facePilot.minParticipationCount ||
    expected >= config.facePilot.minMaxParticipants
  );
}

function isSelectedByConfig(input: AttendancePolicyInput, config: AttendancePolicyConfig) {
  const activityId = Number(input.activityId ?? 0);
  if (!Number.isInteger(activityId) || activityId <= 0) {
    return false;
  }
  return config.facePilot.selectedActivityIds.includes(activityId);
}

function passesSelectionMode(
  selectedByConfig: boolean,
  highVolume: boolean,
  mode: FacePilotSelectionMode
) {
  switch (mode) {
    case 'selected_only':
      return selectedByConfig;
    case 'heuristic_only':
      return highVolume;
    case 'selected_or_heuristic':
    default:
      return selectedByConfig || highVolume;
  }
}

export function assessFacePilotEligibility(
  input: AttendancePolicyInput,
  config: AttendancePolicyConfig = getDefaultAttendancePolicyConfig()
): FacePilotAssessment {
  const reasons: string[] = [];
  const approved = config.facePilot.requireApprovedOrPublished
    ? isApprovedOrPublished(input)
    : true;
  const mandatory = config.facePilot.requireMandatoryScope ? hasMandatoryScope(input) : true;
  const highVolume = isHighVolume(input, config);
  const selectedByConfig = isSelectedByConfig(input, config);
  const selectionPass = passesSelectionMode(
    selectedByConfig,
    highVolume,
    config.facePilot.selectionMode
  );

  if (approved) reasons.push('activity đã được duyệt/publish');
  if (mandatory) reasons.push('có scope bắt buộc');
  if (highVolume) reasons.push('quy mô đủ lớn theo ngưỡng face-pilot hiện tại');
  if (selectedByConfig) reasons.push('activity nằm trong danh sách pilot face attendance đã chọn');

  const eligible = approved && mandatory && selectionPass;

  return {
    eligible,
    recommendedMode: 'mixed',
    preferredPrimaryMethod: eligible ? 'face' : 'qr',
    reasons,
    teacherManualOverride: config.facePilot.teacherManualOverride,
    minConfidenceScore: config.facePilot.minConfidenceScore,
    selectionMode: config.facePilot.selectionMode,
    selectedByConfig,
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

export function buildAttendancePolicy(
  input: AttendancePolicyInput,
  config: AttendancePolicyConfig = getDefaultAttendancePolicyConfig()
) {
  const facePilot = assessFacePilotEligibility(input, config);

  return {
    version: config.version,
    defaultMode: config.defaultMode,
    qrFallback: config.qrFallback,
    facePilot,
  };
}
