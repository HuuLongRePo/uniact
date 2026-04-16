import { dbAll, dbRun } from '@/lib/database';
import { cache } from '@/lib/cache';
import type { SystemConfig } from '@/types/database';
import {
  getDefaultAttendancePolicyConfig,
  type AttendancePolicyConfig,
  type FacePilotSelectionMode,
} from '@/lib/attendance-policy';

type AttendancePolicyConfigRow = Pick<SystemConfig, 'config_key' | 'config_value' | 'data_type'>;

type AttendancePolicyConfigSeed = {
  config_key: string;
  config_value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  category: 'attendance';
  description: string;
};

export const ATTENDANCE_POLICY_SYSTEM_CONFIG_DEFAULTS: AttendancePolicyConfigSeed[] = [
  {
    config_key: 'attendance_policy_version',
    config_value: 'pilot-v1',
    data_type: 'string',
    category: 'attendance',
    description: 'Phiên bản attendance policy đang áp dụng',
  },
  {
    config_key: 'attendance_qr_fallback_preset',
    config_value: 'pilot-default',
    data_type: 'string',
    category: 'attendance',
    description: 'Tên preset QR fallback hiện tại',
  },
  {
    config_key: 'attendance_qr_fallback_p95_ms',
    config_value: '1500',
    data_type: 'number',
    category: 'attendance',
    description: 'Ngưỡng p95 response time để đề xuất QR fallback (ms)',
  },
  {
    config_key: 'attendance_qr_fallback_queue_backlog',
    config_value: '25',
    data_type: 'number',
    category: 'attendance',
    description: 'Ngưỡng queue backlog để đề xuất QR fallback',
  },
  {
    config_key: 'attendance_qr_fallback_scan_failure_rate',
    config_value: '0.12',
    data_type: 'number',
    category: 'attendance',
    description: 'Ngưỡng scan failure rate để đề xuất QR fallback (0-1)',
  },
  {
    config_key: 'attendance_qr_fallback_min_sample_size',
    config_value: '20',
    data_type: 'number',
    category: 'attendance',
    description: 'Số mẫu quét tối thiểu trước khi auto fallback được kích hoạt',
  },
  {
    config_key: 'attendance_qr_fallback_teacher_manual_override',
    config_value: 'true',
    data_type: 'boolean',
    category: 'attendance',
    description: 'Cho phép teacher chủ động override QR fallback',
  },
  {
    config_key: 'attendance_face_pilot_selection_mode',
    config_value: 'selected_or_heuristic',
    data_type: 'string',
    category: 'attendance',
    description:
      'Cách chọn activity pilot face attendance: heuristic_only | selected_only | selected_or_heuristic',
  },
  {
    config_key: 'attendance_face_pilot_activity_ids',
    config_value: '[]',
    data_type: 'json',
    category: 'attendance',
    description: 'Danh sách activity id được chọn thủ công cho pilot face attendance',
  },
  {
    config_key: 'attendance_face_pilot_min_participation_count',
    config_value: '50',
    data_type: 'number',
    category: 'attendance',
    description: 'Số lượng participation tối thiểu để heuristic face pilot coi là high-volume',
  },
  {
    config_key: 'attendance_face_pilot_min_max_participants',
    config_value: '80',
    data_type: 'number',
    category: 'attendance',
    description: 'Ngưỡng max_participants tối thiểu để heuristic face pilot coi là high-volume',
  },
  {
    config_key: 'attendance_face_pilot_require_mandatory_scope',
    config_value: 'true',
    data_type: 'boolean',
    category: 'attendance',
    description: 'Yêu cầu activity phải có mandatory scope để đủ điều kiện face pilot',
  },
  {
    config_key: 'attendance_face_pilot_require_approved_or_published',
    config_value: 'true',
    data_type: 'boolean',
    category: 'attendance',
    description: 'Yêu cầu activity phải approved/published trước khi xét face pilot',
  },
  {
    config_key: 'attendance_face_pilot_teacher_manual_override',
    config_value: 'true',
    data_type: 'boolean',
    category: 'attendance',
    description: 'Cho phép teacher manual override trong flow face attendance',
  },
  {
    config_key: 'attendance_face_pilot_min_confidence_score',
    config_value: '0.82',
    data_type: 'number',
    category: 'attendance',
    description: 'Ngưỡng confidence tối thiểu để auto-record face attendance',
  },
];

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function toSelectionMode(value: string | undefined): FacePilotSelectionMode {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (
    normalized === 'heuristic_only' ||
    normalized === 'selected_only' ||
    normalized === 'selected_or_heuristic'
  ) {
    return normalized;
  }
  return 'selected_or_heuristic';
}

