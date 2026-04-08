/**
 * Bonus Points Calculation Engine
 * - Configurable weights for different bonus sources (achievements, activities, etc.)
 * - Score calculation logic with multipliers and caps
 * - Validation and normalization
 * - Used by API and approval workflow
 */

export interface BonusWeights {
  // Achievement-based bonuses (contest results)
  achievement: {
    firstPlace: number; // 10 points (championship)
    secondPlace: number; // 7 points
    thirdPlace: number; // 5 points
    participation: number; // 2 points (participated but no placement)
  };

  // Activity participation bonuses
  activity: {
    volunteer: number; // 3 points (volunteer work)
    leader: number; // 5 points (activity leader)
    organizer: number; // 8 points (organizer/coordinator)
  };

  // Student development activities
  development: {
    training: number; // 2 points (training completion)
    certification: number; // 4 points (professional cert)
    presentation: number; // 3 points (presentation/talk)
  };

  // Social contribution
  social: {
    community: number; // 3 points (community service)
    mentoring: number; // 4 points (peer mentoring)
    donation: number; // 2 points (donation/fundraising)
  };

  // Special achievements
  special: {
    award: number; // 5-10 points (school award)
    scholarship: number; // 10 points (merit scholarship)
    recognition: number; // 3 points (public recognition)
  };
}

export interface BonusCalculationInput {
  studentId: number;
  sourceType: string; // achievement, activity, development, social, special
  sourceId?: number;
  basePoints: number; // before multipliers
  multiplier?: number; // e.g., 1.5x for exceptional cases (default 1)
  semester?: number; // for semester caps
  academicYear?: string; // for annual caps (e.g., "2024-2025")
}

export interface BonusCalculationResult {
  studentId: number;
  suggestedPoints: number;
  basePoints: number;
  multiplier: number;
  reason: string;
  validations: string[]; // any warnings or notes
  capApplied: boolean;
  cappedAt?: number;
}

// Default weights (can be customized per school)
export const DEFAULT_BONUS_WEIGHTS: BonusWeights = {
  achievement: {
    firstPlace: 10,
    secondPlace: 7,
    thirdPlace: 5,
    participation: 2,
  },
  activity: {
    volunteer: 3,
    leader: 5,
    organizer: 8,
  },
  development: {
    training: 2,
    certification: 4,
    presentation: 3,
  },
  social: {
    community: 3,
    mentoring: 4,
    donation: 2,
  },
  special: {
    award: 5,
    scholarship: 10,
    recognition: 3,
  },
};

// System-wide caps
export const BONUS_CAPS = {
  perSemester: 50, // max 50 points per semester (total)
  perYear: 100, // max 100 points per academic year (total)
  maxSingleBonus: 15, // single suggestion capped at 15
  // Per-target caps (học_tập vs rèn_luyện)
  perSemesterByTarget: {
    hoc_tap: 40, // max 40 points/semester for học_tập
    ren_luyen: 30, // max 30 points/semester for rèn_luyện
  },
  perYearByTarget: {
    hoc_tap: 80, // max 80 points/year for học_tập
    ren_luyen: 60, // max 60 points/year for rèn_luyện
  },
};

/**
 * Initialize engine with optional custom weights
 */
export class BonusEngine {
  private weights: BonusWeights;
  private caps = BONUS_CAPS;

  constructor(weights: Partial<BonusWeights> = {}) {
    this.weights = { ...DEFAULT_BONUS_WEIGHTS, ...weights };
  }

  /**
   * Calculate bonus points based on source and context
   */
  calculate(input: BonusCalculationInput): BonusCalculationResult {
    const validations: string[] = [];
    let suggestedPoints = input.basePoints || 0;
    const multiplier = input.multiplier || 1;

    // Apply multiplier
    suggestedPoints *= multiplier;
    if (multiplier !== 1) {
      validations.push(`Applied multiplier ${multiplier}x`);
    }

    // Cap single bonus at max
    let capApplied = false;
    let cappedAt: number | undefined;
    if (suggestedPoints > this.caps.maxSingleBonus) {
      validations.push(
        `Capped from ${suggestedPoints} to ${this.caps.maxSingleBonus} (max single bonus)`
      );
      cappedAt = suggestedPoints;
      suggestedPoints = this.caps.maxSingleBonus;
      capApplied = true;
    }

    // Validate source type
    const sourceKey = input.sourceType.toLowerCase();
    const reason = this.getReasonForSource(sourceKey, suggestedPoints);

    return {
      studentId: input.studentId,
      suggestedPoints: Math.round(suggestedPoints * 100) / 100,
      basePoints: input.basePoints,
      multiplier,
      reason,
      validations,
      capApplied,
      cappedAt,
    };
  }

