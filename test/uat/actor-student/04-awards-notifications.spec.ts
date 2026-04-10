import { test, expect } from '@playwright/test'
import { AdminHelper } from '../helpers/admin.helper'
import { StudentHelper } from '../helpers/student.helper'

async function ensureAwardType(adminPage: any) {
  const listRes = await adminPage.request.get('http://127.0.0.1:3000/api/admin/award-types')
  expect(listRes.ok()).toBeTruthy()
  const listData = await listRes.json()
  const existing = listData?.data?.find((row: any) => String(row.name) === 'UAT Reward')
  if (existing?.id) return existing.id

  const createRes = await adminPage.request.post('http://127.0.0.1:3000/api/admin/award-types', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      name: 'UAT Reward',
      description: 'UAT award type',
      min_points: 5,
    },
  })
  expect(createRes.ok()).toBeTruthy()

  const refetchRes = await adminPage.request.get('http://127.0.0.1:3000/api/admin/award-types')
  expect(refetchRes.ok()).toBeTruthy()
  const refetchData = await refetchRes.json()
  const created = refetchData?.data?.find((row: any) => String(row.name) === 'UAT Reward')
  expect(created?.id).toBeTruthy()
  return created.id
}

test.describe('Student - Awards and notifications', () => {
  test('student sees new award and notification after admin grants it', async ({ browser }) => {
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const admin = new AdminHelper(adminPage)
    await admin.login()

    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()
    const student = new StudentHelper(studentPage)
    await student.login()

    const meRes = await studentPage.request.get('http://127.0.0.1:3000/api/auth/me')
    expect(meRes.ok()).toBeTruthy()
    const meData = await meRes.json()
    const studentId = meData?.data?.user?.id ?? meData?.user?.id
    expect(studentId).toBeTruthy()

    const awardTypeId = await ensureAwardType(adminPage)
    const unique = Date.now()
    const awardName = `UAT Award ${unique}`

    const createAwardRes = await adminPage.request.post('http://127.0.0.1:3000/api/admin/awards/create', {
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

    const notificationsRes = await studentPage.request.get('http://127.0.0.1:3000/api/notifications?per_page=20')
    expect(notificationsRes.ok()).toBeTruthy()
    const notificationsData = await notificationsRes.json()
    const notifications = notificationsData?.data?.notifications ?? notificationsData?.notifications ?? []
    const awardNotification = notifications.find(
      (row: any) => row.type === 'award' && String(row.message).includes(awardName)
    )
    expect(awardNotification).toBeTruthy()
    expect(String(awardNotification?.title)).toBe('Giải thưởng mới')

    const awardsRes = await studentPage.request.get('http://127.0.0.1:3000/api/student/awards')
    expect(awardsRes.ok()).toBeTruthy()
    const awardsData = await awardsRes.json()
    const awards = awardsData?.data?.awards ?? []
    const matchedAward = awards.find((row: any) => String(row.reason).includes(awardName))
    expect(matchedAward).toBeTruthy()
    expect(String(matchedAward?.award_type_name)).toBe('UAT Reward')

    const historyRes = await studentPage.request.get('http://127.0.0.1:3000/api/student/awards/history')
    expect(historyRes.ok()).toBeTruthy()
    const historyData = await historyRes.json()
    const historyAwards = historyData?.data?.awards ?? historyData?.awards ?? []
    const historyMatch = historyAwards.find((row: any) => String(row.reason).includes(awardName))
    expect(historyMatch).toBeTruthy()
    expect(String(historyMatch?.awardName)).toBe('UAT Reward')

    await studentContext.close()
    await adminContext.close()
  })
})
