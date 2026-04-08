/**
 * Migration Runner
 * Applies all pending migrations to the database
 */

import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'

export async function applyAllMigrations(db: sqlite3.Database): Promise<void> {
  // Create migrations tracking table
  await new Promise<void>((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => (err ? reject(err) : resolve()))
  })

  // Get applied migrations
  const applied = new Set<string>()
  await new Promise<void>((resolve, reject) => {
    db.all('SELECT version FROM migrations', (err, rows: any[]) => {
      if (err) reject(err)
      else {
        rows?.forEach(r => applied.add(r.version))
        resolve()
      }
    })
  })

  // Load migration files
  const migrationsDir = path.join(__dirname)
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.match(/^\d{3}_.+\.ts$/))
    .sort()

  console.log(`Found ${files.length} migration files`)

  for (const file of files) {
    const version = file.split('_')[0]
    if (applied.has(version)) {
      console.log(`✓ Migration ${version} already applied`)
      continue
    }

    try {
      console.log(`Applying migration ${version}...`)
      
      // Import and run migration
      const migrationPath = path.join(migrationsDir, file)
      const migration = await import(migrationPath)
      
      if (migration.up) {
        await new Promise<void>((resolve, reject) => {
          migration.up({ run: (sql: string) => {
            db.run(sql, (err) => (err ? reject(err) : resolve()))
          }})()
        })
      }

      // Record migration
      await new Promise<void>((resolve, reject) => {
        const name = file.replace(/^\d{3}_/, '').replace('.ts', '')
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

// Export for use in other modules
if (require.main === module) {
  const db = new sqlite3.Database(':memory:')
  applyAllMigrations(db).catch(err => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
}
