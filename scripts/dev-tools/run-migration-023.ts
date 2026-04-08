import sqlite3 from 'sqlite3'
import path from 'path'
import { migration as m023 } from './scripts/migrations/023_drop_class_ids_from_activities'

const db = new sqlite3.Database(path.join(process.cwd(), 'uniact.db'))

async function main() {
  console.log('Running migration 023...')
  await m023.up(db)
  console.log('✅ Migration 023 applied')
  await new Promise<void>((resolve) => {
    db.all('PRAGMA table_info(activities)', (err, rows: any[]) => {
      if (err) {
        console.error('Verification failed:', err)
      } else {
        const hasClassIds = rows.some(r => r.name === 'class_ids')
        console.log('class_ids column present:', hasClassIds)
      }
      resolve()
    })
  })
  db.close()
}

main().catch(err => {
  console.error('❌ Migration failed:', err)
  db.close()
  process.exit(1)
})