function toIdArray(value: string | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0)
      )
    );
  } catch {
    return [];
  }
}

export async function ensureAttendancePolicySystemConfigDefaults(): Promise<void> {
  for (const row of ATTENDANCE_POLICY_SYSTEM_CONFIG_DEFAULTS) {
    await dbRun(
      `INSERT OR IGNORE INTO system_config (
         config_key,
         config_value,
         data_type,
         category,
         description,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [row.config_key, row.config_value, row.data_type, row.category, row.description]
    );
  }

  cache.invalidatePrefix('system_config:');
}

export function resolveAttendancePolicyConfig(
  rows: AttendancePolicyConfigRow[] = []
): AttendancePolicyConfig {
  const defaults = getDefaultAttendancePolicyConfig();
  const configMap = new Map(rows.map((row) => [row.config_key, row.config_value]));

  return {
    version: String(configMap.get('attendance_policy_version') || defaults.version),
    defaultMode: defaults.defaultMode,
    qrFallback: {
      preset: String(configMap.get('attendance_qr_fallback_preset') || defaults.qrFallback.preset),
      responseTimeP95Ms: toNumber(
        configMap.get('attendance_qr_fallback_p95_ms'),
        defaults.qrFallback.responseTimeP95Ms
      ),
      queueBacklog: toNumber(
        configMap.get('attendance_qr_fallback_queue_backlog'),
        defaults.qrFallback.queueBacklog
      ),
      scanFailureRate: toNumber(
        configMap.get('attendance_qr_fallback_scan_failure_rate'),
        defaults.qrFallback.scanFailureRate
      ),
      minSampleSize: toNumber(
        configMap.get('attendance_qr_fallback_min_sample_size'),
        defaults.qrFallback.minSampleSize
      ),
      allowTeacherManualOverride: toBoolean(
        configMap.get('attendance_qr_fallback_teacher_manual_override'),
        defaults.qrFallback.allowTeacherManualOverride
      ),
    },
    facePilot: {
      selectionMode: toSelectionMode(configMap.get('attendance_face_pilot_selection_mode')),
      selectedActivityIds: toIdArray(configMap.get('attendance_face_pilot_activity_ids')),
      minParticipationCount: toNumber(
        configMap.get('attendance_face_pilot_min_participation_count'),
        defaults.facePilot.minParticipationCount
      ),
      minMaxParticipants: toNumber(
        configMap.get('attendance_face_pilot_min_max_participants'),
        defaults.facePilot.minMaxParticipants
      ),
      requireMandatoryScope: toBoolean(
        configMap.get('attendance_face_pilot_require_mandatory_scope'),
        defaults.facePilot.requireMandatoryScope
      ),
      requireApprovedOrPublished: toBoolean(
        configMap.get('attendance_face_pilot_require_approved_or_published'),
        defaults.facePilot.requireApprovedOrPublished
      ),
      teacherManualOverride: toBoolean(
        configMap.get('attendance_face_pilot_teacher_manual_override'),
        defaults.facePilot.teacherManualOverride
      ),
      minConfidenceScore: toNumber(
        configMap.get('attendance_face_pilot_min_confidence_score'),
        defaults.facePilot.minConfidenceScore
      ),
    },
  };
}

export async function loadAttendancePolicyConfig(): Promise<AttendancePolicyConfig> {
  await ensureAttendancePolicySystemConfigDefaults();

  let rows: AttendancePolicyConfigRow[] = [];
  try {
    rows = (await dbAll(
      `SELECT config_key, config_value, data_type
       FROM system_config
       WHERE category = 'attendance'
         AND config_key LIKE 'attendance_%'
       ORDER BY config_key`
    )) as AttendancePolicyConfigRow[];
  } catch {
    rows = [];
  }

  return resolveAttendancePolicyConfig(rows);
}
