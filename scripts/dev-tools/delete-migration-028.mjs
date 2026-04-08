import Database from 'better-sqlite3'

const db = new Database('uniact.db')
db.exec("DELETE FROM migrations WHERE version='028'")
console.log('✅ Deleted migration 028 record')
db.close()
