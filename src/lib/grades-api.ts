import { dbRun, dbGet, dbReady } from '@/lib/database';
import { withTransaction } from '@/lib/db-core';
import { evaluateRulesForStudent, applyRuleSuggestions } from './bonus-engine';

export interface CreateGradePayload {
  studentId: number;
  subjectId: number;
  term: string;
  componentsJson?: any;
  finalScore: number;
  credits?: number;
}

export async function createGradeAndTrigger(
  payload: CreateGradePayload,
  authorId: number | null = null
) {
  await dbReady();

  const { studentId, subjectId, term, componentsJson, finalScore, credits } = payload;

  return await withTransaction(async () => {
    const gpaContrib = (Number(finalScore) || 0) * (Number(credits) || 1);

    const res = await dbRun(
      `INSERT INTO grades (student_id, subject_id, term, components_json, final_score, gpa_contrib, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        studentId,
        subjectId,
        term,
        componentsJson ? JSON.stringify(componentsJson) : null,
        finalScore,
        gpaContrib,
      ]
    );

    const suggestions = await evaluateRulesForStudent(studentId, term);
    const applyResults = await applyRuleSuggestions(suggestions, authorId, term);

    return { gradeId: res.lastID, suggestions: applyResults };
  });
}

export default createGradeAndTrigger;
