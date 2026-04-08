const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('uniact.db')

console.log('🔧 Đang sửa hoạt động ID 270...\n')

db.run(
  `UPDATE activities 
   SET status = 'draft', 
       approval_status = 'draft'
   WHERE id = 270`,
  function(err) {
    if (err) {
      console.error('❌ Lỗi:', err)
      process.exit(1)
    }
    
    console.log(`✅ Đã cập nhật ${this.changes} hoạt động`)
    
    // Verify
    db.get(
      `SELECT id, title, status, approval_status FROM activities WHERE id = 270`,
      (err, row) => {
        if (err) {
          console.error('❌ Lỗi verify:', err)
          db.close()
          process.exit(1)
        }
        
        console.log('\n📋 Thông tin sau khi cập nhật:')
        console.log('=====================================')
        console.log('ID:', row.id)
        console.log('Tiêu đề:', row.title)
        console.log('Status:', row.status)
        console.log('Approval Status:', row.approval_status)
        console.log('=====================================\n')
        console.log('✅ Bây giờ bạn sẽ thấy nút "Gửi phê duyệt" khi truy cập /teacher/activities/270')
        console.log('💡 Refresh trang nếu đang mở: Ctrl+Shift+R\n')
        
        db.close()
      }
    )
  }
)
