import { db } from './src/lib/db-core.js'

console.log('=== USERS TABLE ===')
const usersInfo = db.prepare('PRAGMA table_info(users)').all()
usersInfo.forEach(col => {
  console.log(`${col.name} (${col.type})`)
})

console.log('\n=== ACTIVITIES TABLE ===')
const activitiesInfo = db.prepare('PRAGMA table_info(activities)').all()
activitiesInfo.forEach(col => {
  console.log(`${col.name} (${col.type})`)
})
