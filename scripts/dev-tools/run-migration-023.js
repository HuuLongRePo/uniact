const sqlite3 = require('sqlite3');
const path = require('path');
const { migration: m023 } = require('./scripts/migrations/023_drop_class_ids_from_activities');

const db = new sqlite3.Database(path.join(__dirname, 'uniact.db'));

console.log('Running migration 023...');
m023.up(db).then(() => {
  console.log('✅ Migration 023 applied');
  // Verify column dropped
  db.all("PRAGMA table_info(activities)", (err, rows) => {
    if (err) {
      console.error('Verification failed:', err);
    } else {
      const hasClassIds = rows.some(r => r.name === 'class_ids');
      console.log('class_ids column present:', hasClassIds);
    }
    db.close();
    process.exit(0);
  });
}).catch(err => {
  console.error('❌ Migration failed:', err);
  db.close();
  process.exit(1);
});
