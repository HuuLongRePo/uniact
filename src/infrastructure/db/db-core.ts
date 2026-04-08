/**
 * Database Core Module
 * - SQLite3 initialization & configuration
 * - Connection pooling & transaction management
 * - Low-level DB operations (run, get, all)
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { applyAllMigrations } from '../../../scripts/migrations/run';

const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(process.cwd(), 'uniact.db');

let dbInstance: sqlite3.Database | null = null;

function getDbInstance(): sqlite3.Database {
  if (dbInstance) return dbInstance;

  const instance = new sqlite3.Database(dbPath);

  // Reduce SQLITE_BUSY errors under concurrent writes
  // See: https://www.sqlite.org/c3ref/busy_timeout.html
  try {
    const configurableDb = instance as sqlite3.Database & {
      configure?: (option: string, value: number) => void;
    };
    configurableDb.configure?.('busyTimeout', 5000);
  } catch {}

  // Fallback: PRAGMA busy_timeout
  instance.exec?.('PRAGMA busy_timeout=5000');
  instance.exec?.('PRAGMA foreign_keys=ON');
  // Improve dev performance and concurrency on SQLite
  instance.exec?.('PRAGMA journal_mode=WAL');
  instance.exec?.('PRAGMA synchronous=NORMAL');

  dbInstance = instance;
  return instance;
}

export const db = new Proxy({} as sqlite3.Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDbInstance() as object, prop, receiver);
  },
});

// ===== Low-level DB wrappers (used by queries) =====
export const dbRun = (sql: string, params: any[] = []) =>
  new Promise<{ lastID?: number; changes?: number }>((resolve, reject) => {
    getDbInstance().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

export const dbGet = (sql: string, params: any[] = []) =>
  new Promise<any>((resolve, reject) => {
    getDbInstance().get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

export const dbAll = (sql: string, params: any[] = []) =>
  new Promise<any[]>((resolve, reject) => {
    getDbInstance().all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

// ===== Database Initialization =====
let initialized = false;
let initializationPromise: Promise<void> | null = null;

const isNextBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PHASE === 'phase-export';

async function initializeDatabase(): Promise<void> {
  if (initialized) return;
  // Runtime request paths must not execute migrations.
  // In this project, running sqlite3 migrations inside Next dev/server workers can crash the process.
  // Migrations should be applied explicitly via scripts (`npm run db:migrate` / `npm run db:setup`).
  getDbInstance();
  initialized = true;
  console.warn('✅ Database connection ready');
}

// Avoid import-time migrations; they can destabilize Next dev/build workers.
// Call dbReady() explicitly on runtime paths that actually need DB bootstrap.

export async function dbReady(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase().catch((error) => {
      console.error('❌ dbReady initialization failed:', error);
      initializationPromise = null;
      throw error;
    });
  }
  return initializationPromise;
}

// ===== Transaction Helper =====
/**
 * Wraps operations in BEGIN/COMMIT with automatic rollback
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  // SQLite3 `Database` is a single connection; concurrent transactions can interleave
  // (`BEGIN` from tx B before `COMMIT` of tx A) unless we serialize them.
  const run = async () => {
    await dbRun('BEGIN TRANSACTION');
    try {
      const result = await fn();
      await dbRun('COMMIT');
      return result;
    } catch (err) {
      try {
        await dbRun('ROLLBACK');
      } catch {}
      throw err;
    }
  };

  const resultPromise = transactionQueue.then(run, run) as Promise<T>;
  // Keep the internal queue alive even if this transaction fails.
  transactionQueue = resultPromise.catch(() => undefined);
  return resultPromise;
}

// Serializes `withTransaction` calls to avoid interleaving BEGIN/COMMIT on a single connection.
let transactionQueue: Promise<unknown> = Promise.resolve();