  /**
   * Get readable reason for bonus source
   */
  private getReasonForSource(sourceType: string, points: number): string {
    const typeMap: Record<string, string> = {
      achievement: 'Hoạt động ngoại khóa / thành tích',
      activity: 'Tham gia hoạt động / tập thể',
      development: 'Phát triển kỹ năng / chứng chỉ',
      social: 'Đóng góp xã hội',
      special: 'Đạt giải / khen thưởng đặc biệt',
    };
    const description = typeMap[sourceType] || sourceType;
    return `${description}: +${points} điểm`;
  }

  /**
   * Get applied weight for a specific sub-category
   */
  getWeight(sourceType: string, subType: string): number | null {
    const source = this.weights[sourceType as keyof BonusWeights];
    if (!source) return null;
    return (source as Record<string, number>)[subType] || null;
  }

  /**
   * Validate if bonus is within caps (before approval)
   */
  validateAgainstCap(
    currentTotalForPeriod: number,
    proposedBonus: number,
    capType: 'semester' | 'year' = 'semester'
  ): { valid: boolean; message: string; remainingCapacity: number } {
    const cap = capType === 'semester' ? this.caps.perSemester : this.caps.perYear;
    const total = currentTotalForPeriod + proposedBonus;

    if (total <= cap) {
      return {
        valid: true,
        message: `Hợp lệ. Tổng: ${total}/${cap}`,
        remainingCapacity: cap - total,
      };
    }

    return {
      valid: false,
      message: `Vượt quá giới hạn. Tổng: ${total}/${cap}. Còn lại: ${Math.max(0, cap - currentTotalForPeriod)}`,
      remainingCapacity: Math.max(0, cap - currentTotalForPeriod),
    };
  }

  /**
   * Validate bonus against apply_to-specific caps (học_tập vs rèn_luyện)
   * @param appliesTo - 'hoc_tap', 'ren_luyen', or 'both'
   * @param currentTotalForPeriod - total points already allocated to this target in this period
   * @param proposedBonus - points to be added
   * @param capType - 'semester' or 'year'
   */
  validateAgainstTargetCap(
    appliesTo: 'hoc_tap' | 'ren_luyen' | 'both' = 'hoc_tap',
    currentTotalForPeriod: number,
    proposedBonus: number,
    capType: 'semester' | 'year' = 'semester'
  ): { valid: boolean; message: string; remainingCapacity: number } {
    // For 'both', use the higher cap from both targets
    const targets = appliesTo === 'both' ? ['hoc_tap', 'ren_luyen'] : [appliesTo];
    const capsToCheck =
      capType === 'semester' ? this.caps.perSemesterByTarget : this.caps.perYearByTarget;

    // Use the cap for the specified target (or max of both if 'both')
    let cap = 0;
    for (const target of targets) {
      const targetCap = capsToCheck[target as keyof typeof capsToCheck] || 50;
      cap = Math.max(cap, targetCap);
    }

    const total = currentTotalForPeriod + proposedBonus;

    if (total <= cap) {
      return {
        valid: true,
        message: `Hợp lệ (${appliesTo}). Tổng: ${total}/${cap}`,
        remainingCapacity: cap - total,
      };
    }

    return {
      valid: false,
      message: `Vượt quá giới hạn (${appliesTo}). Tổng: ${total}/${cap}. Còn lại: ${Math.max(0, cap - currentTotalForPeriod)}`,
      remainingCapacity: Math.max(0, cap - currentTotalForPeriod),
    };
  }

