const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('uniact.db')

db.get(
  `SELECT 
    a.id, 
    a.title, 
    a.status, 
    a.approval_status, 
    a.teacher_id,
    u.email as teacher_email,
    u.name as teacher_name
  FROM activities a
  LEFT JOIN users u ON a.teacher_id = u.id
  WHERE a.id = ?`,
  [270],
  (err, row) => {
    if (err) {
      console.error('Error:', err)
      process.exit(1)
    }
    
    if (!row) {
      console.log('❌ Không tìm thấy hoạt động ID 270')
    } else {
      console.log('\n📋 Thông tin hoạt động ID 270:')
      console.log('=====================================')
      console.log('ID:', row.id)
      console.log('Tiêu đề:', row.title)
      console.log('Status:', row.status)
      console.log('Approval Status:', row.approval_status)
      console.log('Teacher ID:', row.teacher_id)
      console.log('Teacher Email:', row.teacher_email)
      console.log('Teacher Name:', row.teacher_name)
      console.log('=====================================\n')
      
      // Check conditions for "Gửi phê duyệt" button
      console.log('🔍 Kiểm tra điều kiện hiển thị nút "Gửi phê duyệt":')
      console.log('✓ Status phải là "draft":', row.status === 'draft' ? '✅ ĐÚng' : `❌ SAI (hiện tại: ${row.status})`)
      console.log('✓ Approval status phải là "draft" hoặc null:', (row.approval_status === 'draft' || !row.approval_status) ? '✅ ĐÚng' : `❌ SAI (hiện tại: ${row.approval_status})`)
      console.log('\n💡 Nếu status KHÔNG phải "draft", có thể do:')
      console.log('   - ENV variable AUTO_PUBLISH=true')
      console.log('   - Code tạo hoạt động bị sửa')
      console.log('   - Database trigger tự động chuyển status')
    }
    
    db.close()
  }
)
