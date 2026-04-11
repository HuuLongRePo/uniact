import { describe, expect, it } from 'vitest';
import {
  assessFacePilotEligibility,
  buildAttendancePolicy,
  getDefaultQrFallbackThresholds,
  shouldTriggerQrFallback,
} from '@/lib/attendance-policy';

describe('attendance policy', () => {
  it('marks approved mandatory high-volume activity as face-pilot eligible', () => {
    const result = assessFacePilotEligibility({
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
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('keeps non-pilot activities on mixed mode with qr preferred', () => {
    const result = buildAttendancePolicy({
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
