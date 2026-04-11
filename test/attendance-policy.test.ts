import { describe, expect, it } from 'vitest';
import {
  assessFacePilotEligibility,
  buildAttendancePolicy,
  getDefaultAttendancePolicyConfig,
  getDefaultQrFallbackThresholds,
  shouldTriggerQrFallback,
} from '@/lib/attendance-policy';

describe('attendance policy', () => {
  it('marks approved mandatory high-volume activity as face-pilot eligible', () => {
    const result = assessFacePilotEligibility({
      activityId: 77,
      status: 'published',
      approvalStatus: 'approved',
      maxParticipants: 120,
      participationCount: 60,
      mandatoryClassCount: 2,
      voluntaryClassCount: 0,
    });

    expect(result.eligible).toBe(true);
    expect(result.recommendedMode).toBe('mixed');
    expect(result.preferredPrimaryMethod).toBe('face');
    expect(result.minConfidenceScore).toBeCloseTo(0.82, 2);
    expect(result.selectionMode).toBe('selected_or_heuristic');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('keeps non-pilot activities on mixed mode with qr preferred', () => {
    const result = buildAttendancePolicy({
      activityId: 11,
      status: 'draft',
      approvalStatus: 'draft',
      maxParticipants: 20,
      participationCount: 0,
      mandatoryClassCount: 0,
      voluntaryClassCount: 1,
    });

    expect(result.defaultMode).toBe('mixed');
    expect(result.facePilot.eligible).toBe(false);
    expect(result.facePilot.preferredPrimaryMethod).toBe('qr');
  });

  it('supports selected_only face-pilot mode via config overrides', () => {
    const config = getDefaultAttendancePolicyConfig();
    config.facePilot.selectionMode = 'selected_only';
    config.facePilot.selectedActivityIds = [501];
    config.facePilot.minParticipationCount = 999;
    config.facePilot.minMaxParticipants = 999;

    const eligible = assessFacePilotEligibility(
      {
        activityId: 501,
        status: 'published',
        approvalStatus: 'approved',
        maxParticipants: 30,
        participationCount: 5,
        mandatoryClassCount: 1,
      },
      config
    );

    const notEligible = assessFacePilotEligibility(
      {
        activityId: 777,
        status: 'published',
        approvalStatus: 'approved',
        maxParticipants: 300,
        participationCount: 300,
        mandatoryClassCount: 1,
      },
      config
    );

    expect(eligible.eligible).toBe(true);
    expect(eligible.selectedByConfig).toBe(true);
    expect(notEligible.eligible).toBe(false);
    expect(notEligible.selectedByConfig).toBe(false);
  });

  it('triggers qr fallback when configured thresholds are exceeded', () => {
    const thresholds = getDefaultQrFallbackThresholds();
    const result = shouldTriggerQrFallback(
      {
        responseTimeP95Ms: thresholds.responseTimeP95Ms + 50,
        queueBacklog: thresholds.queueBacklog + 5,
        scanFailureRate: thresholds.scanFailureRate + 0.05,
        sampleSize: thresholds.minSampleSize,
      },
      thresholds
    );

    expect(result.triggered).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('does not trigger auto fallback when sample size is insufficient', () => {
    const result = shouldTriggerQrFallback({
      responseTimeP95Ms: 9999,
      queueBacklog: 999,
      scanFailureRate: 1,
      sampleSize: 5,
    });

    expect(result.triggered).toBe(false);
    expect(result.reasons).toContain('chưa đủ mẫu để tự động fallback');
  });
});
