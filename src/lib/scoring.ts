/**
 * Point Calculation Service (Facade)
 *
 * Tính điểm theo công thức:
 * Points = Base × Type × Level × Achievement + Bonus - Penalty
 */

// Export from specialized modules
export * from './scoring-types';
export { ScoringCalculator } from './scoring-calculator';
export { ScoreQueries } from './scoring-queries';

// Re-export for backward compatibility
import { ScoringCalculator } from './scoring-calculator';
import { ScoreQueries } from './scoring-queries';
import {
  CalculationInput,
  CalculationResult,
  AchievementLevel,
  ACHIEVEMENT_MULTIPLIERS,
  getAchievementLabel,
  getAchievementStyle,
  validateAchievementLevel,
} from './scoring-types';

export class PointCalculationService {
  static async getAchievementMultipliers() {
    return ScoringCalculator.getAchievementMultipliers();
  }

  static async getActivityMultipliers(activityId: number) {
    return ScoringCalculator.getActivityMultipliers(activityId);
  }

  static async calculatePoints(input: CalculationInput) {
    return ScoringCalculator.calculatePoints(input);
  }

  static async saveCalculation(participationId: number, result: CalculationResult) {
    return ScoringCalculator.saveCalculation(participationId, result);
  }

  static async autoCalculateAfterEvaluation(participationId: number) {
    return ScoringCalculator.autoCalculateAfterEvaluation(participationId);
  }

  static async recalculateAll() {
    return ScoringCalculator.recalculateAll();
  }

  static async getStudentTotalScore(studentId: number) {
    return ScoreQueries.getStudentTotalScore(studentId);
  }

  static async getStudentScoreBreakdown(studentId: number) {
    return ScoreQueries.getStudentScoreBreakdown(studentId);
  }
}
