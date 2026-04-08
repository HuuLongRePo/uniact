import { dbRun, dbGet, dbAll } from './database';

async function loadArgon2() {
  return await import('argon2');
}

function normalize(answer: string): string {
  return answer
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export async function generateQuestions(userId: number): Promise<void> {
  const argon2 = await loadArgon2();
  // First activity
  const firstAct = (await dbGet(
    `SELECT a.title FROM attendance_records ar JOIN activities a ON ar.activity_id = a.id WHERE ar.student_id = ? ORDER BY ar.recorded_at ASC LIMIT 1`,
    [userId]
  )) as { title?: string } | undefined;
  if (firstAct?.title) {
    await dbRun(
      'INSERT INTO security_questions (user_id, question_type, question_text, answer_hash) VALUES (?,?,?,?)',
      [
        userId,
        'activity',
        'Hoạt động đầu tiên bạn tham gia là gì?',
        await argon2.hash(normalize(firstAct.title)),
      ]
    );
  }
  // Class size
  const classSize = (await dbGet(
    `SELECT COUNT(*) as count FROM users WHERE class_id = (SELECT class_id FROM users WHERE id = ?) AND role='student'`,
    [userId]
  )) as { count?: number } | undefined;
  if (classSize?.count !== undefined) {
    await dbRun(
      'INSERT INTO security_questions (user_id, question_type, question_text, answer_hash) VALUES (?,?,?,?)',
      [
        userId,
        'class',
        'Lớp bạn có bao nhiêu học viên?',
        await argon2.hash(String(classSize.count)),
      ]
    );
  }
}

export async function getQuestionsForUser(userId: number) {
  return await dbAll('SELECT id, question_text FROM security_questions WHERE user_id = ? LIMIT 3', [
    userId,
  ]);
}

export async function verifyAnswers(
  userId: number,
  answers: Array<{ questionId: number; answer: string }>
): Promise<boolean> {
  const argon2 = await loadArgon2();
  const recent = (await dbGet(
    `SELECT COUNT(*) as count FROM security_question_attempts WHERE user_id = ? AND attempted_at > datetime('now','-1 hour')`,
    [userId]
  )) as { count?: number } | undefined;
  if ((recent?.count || 0) >= 5) throw new Error('Too many attempts');
  let correct = 0;
  for (const a of answers) {
    const row = (await dbGet(
      'SELECT answer_hash FROM security_questions WHERE id = ? AND user_id = ?',
      [a.questionId, userId]
    )) as { answer_hash?: string } | undefined;
    if (row?.answer_hash && (await argon2.verify(row.answer_hash, normalize(a.answer)))) correct++;
  }
  const success = correct === answers.length;
  await dbRun('INSERT INTO security_question_attempts (user_id, success) VALUES (?,?)', [
    userId,
    success,
  ]);
  return success;
}
