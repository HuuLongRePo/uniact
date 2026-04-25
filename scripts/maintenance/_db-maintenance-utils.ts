import path from 'node:path'
import sqlite3 from 'sqlite3'

export type CliArgs = Record<string, string | boolean>

export function parseArgs(argv: string[] = process.argv.slice(2)): CliArgs {
  const args: CliArgs = {}

  for (const raw of argv) {
    if (!raw.startsWith('--')) {
      continue
    }

    const token = raw.slice(2)
    const eq = token.indexOf('=')

    if (eq === -1) {
      args[token] = true
      continue
    }

    const key = token.slice(0, eq)
    const value = token.slice(eq + 1)
    args[key] = value
  }

  return args
}

export function readArg(args: CliArgs, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = args[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return fallback
}

export function hasFlag(args: CliArgs, keys: string[]): boolean {
  return keys.some((key) => args[key] === true)
}

export function resolveDatabasePath(args: CliArgs): string {
  const raw = readArg(args, ['db', 'database'], process.env.DATABASE_URL || 'uniact.db')
  if (raw === ':memory:') {
    return raw
  }
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw)
}

export function formatVietnamTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const map = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value
    }
    return acc
  }, {})

  return `${map.year}-${map.month}-${map.day}_${map.hour}-${map.minute}-${map.second}`
}

export function humanBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function openSqlite(dbPath: string): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (error) => {
      if (error) {
        reject(error)
      } else {
        try {
          const configurable = db as sqlite3.Database & {
            configure?: (option: string, value: number) => void
          }
          configurable.configure?.('busyTimeout', 5000)
        } catch {}

        db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;', (pragmaErr) => {
          if (pragmaErr) {
            reject(pragmaErr)
          } else {
            resolve(db)
          }
        })
      }
    })
  })
}

export function closeSqlite(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()))
  })
}

export function dbRun(
  db: sqlite3.Database,
  sql: string,
  params: any[] = []
): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error)
      } else {
        resolve({
          lastID: (this as any)?.lastID ?? 0,
          changes: (this as any)?.changes ?? 0,
        })
      }
    })
  })
}

export function dbGet<T = any>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row as T | undefined)))
  })
}

export function dbAll<T = any>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve((rows || []) as T[])))
  })
}

export async function tableExists(db: sqlite3.Database, tableName: string): Promise<boolean> {
  const row = await dbGet<{ name?: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [tableName]
  )
  return Boolean(row?.name)
}

export async function getColumnNames(db: sqlite3.Database, tableName: string): Promise<Set<string>> {
  const rows = await dbAll<{ name?: string | null }>(db, `PRAGMA table_info(${tableName})`)
  return new Set(rows.map((row) => String(row?.name || '')))
}

export async function getIndexNames(db: sqlite3.Database, tableName: string): Promise<Set<string>> {
  const rows = await dbAll<{ name?: string | null }>(db, `PRAGMA index_list(${tableName})`)
  return new Set(rows.map((row) => String(row?.name || '')))
}

export function sqlLiteral(input: string): string {
  return `'${String(input).replace(/'/g, "''")}'`
}

