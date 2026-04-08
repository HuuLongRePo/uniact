const sqlite3 = require('sqlite3');
const path = require('path');
const { migration: m022 } = require('./scripts/migrations/022_normalize_activity_classes');

const db = new sqlite3.Database(path.join(__dirname, 'uniact.db'));

console.log('Running migration 022...');
m022.up(db).then(() => {
  console.log('✅ Migration 022 applied');
  
  // Verify
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_classes'", (err, rows) => {
    console.log('activity_classes exists:', rows?.length > 0);
    db.close();
    process.exit(0);
  });
}).catch(err => {
  console.error('❌ Migration failed:', err);
  db.close();
  process.exit(1);
});
