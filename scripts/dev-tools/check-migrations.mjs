import Database from 'better-sqlite3'

async function check() {
  const db = new Database('uniact.db')

  console.log('Latest migrations:')
  const migrations = db.prepare('SELECT id, name FROM migrations ORDER BY id DESC LIMIT 5').all()
  migrations.forEach(m => console.log(`  ${m.id}. ${m.name}`))

  console.log('\nAlerts table indexes:')
  const alertIndexes = db.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='index' AND tbl_name='alerts'
  `).all()
  alertIndexes.forEach(idx => console.log(`  - ${idx.name}`))

  console.log('\nChecking alerts table schema:')
  const alertSchema = db.prepare('PRAGMA table_info(alerts)').all()
  alertSchema.forEach(col => console.log(`  - ${col.name} (${col.type})`))

  db.close()
}

check()
