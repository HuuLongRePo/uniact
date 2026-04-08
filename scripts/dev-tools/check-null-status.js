const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('uniact.db')

db.all(
  `SELECT id, title, status, approval_status 
   FROM activities 
   WHERE status IS NULL OR approval_status IS NULL 
   ORDER BY id DESC 
   LIMIT 10`,
  (err, rows) => {
    if (err) {
      console.error('❌ Lỗi:', err)
      process.exit(1)
    }
    
    console.log('\n🔍 Hoạt động có status NULL:\n')
    
    if (rows.length === 0) {
      console.log('✅ Không có hoạt động nào khác bị lỗi status NULL')
    } else {
      console.log('⚠️  Tìm thấy', rows.length, 'hoạt động bị lỗi:\n')
      rows.forEach(a => {
        console.log(`ID ${a.id}: ${a.title}`)
        console.log(`   status = ${a.status}`)
        console.log(`   approval_status = ${a.approval_status}`)
        console.log('')
      })
    }
    
    db.close()
  }
)
