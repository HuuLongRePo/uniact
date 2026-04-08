import { dbAll, dbGet, dbRun } from '@/lib/database';

export const allowedRoles = [
  'admin',
  'department_head',
  'vice_department_head',
  'class_manager',
  'staff',
  'teacher',
  'student',
];

// Ensure optional columns exist before using them
export async function ensureUserColumns(): Promise<{ hasCode: boolean; hasIsActive: boolean }> {
  const columns = (await dbAll('PRAGMA table_info(users)')) as Array<{ name: string }>;
  const names = new Set(columns.map((c) => c.name));
  const hasCode = names.has('code');
  const hasIsActive = names.has('is_active');

  if (!names.has('username')) {
    await dbRun('ALTER TABLE users ADD COLUMN username TEXT');
  }
  if (!names.has('phone')) {
    await dbRun('ALTER TABLE users ADD COLUMN phone TEXT');
  }
  if (!names.has('student_id')) {
    await dbRun('ALTER TABLE users ADD COLUMN student_id TEXT');
  }
  if (!names.has('student_code')) {
    await dbRun('ALTER TABLE users ADD COLUMN student_code TEXT');
  }
  if (!names.has('province')) {
    await dbRun('ALTER TABLE users ADD COLUMN province TEXT');
  }
  if (!names.has('district')) {
    await dbRun('ALTER TABLE users ADD COLUMN district TEXT');
  }
  if (!names.has('ward')) {
    await dbRun('ALTER TABLE users ADD COLUMN ward TEXT');
  }
  if (!names.has('address_detail')) {
    await dbRun('ALTER TABLE users ADD COLUMN address_detail TEXT');
  }
  if (!names.has('updated_at')) {
    // SQLite cannot add a column with DEFAULT CURRENT_TIMESTAMP via ALTER TABLE.
    await dbRun('ALTER TABLE users ADD COLUMN updated_at DATETIME');
    await dbRun(
      'UPDATE users SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)'
    );
  }

  // Student profile fields (some DBs rely on migrations; keep this idempotent here too)
  if (!names.has('gender')) {
    await dbRun('ALTER TABLE users ADD COLUMN gender TEXT');
  }
  if (!names.has('date_of_birth')) {
    await dbRun('ALTER TABLE users ADD COLUMN date_of_birth TEXT');
  }

  // Teacher profile fields
  if (!names.has('teacher_rank')) {
    await dbRun('ALTER TABLE users ADD COLUMN teacher_rank TEXT');
  }
  if (!names.has('academic_title')) {
    await dbRun('ALTER TABLE users ADD COLUMN academic_title TEXT');
  }
  if (!names.has('academic_degree')) {
    await dbRun('ALTER TABLE users ADD COLUMN academic_degree TEXT');
  }

  if (!hasCode) {
    await dbRun('ALTER TABLE users ADD COLUMN code TEXT');
  }
  if (!hasIsActive) {
    await dbRun('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1');
  }

  // Best-effort indexes (idempotent)
  await dbRun('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_users_code ON users(code)');
  await dbRun('CREATE INDEX IF NOT EXISTS idx_users_student_code ON users(student_code)');

  return { hasCode: true, hasIsActive: true };
}

export function roleToCodePrefix(role: string): { prefix: string; digitLength: number } {
  const adminLikeRoles = new Set([
    'admin',
    'department_head',
    'vice_department_head',
    'class_manager',
    'staff',
  ]);

  const yearBasedPrefix = role === 'teacher' ? 'GV' : adminLikeRoles.has(role) ? 'AD' : 'SV';
  const digitLength = role === 'student' ? 6 : 3;
  return { prefix: yearBasedPrefix, digitLength };
}

export async function generateUserCode(role: string): Promise<string> {
  await ensureUserColumns();
  const currentYear = new Date().getFullYear();
  const { prefix, digitLength } = roleToCodePrefix(role);
  const pattern = `${prefix}${currentYear}%`;

  const last = (await dbGet(
    `SELECT code FROM users 
     WHERE code LIKE ? 
     ORDER BY code DESC LIMIT 1`,
    [pattern]
  )) as any;

  if (last?.code && typeof last.code === 'string' && last.code.startsWith(prefix + currentYear)) {
    const sequencePart = last.code.substring(prefix.length + 4);
    const nextSequence = parseInt(sequencePart || '0', 10) + 1;
    return `${prefix}${currentYear}${String(nextSequence).padStart(digitLength, '0')}`;
  }

  return `${prefix}${currentYear}${'0'.repeat(digitLength - 1)}1`;
}
