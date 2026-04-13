import { test, expect } from '@playwright/test'
import { StudentHelper } from '../helpers/student.helper'
import { TeacherHelper } from '../helpers/teacher.helper'
import { AdminHelper } from '../helpers/admin.helper'
import { BASE_URL } from '../helpers/test-accounts'

async function createAndApproveActivity(browser: any) {
  const studentContext = await browser.newContext()
  const studentPage = await studentContext.newPage()
  const student = new StudentHelper(studentPage)
  await student.login()

  const meRes = await studentPage.request.get(`${BASE_URL}/api/auth/me`)
  expect(meRes.ok()).toBeTruthy()
  const meData = await meRes.json()
  const classId = meData?.data?.user?.class_id ?? meData?.user?.class_id
  expect(classId).toBeTruthy()
  await studentContext.close()

  const teacherContext = await browser.newContext()
  const teacherPage = await teacherContext.newPage()
  const teacher = new TeacherHelper(teacherPage)
  await teacher.login()

  const typesRes = await teacherPage.request.get(`${BASE_URL}/api/activity-types`)
  expect(typesRes.ok()).toBeTruthy()
  const typesData = await typesRes.json()
  const activityTypeId = typesData?.types?.[0]?.id ?? typesData?.activityTypes?.[0]?.id
  expect(activityTypeId).toBeTruthy()

  const levelsRes = await teacherPage.request.get(`${BASE_URL}/api/organization-levels`)
  expect(levelsRes.ok()).toBeTruthy()
  const levelsData = await levelsRes.json()
  const organizationLevelId = levelsData?.levels?.[0]?.id ?? levelsData?.organization_levels?.[0]?.id
  expect(organizationLevelId).toBeTruthy()

  const unique = Date.now()
  const title = `UAT Register ${unique}`
  const minute = String(unique % 60).padStart(2, '0')
  const createRes = await teacherPage.request.post(`${BASE_URL}/api/activities`, {
    headers: { 'Content-Type': 'application/json' },
    data: {
      title,
      description: 'Published by UAT for student registration',
      date_time: `2028-12-31T09:${minute}`,
      location: 'Room REG-201',
      max_participants: 30,
      class_ids: [],
      voluntary_class_ids: [classId],
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

  const submitRes = await teacherPage.request.post(`${BASE_URL}/api/activities/${activityId}/submit-approval`, {
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
    data: {},
  })
  expect(submitRes.ok()).toBeTruthy()

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  const admin = new AdminHelper(adminPage)
  await admin.login()

  const approveRes = await adminPage.request.post(`${BASE_URL}/api/activities/${activityId}/approve`, {
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
    data: { notes: 'Approved for student registration UAT' },
  })
  expect(approveRes.ok()).toBeTruthy()

  await teacherContext.close()
  await adminContext.close()

  return { activityId, title }
}

test.describe('Student - Discovery and registration backbone', () => {
  test('student can log in, see a published activity, and register', async ({ browser }) => {
    test.setTimeout(60_000)

    const { activityId, title } = await createAndApproveActivity(browser)

    const studentContext = await browser.newContext()
    const studentPage = await studentContext.newPage()
    const student = new StudentHelper(studentPage)
    await student.login()

    await studentPage.goto(`${BASE_URL}/student/activities`)
    await studentPage.waitForLoadState('domcontentloaded')
    await expect(studentPage.locator('body')).toContainText(/Hoạt động|Activities/i)
    await expect(studentPage.locator('body')).toContainText(title)

    let registerRes = await studentPage.request.post(`${BASE_URL}/api/activities/${activityId}/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    })

    if (!registerRes.ok()) {
      const registerBody = await registerRes.text()
      const alreadyRegistered =
        registerRes.status() === 400 && /đã đăng ký hoạt động này rồi|da dang ky hoat dong nay roi/i.test(registerBody)

      let canOverrideConflict = false
      try {
        const parsed = JSON.parse(registerBody)
        canOverrideConflict = Boolean(parsed?.details?.can_override || parsed?.data?.can_override)
      } catch {
        canOverrideConflict = /can_override/i.test(registerBody)
      }

      if (!alreadyRegistered && registerRes.status() === 409 && canOverrideConflict) {
        registerRes = await studentPage.request.post(`${BASE_URL}/api/activities/${activityId}/register`, {
          headers: { 'Content-Type': 'application/json' },
          data: { force_register: true },
        })
      }

      if (!registerRes.ok()) {
        const retryBody = await registerRes.text()
        throw new Error(`Student register failed: ${registerRes.status()} ${retryBody}`)
      }
    }

    const activityRes = await studentPage.request.get(`${BASE_URL}/api/activities/${activityId}`)
    expect(activityRes.ok()).toBeTruthy()
    const activityData = await activityRes.json()
    const activity = activityData?.data?.activity ?? activityData?.activity
    expect(activity?.is_registered).toBeTruthy()
    expect(activity?.registration_status).toBe('registered')

    await studentContext.close()
  })
})
