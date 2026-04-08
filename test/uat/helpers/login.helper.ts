import { Page, expect } from '@playwright/test'
import { TEST_ACCOUNTS, BASE_URL } from './test-accounts'

export async function loginAs(page: Page, role: 'admin' | 'teacher' | 'student') {
  const account = TEST_ACCOUNTS[role]

  const maxRetries = 3
  let lastError: any
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await page.request.post(`${BASE_URL}/api/auth/login`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          email: account.email,
          password: account.password
        }
      })

      const data = await response.json()

      if (!response.ok()) {
        throw new Error(`Login failed: ${data?.error || response.status()}`)
      }

      const setCookieHeader = response.headers()['set-cookie']
      if (setCookieHeader) {
        const tokenMatch = setCookieHeader.match(/token=([^;]+)/)
        if (tokenMatch?.[1]) {
          await page.context().addCookies([
            {
              name: 'token',
              value: tokenMatch[1],
              url: BASE_URL,
              httpOnly: true,
              sameSite: 'Lax'
            }
          ])
        }
      } else if (data?.data?.token || data?.token) {
        const token = data?.data?.token || data?.token
        await page.context().addCookies([
          {
            name: 'token',
            value: token,
            url: BASE_URL,
            httpOnly: true,
            sameSite: 'Lax'
          }
        ])
      }

      const rolePathMap = {
        admin: '/admin/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student'
      }
      const targetPath = rolePathMap[role]
      await page.goto(`${BASE_URL}${targetPath}`)
      await page.waitForLoadState('networkidle')
      return account
    } catch (err) {
      lastError = err
      await page.waitForTimeout(300 * attempt)
    }
  }
  console.error('Login failed after retries:', lastError)
  throw lastError
}

export async function logout(page: Page) {
  await page.click('[data-testid="logout-button"], button:has-text("Đăng xuất"), button:has-text("Logout")')
  await page.waitForURL('**/login')
}
