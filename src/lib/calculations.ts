/**
 * Calculation Utilities
 * Shared calculation logic used across multiple modules
 * Prevents duplicate calculation code and ensures consistency
 */

/**
 * Calculate attendance rate as percentage
 *
 * @param presentCount - Number of attended sessions
 * @param totalCount - Total number of sessions
 * @returns Percentage with 1 decimal place (0-100)
 *
 * @example
 * calculateAttendanceRate(18, 20) // 90.0
 * calculateAttendanceRate(0, 5) // 0.0
 */
export function calculateAttendanceRate(presentCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  const rate = (presentCount / totalCount) * 100;
  return Number(rate.toFixed(1));
}

/**
 * Calculate participation rate (registered + attended)
 *
 * @param registeredCount - Number of registered students
 * @param totalCount - Total number of students in class
 * @returns Participation percentage (0-100)
 */
export function calculateParticipationRate(registeredCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  const rate = (registeredCount / totalCount) * 100;
  return Number(rate.toFixed(1));
}

/**
 * Calculate point-based achievement percentage
 *
 * @param earnedPoints - Points earned by student
 * @param maxPoints - Maximum possible points
 * @returns Achievement percentage (0-100)
 *
 * @example
 * calculateAchievementPercentage(85, 100) // 85.0
 */
export function calculateAchievementPercentage(earnedPoints: number, maxPoints: number): number {
  if (maxPoints <= 0) return 0;
  const pct = (earnedPoints / maxPoints) * 100;
  return Number(pct.toFixed(1));
}

/**
 * Calculate student rank based on score comparison
 * Returns 1-based ranking (1st place, 2nd place, etc.)
 *
 * @param studentScore - Student's score
 * @param allScores - Array of all scores in class
 * @returns Rank (1-based, where 1 is highest)
 *
 * @example
 * calculateRank(85, [95, 85, 75, 65]) // 2
 */
export function calculateRank(studentScore: number, allScores: number[]): number {
  const validScores = allScores.filter(s => Number.isFinite(s) && s > 0);
  const scoresHigherOrEqual = validScores.filter(s => s >= studentScore);
  return scoresHigherOrEqual.length;
}

/**
 * Calculate weighted score (with point multiplier)
 *
 * @param score - Base score
 * @param weight - Multiplier (e.g., 1.0, 1.5 for bonus)
 * @returns Weighted score
 *
 * @example
 * calculateWeightedScore(90, 1.5) // 135
 */
export function calculateWeightedScore(score: number, weight: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(weight)) return 0;
  return Number((score * weight).toFixed(2));
}

/**
 * Calculate cumulative percentage growth between two values
 * Useful for tracking progress/improvement
 *
 * @param previousValue - Starting value
 * @param currentValue - Ending value
 * @returns Percentage change (negative for decline)
 *
 * @example
 * calculateGrowthPercentage(80, 90) // 12.5
 * calculateGrowthPercentage(100, 85) // -15.0
 */
export function calculateGrowthPercentage(previousValue: number, currentValue: number): number {
  if (previousValue === 0) return currentValue === 0 ? 0 : 100;
  const growth = ((currentValue - previousValue) / previousValue) * 100;
  return Number(growth.toFixed(1));
}

/**
 * Calculate average score from array
 *
 * @param scores - Array of numeric scores
 * @returns Average score (0 if no valid scores)
 *
 * @example
 * calculateAverage([85, 90, 95]) // 90
 */
export function calculateAverage(scores: number[]): number {
  if (!scores || scores.length === 0) return 0;
  const validScores = scores.filter(s => Number.isFinite(s));
  if (validScores.length === 0) return 0;
  const sum = validScores.reduce((a, b) => a + b, 0);
  return Number((sum / validScores.length).toFixed(1));
}

/**
 * Calculate standard deviation of scores
 * Measures consistency/variance in performance
 *
 * @param scores - Array of numeric scores
 * @returns Standard deviation
 */
export function calculateStandardDeviation(scores: number[]): number {
  if (!scores || scores.length < 2) return 0;

  const validScores = scores.filter(s => Number.isFinite(s));
  if (validScores.length < 2) return 0;

  const avg = calculateAverage(validScores);
  const squareDiffs = validScores.map(score => Math.pow(score - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / validScores.length;
  const stdDev = Math.sqrt(avgSquareDiff);

  return Number(stdDev.toFixed(2));
}

/**
 * Calculate activity completion time in hours from timestamps
 *
 * @param startTime - Start datetime string or Date
 * @param endTime - End datetime string or Date
 * @returns Duration in hours
 */
export function calculateDurationHours(startTime: string | Date, endTime: string | Date): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
}

/**
 * Calculate achievement level based on score percentage
 * Maps numeric percentage to Vietnamese achievement levels
 *
 * @param percentage - Percentage (0-100)
 * @returns Achievement level: 'excellent' | 'good' | 'participated' | 'poor'
 *
 * @example
 * calculateAchievementLevel(95) // 'excellent'
 * calculateAchievementLevel(75) // 'good'
 */
export function calculateAchievementLevel(percentage: number): 'excellent' | 'good' | 'participated' | 'poor' {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 75) return 'good';
  if (percentage >= 50) return 'participated';
  return 'poor';
}

/**
 * Calculate points based on performance level and activity base points
 *
 * @param achievementLevel - Achievement level
 * @param basePoints - Base points allocated to activity
 * @returns Points awarded (0 if poor performance)
 *
 * @example
 * calculateAwardedPoints('excellent', 10) // 10
 * calculateAwardedPoints('good', 10) // 8
 * calculateAwardedPoints('participated', 10) // 5
 */
export function calculateAwardedPoints(
  achievementLevel: 'excellent' | 'good' | 'participated' | 'poor',
  basePoints: number
): number {
  if (!basePoints || basePoints <= 0) return 0;

  switch (achievementLevel) {
    case 'excellent':
      return basePoints;
    case 'good':
      return Math.ceil(basePoints * 0.8);
    case 'participated':
      return Math.ceil(basePoints * 0.5);
    case 'poor':
    default:
      return 0;
  }
}