  /**
   * Get all configured weights
   */
  getWeights(): BonusWeights {
    return { ...this.weights };
  }

  /**
   * Get current caps configuration
   */
  getCaps() {
    return { ...this.caps };
  }

  /**
   * Update caps (for admin settings)
   */
  updateCaps(caps: Partial<typeof BONUS_CAPS>) {
    this.caps = { ...this.caps, ...caps };
  }
}

/**
 * Normalize points to 2 decimal places
 */
export function normalizePoints(points: number): number {
  return Math.round(points * 100) / 100;
}

/**
 * Check if achievement level matches weight key
 */
export function mapAchievementLevel(level: string): keyof BonusWeights['achievement'] | null {
  const levelMap: Record<string, keyof BonusWeights['achievement']> = {
    '1st': 'firstPlace',
    '1': 'firstPlace',
    gold: 'firstPlace',
    nhất: 'firstPlace',
    '2nd': 'secondPlace',
    '2': 'secondPlace',
    silver: 'secondPlace',
    nhì: 'secondPlace',
    '3rd': 'thirdPlace',
    '3': 'thirdPlace',
    bronze: 'thirdPlace',
    ba: 'thirdPlace',
    participant: 'participation',
    join: 'participation',
    'tham gia': 'participation',
  };
  return levelMap[level.toLowerCase()] || null;
}

/**
 * Calculate total bonus from multiple suggestions
 */
export function aggregateBonusPoints(bonuses: BonusCalculationResult[]): {
  total: number;
  count: number;
  average: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  let total = 0;

  bonuses.forEach((bonus) => {
    total += bonus.suggestedPoints;
    if (!breakdown[bonus.reason]) {
      breakdown[bonus.reason] = 0;
    }
    breakdown[bonus.reason] += bonus.suggestedPoints;
  });

  return {
    total: normalizePoints(total),
    count: bonuses.length,
    average: bonuses.length > 0 ? normalizePoints(total / bonuses.length) : 0,
    breakdown,
  };
}

/**
 * Create preconfigured engine for common scenarios
 */
export function createDefaultEngine(): BonusEngine {
  return new BonusEngine(DEFAULT_BONUS_WEIGHTS);
}

/**
 * Get suggested points for common achievement types
 */
export function suggestPointsForAchievement(
  level: string,
  weights: BonusWeights = DEFAULT_BONUS_WEIGHTS
): number | null {
  const key = mapAchievementLevel(level);
  if (!key) return null;
  return weights.achievement[key];
}

// ---- Rules evaluation (integration with DB) ----
import { dbAll, dbGet, dbReady, dbRun } from './db-core';

export interface RuleRecord {
  id: number;
  code: string;
  name: string;
  description?: string;
  applies_to: string;
  trigger_type: string;
  criteria_json: string;
  points: number;
  cap_per_term?: number;
  cap_per_year?: number;
  auto_apply?: number;
  requires_approval?: number;
}

export interface SuggestedBonusFromRule {
  ruleId: number;
  ruleCode: string;
  studentId: number;
  term: string;
  appliesTo: string;
  points: number;
  reason: string;
  provenance?: any;
}

async function tableExists(tableName: string): Promise<boolean> {
  const row = await dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [
    tableName,
  ]);
  return !!row;
}

/**
 * Load all active rules from DB
 */
export async function loadRules(): Promise<RuleRecord[]> {
  await dbReady();
  if (!(await tableExists('rules'))) return [];
  const rows = (await dbAll('SELECT * FROM rules')) as RuleRecord[];
  return rows;
}

/**
 * Evaluate rules for a student in a given term and return suggested bonuses
 */
