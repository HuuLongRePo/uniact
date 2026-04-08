/**
 * Configuration & Helpers
 */

export type AchievementLevel = 'excellent' | 'good' | 'participated';

export const ACHIEVEMENT_MULTIPLIERS: Record<AchievementLevel, number> = {
  excellent: 1.5,
  good: 1.2,
  participated: 1.0,
};

export function getAchievementLabel(level: AchievementLevel | string): string {
  const labels: Record<string, string> = {
    excellent: 'Xuất sắc',
    good: 'Tốt',
    participated: 'Tham gia',
  };
  return labels[level] || level;
}

export function getAchievementStyle(level: AchievementLevel) {
  const styles: Record<AchievementLevel, { color: string; badge: string }> = {
    excellent: { color: 'text-yellow-600', badge: '🏆' },
    good: { color: 'text-blue-600', badge: '⭐' },
    participated: { color: 'text-green-600', badge: '✓' },
  };
  return styles[level] || { color: 'text-gray-600', badge: '○' };
}

export function validateAchievementLevel(level: any): level is AchievementLevel {
  return ['excellent', 'good', 'participated'].includes(level);
}

export interface CalculationInput {
  participationId: number;
  basePoints?: number;
  typeMultiplier?: number;
  levelMultiplier?: number;
  achievementMultiplier?: number;
  bonusPoints?: number;
  penaltyPoints?: number;
}

export interface CalculationResult {
  totalPoints: number;
  breakdown: {
    base: number;
    type: number;
    level: number;
    achievement: number;
    bonus: number;
    penalty: number;
  };
  formula: string;
}
