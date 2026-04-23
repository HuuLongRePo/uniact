import { test, expect } from '@playwright/test'
import { AdminHelper } from '../helpers/admin.helper'
import { StudentHelper } from '../helpers/student.helper'

async function ensureAwardType(adminPage: any) {
  const listRes = await adminPage.request.get('http://127.0.0.1:3000/api/admin/award-types', {
    timeout: 15_000,
  })
  expect(listRes.ok()).toBeTruthy()
  const listData = await listRes.json()
  const existing = listData?.data?.find((row: any) => String(row.name) === 'UAT Reward')
  if (existing?.id) return existing.id

  const createRes = await adminPage.request.post('http://127.0.0.1:3000/api/admin/award-types', {
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
    data: {
      name: 'UAT Reward',
      description: 'UAT award type',
      min_points: 5,
    },
  })
  expect(createRes.ok()).toBeTruthy()

  const refetchRes = await adminPage.request.get('http://127.0.0.1:3000/api/admin/award-types', {
    timeout: 15_000,
  })
  expect(refetchRes.ok()).toBeTruthy()
  const refetchData = await refetchRes.json()
  const created = refetchData?.data?.find((row: any) => String(row.name) === 'UAT Reward')
  expect(created?.id).toBeTruthy()
  return created.id
}

async function waitForApiMatch(
  page: any,
  url: string,
  getRows: (body: any) => any[],
  predicate: (row: any) => boolean,
  label: string,
  options?: {
    timeoutMs?: number
    intervalMs?: number
    requestTimeoutMs?: number
  }
) {
  const timeoutMs = options?.timeoutMs ?? 20_000
  const intervalMs = options?.intervalMs ?? 1_000
  const requestTimeoutMs = options?.requestTimeoutMs ?? 10_000
  const deadline = Date.now() + timeoutMs
  let lastBody: any = null
  let lastError: unknown = null

  while (Date.now() < deadline) {
    try {
      const res = await page.request.get(url, { timeout: requestTimeoutMs })
      if (!res.ok()) {
        lastError = new Error(`Request failed for ${label}: ${res.status()}`)
      } else {
        const body = await res.json().catch(() => ({}))
        lastBody = body
        const rows = getRows(body)
        const match = rows.find(predicate)
        if (match) {
          return { body, match }
        }
        lastError = new Error(`Not found yet: ${label}`)
      }
    } catch (error) {
      lastError = error
    }

    await page.waitForTimeout(intervalMs)
  }

  const bodySnippet = lastBody ? JSON.stringify(lastBody).slice(0, 600) : 'n/a'
  throw new Error(`Timeout waiting for ${label}. Last error: ${String(lastError)}. Last payload: ${bodySnippet}`)
}

test.describe('Student - Awards and notifications', () => {
  test.setTimeout(120_000)

  test('student sees new award and notification after admin grants it', async ({ browser }) => {
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const admin = new AdminHelper(adminPage)
    await admin.login()

    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()
    const student = new StudentHelper(studentPage)
    await student.login()

    const meRes = await studentPage.request.get('http://127.0.0.1:3000/api/auth/me', {
      timeout: 15_000,
    })
    expect(meRes.ok()).toBeTruthy()
    const meData = await meRes.json()
    const studentId = meData?.data?.user?.id ?? meData?.user?.id
    expect(studentId).toBeTruthy()

    const awardTypeId = await ensureAwardType(adminPage)
    const unique = Date.now()
    const awardName = `UAT Award ${unique}`

    const createAwardRes = await adminPage.request.post('http://127.0.0.1:3000/api/admin/awards/create', {
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
      data: {
        student_id: studentId,
        award_type_id: awardTypeId,
        award_name: awardName,
        points: 15,
        description: 'kiểm thử thông báo',
      },
    })
    expect(createAwardRes.ok()).toBeTruthy()

    const { match: awardNotification } = await waitForApiMatch(
      studentPage,
      'http://127.0.0.1:3000/api/notifications?per_page=20',
      (body: any) => body?.data?.notifications ?? body?.notifications ?? [],
      (row: any) => row.type === 'award' && String(row.message).includes(awardName),
      'award notification',
      { timeoutMs: 25_000, intervalMs: 1_000, requestTimeoutMs: 10_000 }
    )
    expect(awardNotification).toBeTruthy()
    expect(String(awardNotification?.title)).toBe('Giải thưởng mới')

    const { match: matchedAward } = await waitForApiMatch(
      studentPage,
      'http://127.0.0.1:3000/api/student/awards',
      (body: any) => body?.data?.awards ?? [],
      (row: any) => String(row.reason).includes(awardName),
      'student award record',
      { timeoutMs: 25_000, intervalMs: 1_000, requestTimeoutMs: 10_000 }
    )
    expect(matchedAward).toBeTruthy()
    expect(String(matchedAward?.award_type_name)).toBe('UAT Reward')

    const { match: historyMatch } = await waitForApiMatch(
      studentPage,
      'http://127.0.0.1:3000/api/student/awards/history',
      (body: any) => body?.data?.awards ?? body?.awards ?? [],
      (row: any) => String(row.reason).includes(awardName),
      'student award history',
      { timeoutMs: 25_000, intervalMs: 1_000, requestTimeoutMs: 10_000 }
    )
    expect(historyMatch).toBeTruthy()
    expect(String(historyMatch?.awardName)).toBe('UAT Reward')

    await studentContext.close()
    await adminContext.close()
  })
})
