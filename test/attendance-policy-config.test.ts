import { describe, expect, it } from 'vitest';
import { resolveAttendancePolicyConfig } from '@/lib/attendance-policy-config';

describe('attendance policy config resolver', () => {
  it('parses system_config rows into runtime attendance policy config', () => {
    const config = resolveAttendancePolicyConfig([
      {
        config_key: 'attendance_policy_version',
        config_value: 'pilot-v2',
        data_type: 'string',
      },
      {
        config_key: 'attendance_qr_fallback_p95_ms',
        config_value: '2100',
        data_type: 'number',
      },
      {
        config_key: 'attendance_qr_fallback_teacher_manual_override',
        config_value: 'false',
        data_type: 'boolean',
      },
      {
        config_key: 'attendance_face_pilot_selection_mode',
        config_value: 'selected_only',
        data_type: 'string',
      },
      {
        config_key: 'attendance_face_pilot_activity_ids',
        config_value: '[101, 205, "oops", 205]',
        data_type: 'json',
      },
      {
        config_key: 'attendance_face_pilot_min_confidence_score',
        config_value: '0.9',
        data_type: 'number',
      },
    ]);

    expect(config.version).toBe('pilot-v2');
    expect(config.qrFallback.responseTimeP95Ms).toBe(2100);
    expect(config.qrFallback.allowTeacherManualOverride).toBe(false);
    expect(config.facePilot.selectionMode).toBe('selected_only');
    expect(config.facePilot.selectedActivityIds).toEqual([101, 205]);
    expect(config.facePilot.minConfidenceScore).toBeCloseTo(0.9, 2);
  });

  it('falls back safely when config values are invalid', () => {
    const config = resolveAttendancePolicyConfig([
      {
        config_key: 'attendance_face_pilot_selection_mode',
        config_value: 'not-a-real-mode',
        data_type: 'string',
      },
      {
        config_key: 'attendance_qr_fallback_p95_ms',
        config_value: 'NaN',
        data_type: 'number',
      },
      {
        config_key: 'attendance_face_pilot_activity_ids',
        config_value: '{ bad json',
        data_type: 'json',
      },
    ]);

    expect(config.version).toBe('pilot-v1');
    expect(config.qrFallback.responseTimeP95Ms).toBe(1500);
    expect(config.facePilot.selectionMode).toBe('selected_or_heuristic');
    expect(config.facePilot.selectedActivityIds).toEqual([]);
  });
});
