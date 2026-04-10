import { Page } from '@playwright/test'
import { TEST_ACCOUNTS, BASE_URL } from './test-accounts'

const rolePathMap = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard'
} as const

async function applyAuthCookie(page: Page, token: string) {
  await page.context().clearCookies()
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

let loginRequestCounter = 0

function getTestForwardedFor(role: 'admin' | 'teacher' | 'student') {
  loginRequestCounter += 1

  const roleBase =
    role === 'admin'
      ? 11
      : role === 'teacher'
        ? 12
        : 13

  const hostPart = (loginRequestCounter % 200) + 1
  return `127.0.${roleBase}.${hostPart}`
}

export async function loginAs(page: Page, role: 'admin' | 'teacher' | 'student') {
  const account = TEST_ACCOUNTS[role]

  // Reuse valid session if page/context is already authenticated.
  try {
    const meRes = await page.request.get(`${BASE_URL}/api/auth/me`)
    if (meRes.ok()) {
      const meData = await meRes.json()
      const currentRole = meData?.data?.user?.role ?? meData?.user?.role
      if (currentRole === role) {
        await page.goto(`${BASE_URL}${rolePathMap[role]}`)
        await page.waitForLoadState('domcontentloaded')
        return account
      }
    }
  } catch {}

  const maxRetries = 2
  let lastError: any
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await page.request.post(`${BASE_URL}/api/auth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': getTestForwardedFor(role)
        },
        data: {
          email: account.email,
          password: account.password
        }
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok()) {
        throw new Error(`Login failed: ${data?.error || response.status()}`)
      }

      const setCookieHeader = response.headers()['set-cookie']
      let token: string | undefined
      if (setCookieHeader) {
        const tokenMatch = setCookieHeader.match(/token=([^;]+)/)
        token = tokenMatch?.[1]
      }
      if (!token) {
        token = data?.data?.token || data?.token
      }
      if (!token) {
        throw new Error('Login succeeded but no auth token/cookie was returned')
      }

      await applyAuthCookie(page, token)
      await page.goto(`${BASE_URL}${rolePathMap[role]}`)
      await page.waitForLoadState('domcontentloaded')
      return account
    } catch (err) {
      lastError = err
      if (!page.isClosed()) {
        await page.waitForTimeout(250 * attempt)
      }
    }
  }
  console.error('Login failed after retries:', lastError)
  throw lastError
}

export async function logout(page: Page) {
  await page.click('[data-testid="logout-button"], button:has-text("Đăng xuất"), button:has-text("Logout")')
  await page.waitForURL('**/login')
}