export async function evaluateRulesForStudent(
  studentId: number,
  term: string
): Promise<SuggestedBonusFromRule[]> {
  await dbReady();
  const rules = await loadRules();
  const suggestions: SuggestedBonusFromRule[] = [];

  // Compute GPA for the term
  let gpa: number | null = null;
  const gradesExist = await tableExists('grades');
  if (gradesExist) {
    const grades = (await dbAll(
      'SELECT g.* , s.credits FROM grades g LEFT JOIN subjects s ON s.id = g.subject_id WHERE g.student_id = ? AND g.term = ?',
      [studentId, term]
    )) as any[];
    if (grades.length > 0) {
      // compute weighted average by credits
      let totalWeighted = 0;
      let totalCredits = 0;
      for (const gr of grades) {
        let final: number | null = gr.final_score != null ? Number(gr.final_score) : null;
        if (final == null && gr.components_json) {
          try {
            const comps = JSON.parse(gr.components_json) as Record<string, unknown>;
            const componentValues = Object.values(comps)
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value));

            final =
              componentValues.length > 0
                ? componentValues.reduce((sum, value) => sum + value, 0) / componentValues.length
                : null;
          } catch (e) {
            final = null;
          }
        }
        if (final != null) {
          const credits = Number(gr.credits) || 1;
          totalWeighted += final * credits;
          totalCredits += credits;
        }
      }
      if (totalCredits > 0) gpa = Math.round((totalWeighted / totalCredits) * 100) / 100;
    }
  }

  // Load conduct score if available
  let conductScore: number | null = null;
  if (await tableExists('conduct_scores')) {
    const row = (await dbGet(
      'SELECT final_conduct_score FROM conduct_scores WHERE student_id = ? AND term = ?',
      [studentId, term]
    )) as any;
    if (row && row.final_conduct_score != null) conductScore = Number(row.final_conduct_score);
  }

  // Evaluate each rule
  for (const r of rules) {
    let criteria: any = {};
    try {
      criteria = r.criteria_json ? JSON.parse(r.criteria_json) : {};
    } catch (e) {
      criteria = {};
    }
    let matched = false;
    if (r.trigger_type === 'grade' && gpa != null) {
      if (criteria.gpa_gte != null && gpa >= Number(criteria.gpa_gte)) matched = true;
      if (criteria.gpa_lte != null && gpa <= Number(criteria.gpa_lte)) matched = true;
    }
    if (r.trigger_type === 'conduct' && conductScore != null) {
      if (criteria.conduct_gte != null && conductScore >= Number(criteria.conduct_gte))
        matched = true;
      if (criteria.conduct_lte != null && conductScore <= Number(criteria.conduct_lte))
        matched = true;
    }
    // activity/award triggers require event tables; if missing skip for now
    if (r.trigger_type === 'activity') {
      if (await tableExists('activities')) {
        // FIX: Query was looking for activities.student_id (doesn't exist)
        // Check if student participates in activity matching type/level
        const act = await dbGet(
          'SELECT a.* FROM activities a JOIN participations p ON p.activity_id = a.id WHERE p.student_id = ? AND a.activity_type_id = ? AND a.organization_level_id = ? LIMIT 1',
          [studentId, criteria.activity_type, criteria.level]
        );
        if (act) matched = true;
      }
    }

    if (matched) {
      suggestions.push({
        ruleId: r.id,
        ruleCode: r.code,
        studentId,
        term,
        appliesTo: r.applies_to,
        points: Number(r.points),
        reason: r.name,
        provenance: { rule: r.code },
      });
    }
  }

  return suggestions;
}

/**
 * Sum approved points for a student in a term (optionally filtered by applies_to)
 */
export async function getApprovedPointsForStudent(
  studentId: number,
  term: string,
  appliesTo?: string
): Promise<number> {
  await dbReady();
  // Check if suggested_bonus_points table exists
  const table = await dbGet(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='suggested_bonus_points'"
  );
  if (!table) return 0;

  // Check if apply_to column exists
  const cols = await dbAll("PRAGMA table_info('suggested_bonus_points')");
  const hasApplyTo = cols.some((c: any) => c.name === 'apply_to');

  let sql =
    'SELECT COALESCE(SUM(points),0) as total FROM suggested_bonus_points WHERE student_id = ? AND status = ?';
  const params: any[] = [studentId, 'approved'];
  if (hasApplyTo && appliesTo) {
    sql += ' AND apply_to = ?';
    params.push(appliesTo);
  }
  // If term filtering exists on table, try to filter by term column
  if (cols.some((c: any) => c.name === 'term')) {
    sql += ' AND term = ?';
    params.push(term);
  }

  const row = (await dbGet(sql, params)) as any;
  return Number(row?.total || 0);
}

