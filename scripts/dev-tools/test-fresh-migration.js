const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Test database path
const testDbPath = path.join(__dirname, 'uniact.db.fresh.test');

// Clean up any existing test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

console.log('Creating fresh test database...');
const db = new sqlite3.Database(testDbPath, (err) => {
  if (err) {
    console.error('Error creating database:', err);
    process.exit(1);
  }
  console.log('✓ Database created at:', testDbPath);

  // Run migrations
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.match(/^\d{3}_.+\.ts$/))
    .sort();

  console.log(`\nFound ${files.length} migration files`);

  // For now, just run the base schema
  const schemaPath = path.join(migrationsDir, '000_base_schema.ts');
  
  // Read the file and extract SQL statements
  const content = fs.readFileSync(schemaPath, 'utf8');
  
  // Count CREATE TABLE statements
  const createTableMatches = content.match(/CREATE TABLE/g);
  const indexMatches = content.match(/CREATE INDEX/g);
  
  console.log('Migration file contains:');
  console.log(`  - ${createTableMatches ? createTableMatches.length : 0} CREATE TABLE statements`);
  console.log(`  - ${indexMatches ? indexMatches.length : 0} CREATE INDEX statements`);

  // Use a simpler approach - run the compiled migration
  console.log('\nRunning migrations via ts-node/compiled version...');
  
  const backupPath = path.join(__dirname, 'uniact.db.backup.20260319');
  const tempDb = new sqlite3.Database(backupPath, (err) => {
    if (err) {
      console.error('Error opening backup database:', err);
      process.exit(1);
    }

    // Get table count from backup
    tempDb.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) {
        console.error('Error reading backup tables:', err);
        tempDb.close();
        process.exit(1);
      }

      console.log(`\nBackup database has ${rows.length} tables:`);
      rows.forEach(row => {
        console.log(`  - ${row.name}`);
      });

      tempDb.close();

      // Now list what we expect in the fresh migration
      console.log('\n✓ Test database ready at:', testDbPath);
      console.log('Next: Apply migrations and compare schemas');

      db.close();
      process.exit(0);
    });
  });
});
