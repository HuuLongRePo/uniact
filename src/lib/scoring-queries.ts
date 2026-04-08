/**
 * Student Score Queries
 */

import { dbGet, dbAll } from './database';

export class ScoreQueries {
  /**
   * Lấy tổng điểm của student
   */
  static async getStudentTotalScore(studentId: number): Promise<number> {
    const result = await dbGet(
      `
      SELECT COALESCE(SUM(points), 0) as total
      FROM student_scores
      WHERE student_id = ?
    `,
      [studentId]
    );

    return result?.total || 0;
  }

  /**
   * Lấy breakdown điểm của student
   */
  static async getStudentScoreBreakdown(studentId: number) {
    const scores = await dbAll(
      `
      SELECT 
        ss.points,
        ss.calculated_at,
        a.title as activity_title,
        at.name as activity_type,
        ol.name as organization_level,
        p.achievement_level,
        pc.formula
      FROM student_scores ss
      LEFT JOIN activities a ON ss.activity_id = a.id
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      LEFT JOIN participations p ON p.student_id = ss.student_id AND p.activity_id = ss.activity_id
      LEFT JOIN point_calculations pc ON pc.participation_id = p.id
      WHERE ss.student_id = ?
      ORDER BY ss.calculated_at DESC
    `,
      [studentId]
    );

    const byType = await dbAll(
      `
      SELECT 
        at.name as type_name,
        COUNT(*) as count,
        SUM(ss.points) as total_points
      FROM student_scores ss
      JOIN activities a ON ss.activity_id = a.id
      LEFT JOIN activity_types at ON a.activity_type_id = at.id
      WHERE ss.student_id = ?
      GROUP BY at.name
    `,
      [studentId]
    );

    const byLevel = await dbAll(
      `
      SELECT 
        ol.name as level_name,
        COUNT(*) as count,
        SUM(ss.points) as total_points
      FROM student_scores ss
      JOIN activities a ON ss.activity_id = a.id
      LEFT JOIN organization_levels ol ON a.organization_level_id = ol.id
      WHERE ss.student_id = ?
      GROUP BY ol.name
    `,
      [studentId]
    );

    return {
      total: await this.getStudentTotalScore(studentId),
      details: scores,
      byType,
      byLevel,
    };
  }
}
