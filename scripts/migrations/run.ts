/**
 * Migration Runner
 * Applies all pending migrations to the project SQLite database
 */

import sqlite3 from 'sqlite3'
import path from 'path'
import { up as upBaseSchema } from '../../migrations/000_base_schema'

type MigrationRunner = (db: { run: (sql: string) => Promise<void> }) => Promise<void>

interface MigrationDefinition {
  version: string
  name: string
  up: MigrationRunner
}

const MIGRATIONS: MigrationDefinition[] = [
  {
    version: '000',
    name: 'base_schema',
    up: upBaseSchema,
  },
]

export async function applyAllMigrations(db: sqlite3.Database): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => (err ? reject(err) : resolve())
    )
  })

  const applied = new Set<string>()
  await new Promise<void>((resolve, reject) => {
    db.all('SELECT version FROM migrations', (err, rows: any[]) => {
      if (err) reject(err)
      else {
        rows?.forEach((r) => applied.add(r.version))
        resolve()
      }
    })
  })

  console.log(`Found ${MIGRATIONS.length} migration files`)

  for (const migration of MIGRATIONS) {
    const { version, name, up } = migration
    if (applied.has(version)) {
      console.log(`✓ Migration ${version} already applied`)
      continue
    }

    try {
      console.log(`Applying migration ${version}...`)

      await up({
        run: (sql: string) =>
          new Promise<void>((resolve, reject) => {
            db.run(sql, (err) => (err ? reject(err) : resolve()))
          }),
      })

      await new Promise<void>((resolve, reject) => {
        db.run(
          'INSERT INTO migrations (version, name) VALUES (?, ?)',
          [version, name],
          (err) => (err ? reject(err) : resolve())
        )
      })

      console.log(`✓ Migration ${version} applied successfully`)
    } catch (err) {
      console.error(`✗ Failed to apply migration ${version}:`, err)
      throw err
    }
  }

  console.log('All migrations applied successfully')
}

if (require.main === module) {
  const dbPath = process.env.DATABASE_URL
    ? path.resolve(process.cwd(), process.env.DATABASE_URL)
    : path.join(process.cwd(), 'uniact.db')

  console.log(`Using database: ${dbPath}`)

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open database:', err)
      process.exit(1)
    }
  })

  db.exec('PRAGMA foreign_keys=ON;', async (pragmaErr) => {
    if (pragmaErr) {
      console.error('Failed to enable foreign keys:', pragmaErr)
      db.close()
      process.exit(1)
      return
    }

    try {
      await applyAllMigrations(db)
      db.close((closeErr) => {
        if (closeErr) {
          console.error('Failed to close database:', closeErr)
          process.exit(1)
        }
      })
    } catch (err) {
      console.error('Migration failed:', err)
      db.close(() => process.exit(1))
    }
  })
}
