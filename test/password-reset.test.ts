import { describe, it, expect } from 'vitest'
import { POST as requestReset } from '@/app/api/auth/request-password-reset/route'
import { POST as confirmReset } from '@/app/api/auth/confirm-password-reset/route'
import { dbReady, dbRun, dbGet } from '@/lib/database'
import bcrypt from 'bcryptjs'
import { loginUser } from '@/lib/auth'

// Helper to create a user directly
async function createTestUser(email: string, password: string, name: string) {
  const hash = await bcrypt.hash(password, 4)
  await dbRun('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', [email, hash, name, 'student'])
  const row = await dbGet('SELECT id, email, name, role, password_hash FROM users WHERE email = ?', [email])
  return row
}

describe('Password Reset Flow', () => {
  it('should request and confirm password reset successfully', async () => {
    await dbReady()
    
    // Ensure password_reset_requests table exists
    await dbRun(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `)
    
    const user = await createTestUser('reset.user@example.com', 'oldpass123', 'Reset User')

    // Request reset
    const req = new Request('http://localhost/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email: user.email })
    })
    const res = await requestReset(req as any)
    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.reset_token).toBeDefined()

    // Confirm reset
    const newPass = 'newpass456'
    const confirmReq = new Request('http://localhost/api/auth/confirm-password-reset', {
      method: 'POST',
      body: JSON.stringify({ token: data.reset_token, new_password: newPass })
    })
    const confirmRes = await confirmReset(confirmReq as any)
    expect(confirmRes.status).toBe(200)
    const confirmData = await confirmRes.json() as any
    expect(confirmData.message).toMatch(/Đặt lại mật khẩu thành công/i)

    // Login with new password
    const login = await loginUser({ email: user.email, password: newPass })
    expect(login.token).toBeDefined()
    expect(login.user.email).toBe(user.email)
  })
})
