/**
 * Optimistic Locking & Concurrency Control
 *
 * Prevent race conditions (e.g., overbooking activities)
 * Uses version field for conflict detection and retry logic
 *
 * ⚠️ SERVER-SIDE ONLY - Use in API routes
 */

'use server';

import sqlite3 from 'sqlite3';

type Database = sqlite3.Database;

interface LockOptions {
  maxRetries?: number;
  retryDelayMs?: number;
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
 * Helper: Query single row with promise wrapper
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
 * Optimistic lock pattern for updates
 *
 * Increments version field - if version changed since read, conflict detected
 */
export async function optimisticUpdate(
  db: Database,
  options: {
    table: string;
    id: string | number;
    currentVersion: number;
    updates: Record<string, any>;
    idColumn?: string;
    versionColumn?: string;
  }
): Promise<boolean> {
  const {
    table,
    id,
    currentVersion,
    updates,
    idColumn = 'id',
    versionColumn = 'version',
  } = options;

  const columns = Object.keys(updates);
  const setClauses = columns.map((col) => `${col} = ?`).join(', ');
  const newVersion = currentVersion + 1;

  const sql = `
    UPDATE ${table} 
    SET ${setClauses}, ${versionColumn} = ? 
    WHERE ${idColumn} = ? AND ${versionColumn} = ?
  `;

  const values = [...columns.map((col) => updates[col]), newVersion, id, currentVersion];

  const result = await dbRun(db, sql, values);

  // If no rows updated, version conflict occurred
  return (result.changes || 0) > 0;
}

/**
 * Retry optimistic update on conflict
 */
export async function retryOptimisticUpdate<T>(
  db: Database,
  updateFn: (current: any) => Partial<T>,
  options: {
    table: string;
    id: string | number;
    idColumn?: string;
    versionColumn?: string;
    maxRetries?: number;
    retryDelayMs?: number;
  }
): Promise<boolean> {
  const {
    table,
    id,
    idColumn = 'id',
    versionColumn = 'version',
    maxRetries = 3,
    retryDelayMs = 50,
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Read current state
    const current = await dbGet(db, `SELECT * FROM ${table} WHERE ${idColumn} = ?`, [id]);

    if (!current) {
      throw new Error(`Record not found: ${table}.${id}`);
    }

    // Calculate updates
    const updates = updateFn(current);

    // Try update
    const success = await optimisticUpdate(db, {
      table,
      id,
      currentVersion: current[versionColumn],
      updates,
      idColumn,
      versionColumn,
    });

    if (success) {
      return true;
    }

    // Conflict - retry if attempts remain
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return false;
}

/**
 * Conflict detection helper
 * Check if record changed since last read
 */
export async function hasConflict(
  db: Database,
  table: string,
  id: string | number,
  previousVersion: number,
  idColumn: string = 'id',
  versionColumn: string = 'version'
): Promise<boolean> {
  const current = await dbGet(db, `SELECT ${versionColumn} FROM ${table} WHERE ${idColumn} = ?`, [
    id,
  ]);

  return current && current[versionColumn] !== previousVersion;
}
