/**
 * Point Calculation Engine
 */

import { dbRun, dbGet, dbAll, ensurePointCalculationColumns } from './database';
import { cache } from './cache';
import { CalculationInput, CalculationResult } from './scoring-types';

export class ScoringCalculator {
  /**
   * Lấy achievement multipliers từ database (dynamic config)
   */
  static async getAchievementMultipliers(): Promise<Record<string, number>> {
    const multipliers = await dbAll(
      'SELECT achievement_level, multiplier FROM achievement_multipliers'
    );

    const result: Record<string, number> = {
      excellent: 1.5,
      good: 1.2,
      participated: 1.0,
    };

    for (const m of multipliers) {
      result[m.achievement_level] = m.multiplier;
    }

    return result;
  }

  /**
   * Lấy multipliers từ activity (base points từ activity_types, multiplier từ organization_levels)
   */
  static async getActivityMultipliers(
    activityId: number
  ): Promise<{ type: number; level: number; base: number }> {
    const activity = await dbGet(
      `
      SELECT 
        a.activity_type_id,
        a.organization_level_id,
        COALESCE(at.base_points, 10) as type_base_points,
        COALESCE(ol.multiplier, 1.0) as level_multiplier
      FROM activities a
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      WHERE a.id = ?
    `,
      [activityId]
    );

    if (!activity) {
      throw new Error(`Activity ${activityId} not found`);
    }

    return {
      base: activity.type_base_points || 10,
      type: 1.0,
      level: activity.level_multiplier || 1.0,
    };
  }

  /**
   * Tính điểm cho 1 participation
   */
  static async calculatePoints(input: CalculationInput): Promise<CalculationResult> {
    const { participationId, bonusPoints = 0, penaltyPoints = 0 } = input;

    const participation = await dbGet(
      `
      SELECT p.*, a.id as activity_id, a.activity_type_id, a.organization_level_id
      FROM participations p
      JOIN activities a ON p.activity_id = a.id
      WHERE p.id = ?
    `,
      [participationId]
    );

    if (!participation) {
      throw new Error(`Participation ${participationId} not found`);
    }

    const { base, type, level } = await this.getActivityMultipliers(participation.activity_id);

    const achievementMultipliers = await this.getAchievementMultipliers();
    const achievementLevel = participation.achievement_level || 'participated';
    const achievement = achievementMultipliers[achievementLevel] || 1.0;

    const baseCalc = base * type * level * achievement;
    const totalPoints = baseCalc + bonusPoints - penaltyPoints;

    const formula = `(${base} × ${type} × ${level} × ${achievement}) + ${bonusPoints} - ${penaltyPoints} = ${totalPoints.toFixed(2)}`;

    return {
      totalPoints: Math.max(0, totalPoints),
      breakdown: {
        base,
        type,
        level,
        achievement,
        bonus: bonusPoints,
        penalty: penaltyPoints,
      },
      formula,
    };
  }

  /**
   * Lưu kết quả tính điểm vào database
   */
  static async saveCalculation(participationId: number, result: CalculationResult): Promise<void> {
    const { totalPoints, breakdown } = result;
    const effectiveCoefficient = breakdown.type * breakdown.level * breakdown.achievement;

    await ensurePointCalculationColumns();

    const participation = await dbGet(
      'SELECT student_id, activity_id FROM participations WHERE id = ?',
      [participationId]
    );

    if (!participation) {
      throw new Error(`Participation ${participationId} not found`);
    }

    const existingCalculation = await dbGet(
      'SELECT id FROM point_calculations WHERE participation_id = ? ORDER BY calculated_at DESC, id DESC LIMIT 1',
      [participationId]
    );

    if (existingCalculation?.id) {
      await dbRun(
        `
        UPDATE point_calculations
        SET activity_id = ?,
            base_points = ?,
            coefficient = ?,
            bonus_points = ?,
            penalty_points = ?,
            total_points = ?,
            calculated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [
          participation.activity_id,
          breakdown.base,
          effectiveCoefficient,
          breakdown.bonus,
          breakdown.penalty,
          totalPoints,
          existingCalculation.id,
        ]
      );
    } else {
      await dbRun(
        `
        INSERT INTO point_calculations (
          participation_id,
          activity_id,
          base_points,
          coefficient,
          bonus_points,
          penalty_points,
          total_points,
          calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
        [
          participationId,
          participation.activity_id,
          breakdown.base,
          effectiveCoefficient,
          breakdown.bonus,
          breakdown.penalty,
          totalPoints,
        ]
      );
    }

    const existingScore = await dbGet(
      'SELECT id FROM student_scores WHERE student_id = ? AND activity_id = ? AND source = ?',
      [participation.student_id, participation.activity_id, 'evaluation']
    );

    if (existingScore?.id) {
      await dbRun(
        `
        UPDATE student_scores
        SET points = ?,
            calculated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        [totalPoints, existingScore.id]
      );
    } else {
      await dbRun(
        `
        INSERT INTO student_scores (
          student_id,
          activity_id,
          points,
          source,
          calculated_at
        ) VALUES (?, ?, ?, 'evaluation', CURRENT_TIMESTAMP)
      `,
        [participation.student_id, participation.activity_id, totalPoints]
      );
    }

    cache.invalidate(`scores:${participation.student_id}`);
  }

  /**
   * Auto-calculate khi có evaluation
   */
  static async autoCalculateAfterEvaluation(participationId: number): Promise<CalculationResult> {
    const result = await this.calculatePoints({ participationId });
    await this.saveCalculation(participationId, result);
    return result;
  }

  /**
   * Recalculate tất cả điểm
   */
  static async recalculateAll(): Promise<{ success: number; failed: number }> {
    const participations = await dbAll(`
      SELECT id FROM participations 
      WHERE attendance_status = 'attended' 
      AND achievement_level IS NOT NULL
    `);

    let success = 0;
    let failed = 0;

    for (const p of participations) {
      try {
        await this.autoCalculateAfterEvaluation(p.id);
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }
}
