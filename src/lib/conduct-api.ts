import { dbRun, dbGet, dbReady } from '@/lib/database';
import { withTransaction } from '@/lib/db-core';
import { evaluateRulesForStudent, applyRuleSuggestions } from './bonus-engine';

export interface CreateConductPayload {
  studentId: number;
  term: string;
  dailyScore?: number;
  weeklyScore?: number;
  finalConductScore: number;
}

export async function createConductAndTrigger(
  payload: CreateConductPayload,
  authorId: number | null = null
) {
  await dbReady();

  const { studentId, term, dailyScore, weeklyScore, finalConductScore } = payload;

  return await withTransaction(async () => {
    const res = await dbRun(
      `INSERT INTO conduct_scores (student_id, term, daily_score, weekly_score, final_conduct_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [studentId, term, dailyScore ?? null, weeklyScore ?? null, finalConductScore]
    );

    const suggestions = await evaluateRulesForStudent(studentId, term);
    const applyResults = await applyRuleSuggestions(suggestions, authorId, term);

    return { conductId: res.lastID, suggestions: applyResults };
  });
}

export default createConductAndTrigger;
