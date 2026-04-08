/**
 * Test Fresh Migration - Apply 000_base_schema to fresh DB and compare
 */
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

const freshDbPath = path.join(__dirname, 'uniact.db.fresh')
const backupDbPath = path.join(__dirname, 'uniact.db.backup.20260319')

async function runMigration() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(freshDbPath, async (err) => {
      if (err) return reject(err)
      
      try {
        console.log('📝 Applying migration 000_base_schema...\n')
        
        // Read and parse the TypeScript migration file
        const migrationCode = fs.readFileSync(
          path.join(__dirname, 'migrations/000_base_schema.ts'),
          'utf-8'
        )
        
        // Create a wrapper that executes SQL statements
        const sqlStatements = []
        const mockRun = (sql) => sqlStatements.push(sql)
        
        // Extract SQL between backticks
        const regex = /`([^`]+)`/g
        let match
        while ((match = regex.exec(migrationCode)) !== null) {
          sqlStatements.push(match[1])
        }
        
        console.log(`Found ${sqlStatements.length} SQL statements\n`)
        
        // Execute all SQL statements
        for (const sql of sqlStatements) {
          await new Promise((res, rej) => {
            db.run(sql, (err) => {
              if (err) {
                console.error(`❌ Error: ${err.message}`)
                console.error(`   SQL: ${sql.substring(0, 80)}...`)
                rej(err)
              } else {
                res()
              }
            })
          })
        }
        
        console.log('✅ Migration applied successfully\n')
        
        // Now compare schemas
        console.log('📊 Comparing schemas...\n')
        
        const getTables = (dbPath) => {
          return execSync(`sqlite3 "${dbPath}" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"`, {encoding: 'utf-8'})
            .split('\n')
            .filter(Boolean)
        }
        
        const freshTables = getTables(freshDbPath).sort()
        const backupTables = getTables(backupDbPath).sort()
        
        console.log(`Fresh DB tables: ${freshTables.length}`)
        console.log(`Backup DB tables: ${backupTables.length}\n`)
        
        // Check differences
        const missingInFresh = backupTables.filter(t => !freshTables.includes(t))
        const extraInFresh = freshTables.filter(t => !backupTables.includes(t))
        
        if (missingInFresh.length > 0) {
          console.log(`❌ Missing in fresh DB (${missingInFresh.length}):`)
          missingInFresh.forEach(t => console.log(`   - ${t}`))
        } else {
          console.log(`✅ All backup tables present in fresh DB`)
        }
        
        if (extraInFresh.length > 0) {
          console.log(`⚠️  Extra in fresh DB (${extraInFresh.length}):`)
          extraInFresh.forEach(t => console.log(`   - ${t}`))
        } else {
          console.log(`✅ No extra tables in fresh DB`)
        }
        
        // Check critical tables
        const criticalTables = ['activities', 'activity_approvals', 'participations', 'notifications']
        console.log('\n📋 Critical tables check:')
        for (const table of criticalTables) {
          if (freshTables.includes(table)) {
            const schema = execSync(`sqlite3 "${freshDbPath}" ".schema ${table}"|head -20|wc -l"`, {encoding:'utf-8'}).trim()
            console.log(`   ✅ ${table} (exists)`)
          } else {
            console.log(`   ❌ ${table} (MISSING)`)
          }
        }
        
        db.close()
        resolve()
      } catch (err) {
        db.close()
        reject(err)
      }
    })
  })
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration test complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Migration test failed:', err.message)
    process.exit(1)
  })
