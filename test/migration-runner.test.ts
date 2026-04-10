import { describe, it, expect } from 'vitest'
import sqlite3 from 'sqlite3'
import path from 'path'
import { applyAllMigrations } from '../scripts/migrations/run'

describe('Migration Runner', () => {
  it('applies all migrations in order and records them', async () => {
    const db = new sqlite3.Database(':memory:')
    await applyAllMigrations(db)
    const rows: any = await new Promise((resolve, reject) => {
      db.all('SELECT version, name FROM migrations ORDER BY version', (err, r) => err ? reject(err) : resolve(r))
    })
    const versions = rows.map((r: any) => r.version)
    
    // Current runner uses the consolidated baseline migration.
    expect(versions).toEqual(['000'])
    expect(rows[0].name).toBe('base_schema')
  })
})
