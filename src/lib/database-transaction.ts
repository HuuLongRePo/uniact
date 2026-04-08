/**
 * Database Transaction Wrapper
 *
 * Ensures atomic operations - either all succeed or all rollback
 * Prevents partial state changes (e.g., activity created but participation fails)
 *
 * ⚠️ SERVER-SIDE ONLY - Use in API routes
 */

'use server';

import sqlite3 from 'sqlite3';

type Database = sqlite3.Database;

interface TransactionOptions {
  readonly?: boolean;
}

/**
 * Helper: Execute SQL with promise wrapper
 */
function dbRun(
  db: Database,
  sql: string,
  params: any[] = []
): Promise<{ lastID?: number; changes?: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Helper: Query SQL with promise wrapper
 */
function dbGet(db: Database, sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Helper: Query all rows with promise wrapper
 */
function dbAll(db: Database, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Execute multiple SQL statements as atomic transaction
 *
 * @example
 * await transaction(db, async (tx) => {
 *   // Create activity
 *   const activity = await dbRun(tx, 'INSERT INTO activities (title) VALUES (?)', [title])
 *
 *   // Create participations
 *   for (const studentId of studentIds) {
 *     await dbRun(tx,
 *       'INSERT INTO participations (activity_id, student_id) VALUES (?, ?)',
 *       [activity.lastID, studentId]
 *     )
 *   }
 *
 *   return activity
 * })
 */
export async function transaction<T>(
  db: Database,
  fn: (
    tx: Database,
    helpers: { dbRun: typeof dbRun; dbGet: typeof dbGet; dbAll: typeof dbAll }
  ) => Promise<T> | T
): Promise<T> {
  return new Promise((resolve, reject) => {
    db.run('BEGIN', async (err) => {
      if (err) return reject(err);

      try {
        const result = await Promise.resolve(fn(db, { dbRun, dbGet, dbAll }));

        db.run('COMMIT', (commitErr) => {
          if (commitErr) return reject(commitErr);
          resolve(result);
        });
      } catch (error) {
        db.run('ROLLBACK', (rollbackErr) => {
          if (rollbackErr) console.error('Rollback error:', rollbackErr);
          reject(error);
        });
      }
    });
  });
}

/**
 * Batch insert with transaction
 */
export async function batchInsert(
  db: Database,
  table: string,
  records: Array<Record<string, any>>
): Promise<number[]> {
  if (records.length === 0) return [];

  return transaction(db, async (tx, { dbRun }) => {
    const firstRecord = records[0];
    const columns = Object.keys(firstRecord);
    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

    const ids: number[] = [];

    for (const record of records) {
      const values = columns.map((col) => record[col]);
      const result = await dbRun(tx, sql, values);
      if (result.lastID) ids.push(result.lastID);
    }

    return ids;
  });
}