/**
 * Create suggested bonus records from rule suggestions.
 * - Respects auto_apply and requires_approval properties on rules.
 * - Enforces per-semester cap by consulting engine.validateAgainstTargetCap.
 * - Separates caps per apply_to target (học_tập vs rèn_luyện).
 */
export async function applyRuleSuggestions(
  suggestions: SuggestedBonusFromRule[],
  authorId: number | null = null,
  term: string
): Promise<any[]> {
  await dbReady();
  const results: any[] = [];
  const engine = new BonusEngine();

  for (const s of suggestions) {
    // Load full rule
    const rule = (await dbGet('SELECT * FROM rules WHERE id = ?', [s.ruleId])) as any;
    if (!rule) continue;

    const appliesTo = rule.applies_to || s.appliesTo || 'hoc_tap';
    const points = Number(s.points || rule.points || 0);

    // Check cap using rule-specific cap if available, otherwise system caps
    const currentApproved = await getApprovedPointsForStudent(s.studentId, term, appliesTo);
    const ruleSpecificCap = rule.cap_per_term != null ? Number(rule.cap_per_term) : null;

    let capCheckResult: { valid: boolean; message: string; remainingCapacity: number };

    if (ruleSpecificCap != null) {
      // Use rule-specific cap
      const total = currentApproved + points;
      if (total <= ruleSpecificCap) {
        capCheckResult = {
          valid: true,
          message: `Hợp lệ. Tổng: ${total}/${ruleSpecificCap}`,
          remainingCapacity: ruleSpecificCap - total,
        };
      } else {
        capCheckResult = {
          valid: false,
          message: `Vượt quá giới hạn quy tắc. Tổng: ${total}/${ruleSpecificCap}. Còn lại: ${Math.max(0, ruleSpecificCap - currentApproved)}`,
          remainingCapacity: Math.max(0, ruleSpecificCap - currentApproved),
        };
      }
    } else {
      // Use system-wide target-specific cap validation
      capCheckResult = engine.validateAgainstTargetCap(
        appliesTo as 'hoc_tap' | 'ren_luyen' | 'both',
        currentApproved,
        points,
        'semester'
      );
    }

    if (!capCheckResult.valid) {
      // if exceeds cap, create a pending suggestion with note
      const note = capCheckResult.message;
      const res = await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, source_type, source_id, points, reason, status, author_id, evidence_url, apply_to, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          s.studentId,
          'rule',
          s.ruleId,
          0,
          `${s.reason} - ${note}`,
          'pending',
          authorId,
          null,
          appliesTo,
        ]
      );
      results.push({ suggestionId: res.lastID, status: 'pending', note, appliesTo });
      continue;
    }

    // If rule requires approval, create pending suggested bonus
    if (rule.requires_approval) {
      const res = await dbRun(
        `INSERT INTO suggested_bonus_points (student_id, source_type, source_id, points, reason, status, author_id, evidence_url, apply_to, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [s.studentId, 'rule', s.ruleId, points, s.reason, 'pending', authorId, null, appliesTo]
      );
      results.push({ suggestionId: res.lastID, status: 'pending', appliesTo });
      continue;
    }

    // Auto-apply: insert as approved
    const res = await dbRun(
      `INSERT INTO suggested_bonus_points (student_id, source_type, source_id, points, reason, status, author_id, evidence_url, apply_to, source_provenance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [s.studentId, 'rule', s.ruleId, points, s.reason, authorId, null, appliesTo, 'rule']
    );

    // Create audit log via dbHelpers if available
    try {
      const { dbHelpers } = await import('./db-queries');
      if (dbHelpers && (dbHelpers as any).createAuditLog) {
        await (dbHelpers as any).createAuditLog(
          authorId || 0,
          'AUTO_APPLY_RULE',
          'suggested_bonus_points',
          res.lastID || null,
          JSON.stringify({ rule: rule.code, appliesTo })
        );
      }
    } catch (e) {
      /* ignore audit errors */
    }

    results.push({ suggestionId: res.lastID, status: 'approved', appliesTo });
  }

  return results;
}
