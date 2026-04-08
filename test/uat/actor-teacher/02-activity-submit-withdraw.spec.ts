import { test, expect } from '@playwright/test'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'

async function createDraftActivityViaApi(page: any) {
  const classesRes = await page.request.get('http://127.0.0.1:3000/api/classes?mine=1')
  expect(classesRes.ok()).toBeTruthy()
  const classesData = await classesRes.json()
  const classId = classesData?.data?.classes?.[0]?.id ?? classesData?.classes?.[0]?.id
  expect(classId).toBeTruthy()

  const typesRes = await page.request.get('http://127.0.0.1:3000/api/activity-types')
  expect(typesRes.ok()).toBeTruthy()
  const typesData = await typesRes.json()
  const activityTypeId = typesData?.types?.[0]?.id ?? typesData?.activityTypes?.[0]?.id
  expect(activityTypeId).toBeTruthy()

  const levelsRes = await page.request.get('http://127.0.0.1:3000/api/organization-levels')
  expect(levelsRes.ok()).toBeTruthy()
  const levelsData = await levelsRes.json()
  const organizationLevelId = levelsData?.levels?.[0]?.id ?? levelsData?.organization_levels?.[0]?.id
  expect(organizationLevelId).toBeTruthy()

  const unique = Date.now()
  const title = `UAT Activity ${unique}`
  const createRes = await page.request.post('http://127.0.0.1:3000/api/activities', {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Created by UAT backbone flow',
      date_time: '2026-12-31T09:00',
      location: 'Room UAT-101',
      max_participants: 30,
      class_ids: [classId],
      activity_type_id: activityTypeId,
      organization_level_id: organizationLevelId,
      files: [],
      status: 'draft',
    },
  })

  expect(createRes.ok()).toBeTruthy()
  const createData = await createRes.json()
  const activityId = createData?.data?.activity?.id ?? createData?.activity?.id ?? createData?.id
  expect(activityId).toBeTruthy()

  return { activityId, title }
}

test.describe('Teacher - Submit / withdraw activity flow', () => {
  test('teacher submits draft activity and admin approves it', async ({ browser }) => {
    const teacherContext = await browser.newContext()
    const teacherPage = await teacherContext.newPage()
    const teacher = new TeacherHelper(teacherPage)
    await teacher.login()

    const { activityId, title } = await createDraftActivityViaApi(teacherPage)

    const submitRes = await teacherPage.request.post(`http://127.0.0.1:3000/api/activities/${activityId}/submit-approval`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })
    expect(submitRes.ok()).toBeTruthy()

    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    const admin = new AdminHelper(adminPage)
    await admin.login()
    await adminPage.goto('/admin/approvals')
    await adminPage.waitForLoadState('domcontentloaded')
    await expect(adminPage.locator('body')).toContainText(/Phê Duyệt|duyệt|approval/i)
    await expect(adminPage.locator('body')).toContainText(title)

    const approveRes = await adminPage.request.post(`http://127.0.0.1:3000/api/activities/${activityId}/approve`, {
      headers: { 'Content-Type': 'application/json' },
      data: { notes: 'Approved by UAT' },
    })
    expect(approveRes.ok()).toBeTruthy()

    const activityRes = await teacherPage.request.get(`http://127.0.0.1:3000/api/activities/${activityId}`)
    expect(activityRes.ok()).toBeTruthy()
    const activityData = await activityRes.json()
    const activity = activityData?.data?.activity ?? activityData?.activity
    expect(activity?.status).toBe('published')
    expect(activity?.approval_status).toBe('approved')

    await teacherContext.close()
    await adminContext.close()
  })
})
